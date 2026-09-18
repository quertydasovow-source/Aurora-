import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { requestProfileAdvice, type RecItem, type RecsResponse } from '../api/recommendationsClient';
import { countryPreferenceLabels, fieldLabels, fitStatusLabels, languagePreferenceLabels, suitabilityLabels } from '../data/labels';
import { parseCatalogLink } from '../lib/recommendations/links';
import { adviceFingerprint, fallbackProfileAdvice, hasEnglishEvidence } from '../lib/recommendations/profileAdvice';
import { buildPlanForProgram } from '../lib/recommendations/planFromProgram';
import type { DevelopmentAction, PlanTask, Profile } from '../types';
import { DemoBanner } from './Shell';
import { ProfileAdviceSection } from './ProfileAdviceSection';
import { StrengthenProfile } from './StrengthenProfile';

export type JourneyTab = 'summary' | 'recs' | 'compare' | 'plan';

type Props = {
  profile: Profile;
  selectedIds: string[];
  targetId: string | null;
  taskDone: Record<string, boolean>;
  extraPlanTasks: PlanTask[];
  loading: boolean;
  tab: JourneyTab;
  onTab: (tab: JourneyTab) => void;
  onToggleSelect: (id: string) => void;
  onTarget: (id: string) => void;
  onToggleTask: (id: string) => void;
  onAddAction: (action: DevelopmentAction) => void;
  onRemoveExtra: (id: string) => void;
  onEdit: () => void;
  onRebuild: () => void;
  recs: RecsResponse | null;
  recsLoading: boolean;
  recsError: string | null;
  onRetryRecs: () => void;
};

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[16px] border border-line bg-card p-5 ${className}`}>{children}</section>;
}

function FitMark({ kind }: { kind: 'ok' | 'gap' | 'unknown' }) {
  const color = kind === 'ok' ? 'text-accent' : kind === 'gap' ? 'text-warn' : 'text-muted';
  return (
    <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center ${color}`} aria-hidden="true">
      {kind === 'ok' ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 8.2 6.4 11l6.1-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : kind === 'gap' ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3.2v6.2M8 12.4h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 6.2v.2M8 8v2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function countPhrase(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} программу`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} программы`;
  return `${n} программ`;
}

function CatalogRef({ value, label }: { value: string; label: string }) {
  const link = parseCatalogLink(value);
  if (link.kind === 'empty') return null;
  if (link.kind === 'note') {
    return (
      <p className="text-sm text-muted">
        {label}: {link.text}
      </p>
    );
  }
  return (
    <a className="mr-3 text-sm text-accent underline" href={link.href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export function Journey(props: Props) {
  const {
    profile,
    selectedIds,
    targetId,
    taskDone,
    extraPlanTasks,
    loading,
    tab,
    onTab,
    onToggleSelect,
    onTarget,
    onToggleTask,
    onAddAction,
    onRemoveExtra,
    onEdit,
    onRebuild,
    recs,
    recsLoading,
    recsError,
  } = props;

  const confirmed = recs?.recommendations ?? [];
  const preview = recs?.preview ?? [];
  const related = recs?.related ?? [];
  const allItems = [...confirmed, ...preview, ...related];
  const [advice, setAdvice] = useState<DevelopmentAction[]>([]);
  const [adviceIntro, setAdviceIntro] = useState('');
  const [adviceFallback, setAdviceFallback] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceCooldownUntil, setAdviceCooldownUntil] = useState(0);
  const adviceKeyRef = useRef<string | null>(null);
  const adviceAbortRef = useRef<AbortController | null>(null);

  function applyAdvice(list: DevelopmentAction[], intro: string, fallback: boolean, key: string) {
    adviceKeyRef.current = key;
    setAdvice(list);
    setAdviceIntro(intro);
    setAdviceFallback(fallback);
    setAdviceLoading(false);
  }

  function loadAdvice(force = false) {
    if (!recs) return;
    const key = adviceFingerprint(profile);
    const cacheKey = `aurora-profile-advice-v2:${key}`;
    if (!force && adviceKeyRef.current === key && advice.length) return;
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { intro?: string; suggestions?: DevelopmentAction[]; mode?: string };
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length) {
            applyAdvice(parsed.suggestions, parsed.intro || '', parsed.mode === 'rules', key);
            return;
          }
        }
      } catch {
        /* ignore cache */
      }
    } else {
      try {
        sessionStorage.removeItem(cacheKey);
      } catch {
        /* ignore */
      }
    }
    adviceAbortRef.current?.abort();
    const controller = new AbortController();
    adviceAbortRef.current = controller;
    adviceKeyRef.current = key;
    setAdviceLoading(true);
    void requestProfileAdvice(
      profile,
      [...confirmed, ...preview].slice(0, 4),
      {
        strengths: recs.strengths,
        gaps: recs.constraints.length ? recs.constraints : confirmed.flatMap((item) => item.requirementsToComplete).slice(0, 8),
        thingsToClarify: recs.missingInformation,
      },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        const list = data.suggestions || [];
        if (!list.length) {
          const fb = fallbackProfileAdvice(profile);
          applyAdvice(fb.suggestions, fb.intro, true, key);
          return;
        }
        const intro = data.intro || data.summary || '';
        const fallback = data.mode !== 'ai';
        applyAdvice(list, intro, fallback, key);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ intro, suggestions: list, mode: data.mode }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const fb = fallbackProfileAdvice(profile);
        applyAdvice(fb.suggestions, fb.intro, true, key);
      });
  }

  useEffect(() => {
    loadAdvice(false);
    return () => adviceAbortRef.current?.abort();
  }, [profile, recs]);

  useEffect(() => {
    if (!adviceCooldownUntil) return;
    const wait = Math.max(0, adviceCooldownUntil - Date.now());
    const timer = window.setTimeout(() => setAdviceCooldownUntil(0), wait);
    return () => window.clearTimeout(timer);
  }, [adviceCooldownUntil]);
  const selected = allItems.filter((item) => selectedIds.includes(String(item.programId)));
  const target = allItems.find((item) => String(item.programId) === targetId) ?? confirmed[0] ?? preview[0] ?? null;
  const tasks = useMemo(() => {
    if (!target?.program) return extraPlanTasks;
    const built = buildPlanForProgram(
      profile,
      {
        program: target.program,
        requirementsToComplete: target.requirementsToComplete,
        deadlineNote: target.deadlineNote,
      },
      target.preparationAdvice,
    );
    const seen = new Set(built.map((task) => task.id));
    return [...built, ...extraPlanTasks.filter((task) => !seen.has(task.id))];
  }, [profile, target, extraPlanTasks]);
  const nextTask = tasks.find((task) => !taskDone[task.id]) ?? tasks[0] ?? null;
  const doneCount = tasks.filter((task) => taskDone[task.id]).length;
  const addedActionIds = new Set(extraPlanTasks.map((task) => task.id.replace(/^extra-/, '')));

  return (
    <div className="page-enter space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Твой маршрут поступления</h1>
          <p className="mt-2 text-sm text-muted">
            {fieldLabels[profile.field]} · {countryPreferenceLabels[profile.countryPreference]} · набор {profile.intakeYear} ·{' '}
            {profile.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ в год · {languagePreferenceLabels[profile.languagePreference]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={onEdit}>
            Изменить ответы
          </button>
          <button type="button" className="btn-secondary px-4 py-2 text-sm disabled:opacity-50" onClick={onRebuild} disabled={loading}>
            Обновить маршрут
          </button>
        </div>
      </div>

      {recs?.mode === 'rules' && recs.message ? (
        <p className="rounded-[16px] border border-line bg-section px-4 py-3 text-sm text-muted">{recs.message}</p>
      ) : null}

      {tab === 'summary' && recs ? (
        <article className="next-step-card rounded-[16px] border border-line p-5">
          <p className="text-xs font-medium tracking-wide text-muted">Следующий шаг</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{recs.nextAction.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{recs.nextAction.description}</p>
          <button type="button" className="btn-primary mt-4 px-4 py-2 text-sm" onClick={() => onTab('plan')}>
            Открыть задачу в плане
          </button>
        </article>
      ) : null}

      <nav className="tabs-line" aria-label="Разделы маршрута">
        {(
          [
            ['summary', 'Обзор'],
            ['recs', 'Программы'],
            ['compare', 'Сравнение'],
            ['plan', 'Мой план'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="tab-btn"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onTab(id)}
          >
            {label}
            {id === 'compare' && selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
          </button>
        ))}
      </nav>

      {selectedIds.length > 0 && tab !== 'compare' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-line bg-section px-4 py-3 text-sm">
          <p>Выбрано для сравнения: {selectedIds.length}</p>
          <button
            type="button"
            className="btn-primary px-4 py-2 disabled:opacity-50"
            disabled={selectedIds.length < 2}
            onClick={() => onTab('compare')}
          >
            Сравнить
          </button>
        </div>
      ) : null}

      {(loading || recsLoading) && !recs ? (
        <Card>
          <p className="text-sm text-muted">Собираем маршрут по твоим ответам…</p>
        </Card>
      ) : null}

      {recsError && !recs ? (
        <Card className="border-danger/40 bg-danger-soft">
          <h2 className="text-lg font-semibold text-ink">Не получилось загрузить подбор</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{recsError}</p>
          <button type="button" className="btn-primary mt-3 px-4 py-2 text-sm" onClick={props.onRetryRecs}>
            Повторить запрос
          </button>
        </Card>
      ) : null}

      {tab === 'summary' && recs ? (
        <Overview
          profile={profile}
          recs={recs}
          confirmed={confirmed}
          preview={preview}
          addedIds={addedActionIds}
          onAddAction={onAddAction}
          advice={advice}
          adviceIntro={adviceIntro}
          adviceFallback={adviceFallback}
          adviceLoading={adviceLoading}
          adviceRefreshing={adviceLoading || Date.now() < adviceCooldownUntil}
          onRefreshAdvice={() => {
            setAdviceCooldownUntil(Date.now() + 15000);
            loadAdvice(true);
          }}
        />
      ) : null}

      {tab === 'recs' && recs ? (
        <ProgramsTab
          profile={profile}
          confirmed={confirmed}
          preview={preview}
          related={related}
          selectedIds={selectedIds}
          targetId={targetId}
          onToggleSelect={onToggleSelect}
          onTarget={onTarget}
          onEdit={onEdit}
        />
      ) : null}

      {tab === 'compare' && (
        <Compare selected={selected} onClear={(id) => onToggleSelect(id)} onTarget={onTarget} targetId={targetId} onPick={() => onTab('recs')} />
      )}

      {tab === 'plan' && (
        <PlanTab
          tasks={tasks}
          taskDone={taskDone}
          doneCount={doneCount}
          nextId={nextTask?.id ?? null}
          onToggleTask={onToggleTask}
          onRemoveExtra={onRemoveExtra}
          hasTarget={Boolean(target)}
          actions={recs?.developmentActions ?? []}
          addedIds={addedActionIds}
          onAddAction={onAddAction}
        />
      )}
    </div>
  );
}

function profileChips(profile: Profile): string[] {
  const chips = [
    `${profile.classYear} класс`,
    String(profile.intakeYear),
    fieldLabels[profile.field],
    countryPreferenceLabels[profile.countryPreference],
    `${profile.tuitionBudgetKzt.toLocaleString('ru-RU')} ₸ / год`,
    profile.needsFinancialAid ? 'нужна финансовая помощь' : 'без финансовой помощи',
  ];
  if (profile.satStatus === 'taken' && profile.satTotal != null) chips.push(`SAT ${profile.satTotal}`);
  if (profile.ieltsStatus === 'taken' && profile.ieltsScore != null) chips.push(`IELTS ${profile.ieltsScore}`);
  if (profile.toeflStatus === 'taken' && profile.toeflScore != null) chips.push(`TOEFL ${profile.toeflScore}`);
  return chips;
}

function Overview({
  profile,
  recs,
  confirmed,
  preview,
  addedIds,
  onAddAction,
  advice,
  adviceIntro,
  adviceFallback,
  adviceLoading,
  adviceRefreshing,
  onRefreshAdvice,
}: {
  profile: Profile;
  recs: RecsResponse;
  confirmed: RecItem[];
  preview: RecItem[];
  addedIds: Set<string>;
  onAddAction: (action: DevelopmentAction) => void;
  advice: DevelopmentAction[];
  adviceIntro: string;
  adviceFallback: boolean;
  adviceLoading: boolean;
  adviceRefreshing: boolean;
  onRefreshAdvice: () => void;
}) {
  const englishKnown = hasEnglishEvidence(profile);
  const dropFalseEnglish = (text: string) =>
    englishKnown && /не подтвержд\w*.*английск|нет (результата|балла).*(ielts|toefl)|нужно подтвердить английск|не подтверждён уровень английского/i.test(text);
  const strengths = (recs.strengths.length ? recs.strengths : ['Выбранное направление и ответы анкеты.']).filter((item) => !dropFalseEnglish(item));
  const missing = (recs.missingInformation.length
    ? recs.missingInformation
    : confirmed.flatMap((item) => item.questionsToClarify)
  ).filter((item) => !dropFalseEnglish(item));
  const summary = recs.mode === 'ai' && recs.profileSummary && !dropFalseEnglish(recs.profileSummary) ? recs.profileSummary : null;
  const gapActions = (recs.developmentActions ?? []).filter((item) => item.category === 'requirement');

  return (
    <div className="space-y-6">
      <Card className="raised-card">
        <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">Диагностика</p>
        <h2 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-ink">Твой профиль готов</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {profileChips(profile).map((chip) => (
            <span key={chip} className="status-badge">
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          Нашли {countPhrase(confirmed.length)} для выбранного года
          {preview.length ? ` и ещё ${countPhrase(preview.length)} с уточняющимися условиями` : ''}. Вымышленные программы
          не добавляем.
        </p>
        {summary ? (
          <p className="mt-3 text-sm leading-6 text-muted">{summary}</p>
        ) : null}
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-2 border-l-accent">
          <h2 className="text-base font-semibold text-ink">Сильные стороны</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {(strengths.length ? strengths : ['Выбранное направление и ответы анкеты.']).slice(0, 4).map((item) => (
              <li key={item} className="flex gap-2">
                <FitMark kind="ok" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-l-2 border-l-warn">
          <h2 className="text-base font-semibold text-ink">Подготовить</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {(recs.constraints.length
              ? recs.constraints
              : confirmed.flatMap((item) => item.requirementsToComplete).slice(0, 4)
            )
              .slice(0, 4)
              .map((item) => (
                <li key={item} className="flex gap-2">
                  <FitMark kind="gap" />
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-ink">Уточнить</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {(missing.length ? missing : ['Пока нет пунктов, которые нужно уточнить.']).slice(0, 4).map((item) => (
                <li key={item} className="flex gap-2">
                  <FitMark kind="unknown" />
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </Card>
      </div>
      <ProfileAdviceSection
        intro={adviceIntro}
        actions={advice}
        addedIds={addedIds}
        loading={adviceLoading}
        fallback={adviceFallback}
        onAdd={onAddAction}
        onRefresh={onRefreshAdvice}
        refreshDisabled={adviceRefreshing}
      />
      {gapActions.length ? (
        <StrengthenProfile actions={gapActions} addedIds={addedIds} onAdd={onAddAction} />
      ) : null}
    </div>
  );
}

function ProgramsTab({
  profile,
  confirmed,
  preview,
  related,
  selectedIds,
  targetId,
  onToggleSelect,
  onTarget,
  onEdit,
}: {
  profile: Profile;
  confirmed: RecItem[];
  preview: RecItem[];
  related: RecItem[];
  selectedIds: string[];
  targetId: string | null;
  onToggleSelect: (id: string) => void;
  onTarget: (id: string) => void;
  onEdit: () => void;
}) {
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(confirmed.length > 0);
  const [showRelated, setShowRelated] = useState(false);

  function renderCard(item: RecItem, key: string) {
    return (
      <ProgramCard
        key={key}
        item={item}
        checked={selectedIds.includes(String(item.programId))}
        isTarget={targetId === String(item.programId)}
        onToggleSelect={() => onToggleSelect(String(item.programId))}
        onTarget={() => onTarget(String(item.programId))}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DemoBanner onOpen={() => setLimitsOpen(true)} />
      {limitsOpen ? (
        <p className="text-sm text-muted">
          Каталог — единственный источник фактов. Если в записи нет порога, срока или стоимости, это не считается ни
          соответствием, ни отказом.
        </p>
      ) : null}
      {confirmed.length === 0 ? (
        <Card className="mx-auto max-w-xl px-6 py-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-section text-accent" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M20 20 16.5 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <h2 className="text-xl font-semibold text-ink">Пока не нашли подтверждённые варианты</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            В текущем каталоге нет достаточного количества подтверждённых программ набора {profile.intakeYear} по
            направлению «{fieldLabels[profile.field]}». Нерелевантные вузы не подставляем.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={onEdit}>
              Изменить параметры
            </button>
            {preview.length ? (
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setShowPreview(true)}>
                Показать программы с уточняющимися условиями
              </button>
            ) : null}
            {related.length ? (
              <button type="button" className="btn-tertiary px-4 py-2 text-sm" onClick={() => setShowRelated(true)}>
                Показать смежные направления
              </button>
            ) : null}
          </div>
        </Card>
      ) : null}
      {confirmed.length > 0 && confirmed.length < 3 ? (
        <p className="text-sm text-muted">Сейчас для рассмотрения {countPhrase(confirmed.length)}. Список не дополняем ради числа.</p>
      ) : null}
      {confirmed.map((item) => renderCard(item, String(item.programId)))}
      {showPreview && preview.length ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-ink">Условия выбранного года ещё уточняются</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Архив, другой год набора или неполный статус записи. Это ориентир, не готовый вариант подачи.
            </p>
          </Card>
          {preview.map((item) => renderCard(item, `preview-${item.programId}`))}
        </>
      ) : null}
      {showRelated && related.length ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-ink">Смежные направления</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Показаны только близкие категории, не случайные вузы.</p>
          </Card>
          {related.map((item) => renderCard(item, `related-${item.programId}`))}
        </>
      ) : null}
    </div>
  );
}

function ProgramCard({
  item,
  checked,
  isTarget,
  onToggleSelect,
  onTarget,
}: {
  item: RecItem;
  checked: boolean;
  isTarget: boolean;
  onToggleSelect: () => void;
  onTarget: () => void;
}) {
  const [open, setOpen] = useState(false);
  const program = item.program;
  if (!program) return null;
  const fitKey = item.matchStatus && item.matchStatus !== 'not_match' ? item.matchStatus : item.suitability;
  const fitLabel =
    item.budgetStatus === 'over_budget'
      ? 'Выше бюджета'
      : item.budgetStatus === 'potentially_affordable_with_aid'
        ? 'Нужно финансирование'
        : fitStatusLabels[fitKey] || suitabilityLabels[item.suitability] || 'Можно рассматривать';
  const dataLabel =
    item.dataStatus === 'latest_known_conditions'
      ? 'Условия выбранного года ещё не опубликованы'
      : item.dataStatus === 'archived'
        ? 'Архивные данные'
        : item.dataStatus === 'missing_details'
          ? 'Требование нужно уточнить'
          : null;
  const fitTone =
    item.budgetStatus === 'over_budget' || item.budgetStatus === 'potentially_affordable_with_aid'
      ? 'is-budget'
      : item.matchStatus === 'strong_match' || item.suitability === 'suitable'
        ? 'is-match'
        : item.dataStatus === 'archived'
          ? 'is-archive'
          : 'is-clarify';

  return (
    <article className={`raised-card p-5 ${checked || isTarget ? 'is-selected' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {program.university} · {program.city}, {program.country}
          </p>
          <h2 className="text-xl font-semibold text-ink">{program.program}</h2>
          <p className="mt-1 text-sm text-muted">
            {program.language} · {program.field} · набор {program.admissionYear ?? 'год не указан'}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className={`status-badge ${fitTone}`}>
            {fitLabel}
          </span>
          {dataLabel ? <span className={`status-badge ${item.dataStatus === 'archived' ? 'is-archive' : 'is-clarify'}`}>{dataLabel}</span> : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">Почему такой статус: {item.statusWhy || 'Не хватает подтверждённых сведений.'}</p>
      {item.dataStatus === 'latest_known_conditions' && item.yearNote ? (
        <p className="mt-3 text-sm text-muted">{item.yearNote}</p>
      ) : item.eligibility === 'preview' && item.dataStatus !== 'latest_known_conditions' ? (
        <p className="mt-3 text-sm text-muted">{item.yearNote || item.deadlineNote}</p>
      ) : null}
      <p className="mt-3 text-sm text-ink">Стоимость: {item.tuitionNote}</p>
      <p className="mt-1 text-sm text-muted">{item.deadlineNote}</p>
      <div className="mt-4">
        <p className="text-sm font-semibold text-ink">Почему подходит</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {item.whyItFits.slice(0, 4).map((reason) => (
            <li key={reason} className="flex gap-2">
              <FitMark kind="ok" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
      <details className="mt-4" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-sm font-semibold text-ink" aria-expanded={open}>
          Требования и источники
        </summary>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-ink">Что нужно подготовить</p>
            <p className="mt-1 text-muted">
              {item.requirementsToComplete.length ? item.requirementsToComplete.join(' ') : 'Явных пробелов по известным полям нет.'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">Что нужно уточнить</p>
            <p className="mt-1 text-muted">
              {item.questionsToClarify.length ? item.questionsToClarify.join(' ') : 'Недостающих сведений по этой карточке нет.'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">Источники каталога</p>
            <div className="mt-1">
              <CatalogRef value={program.programUrl} label="Страница программы" />
              <CatalogRef value={program.requirementsUrl} label="Требования" />
              <CatalogRef value={program.tuitionUrl} label="Стоимость" />
            </div>
            <p className="mt-2 text-xs text-muted">
              Дата записи в каталоге: {program.verifiedAt}. Это дата записи, а не проверка страницы приложением.
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">Советы Aurora</p>
            <p className="mt-1 text-muted">
              {item.preparationAdvice.length ? item.preparationAdvice.join(' ') : 'Дополнительных советов пока нет.'}
            </p>
          </div>
        </div>
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-4 py-2 text-sm"
          onClick={onToggleSelect}
          aria-pressed={checked}
        >
          {checked ? 'В сравнении · убрать' : 'Добавить к сравнению'}
        </button>
        <button
          type="button"
          className={isTarget ? 'btn-primary px-4 py-2 text-sm' : 'btn-secondary px-4 py-2 text-sm'}
          onClick={onTarget}
          aria-pressed={isTarget}
        >
          {isTarget ? 'Выбрано для плана' : 'Выбрать для плана'}
        </button>
      </div>
    </article>
  );
}

function Compare({
  selected,
  onClear,
  onTarget,
  targetId,
  onPick,
}: {
  selected: RecItem[];
  onClear: (id: string) => void;
  onTarget: (id: string) => void;
  targetId: string | null;
  onPick: () => void;
}) {
  if (selected.length < 2) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink">Какие программы сравним?</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Добавь минимум два варианта, чтобы увидеть различия.</p>
        <button type="button" className="btn-primary mt-4 px-4 py-2 text-sm" onClick={onPick}>
          Выбрать программы
        </button>
      </Card>
    );
  }

  const rows: Array<[string, (item: RecItem) => string]> = [
    ['Университет и город', (item) => `${item.program?.university}, ${item.program?.city}`],
    ['Страна', (item) => item.program?.country || ''],
    ['Стоимость', (item) => item.tuitionNote],
    ['Бюджет', (item) =>
      item.budgetStatus === 'within_budget'
        ? 'соответствует бюджету'
        : item.budgetStatus === 'over_budget'
          ? 'выше указанного бюджета'
          : item.budgetStatus === 'potentially_affordable_with_aid'
            ? 'потребуется финансирование'
            : 'стоимость нужно уточнить',
    ],
    ['Направление', (item) => item.program?.field || ''],
    ['Язык', (item) => item.program?.language || ''],
    ['Год набора в каталоге', (item) => String(item.program?.admissionYear ?? 'не указан')],
    ['Срок', (item) => item.deadlineNote],
    ['Экзамены', (item) => item.requirementsToComplete.filter((row) => /ент|sat|ielts|toefl|язык/i.test(row)).join(' ') || 'по известным полям без явного пробела'],
    ['Стипендии', (item) => item.program?.financialAid || 'в каталоге не подтверждено'],
    ['Статус данных', (item) =>
      item.dataStatus === 'archived'
        ? 'архивные данные'
        : item.dataStatus === 'latest_known_conditions'
          ? 'условия выбранного года ещё не опубликованы'
          : item.dataStatus === 'confirmed_for_selected_year'
            ? 'соответствует выбранному году'
            : 'требует уточнения данных',
    ],
    ['Что подготовить', (item) => item.requirementsToComplete.join(' ') || 'Явных пробелов нет'],
  ];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">Сравнение выбранных программ</h2>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card p-2 text-left">Параметр</th>
              {selected.map((item) => (
                <th key={item.programId} className="p-2 text-left font-semibold">
                  {item.program?.program}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, getter]) => (
              <tr key={label} className="border-t border-line align-top">
                <th className="sticky left-0 bg-card p-2 text-left font-medium">{label}</th>
                {selected.map((item) => (
                  <td key={item.programId} className="p-2 text-muted">
                    {getter(item)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th className="sticky left-0 bg-card p-2 text-left font-medium">Действия</th>
              {selected.map((item) => (
                <td key={item.programId} className="p-2">
                  <button type="button" className="mr-2 text-sm text-accent underline" onClick={() => onClear(String(item.programId))}>
                    Убрать
                  </button>
                  <button type="button" className="text-sm text-accent underline" onClick={() => onTarget(String(item.programId))}>
                    {targetId === String(item.programId) ? 'В плане' : 'В план'}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-4 md:hidden">
        {selected.map((item) => (
          <article key={item.programId} className="raised-card p-4">
            <h3 className="font-semibold text-ink">{item.program?.program}</h3>
            <p className="mt-1 text-sm text-muted">{item.program?.university}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Стоимость</dt>
                <dd>{item.tuitionNote}</dd>
              </div>
              <div>
                <dt className="text-muted">Срок</dt>
                <dd>{item.deadlineNote}</dd>
              </div>
              <div>
                <dt className="text-muted">Направление</dt>
                <dd>{item.program?.field}</dd>
              </div>
              <div>
                <dt className="text-muted">Язык</dt>
                <dd>{item.program?.language}</dd>
              </div>
            </dl>
            <div className="mt-3 flex gap-3">
              <button type="button" className="text-sm text-accent underline" onClick={() => onClear(String(item.programId))}>
                Убрать
              </button>
              <button type="button" className="text-sm text-accent underline" onClick={() => onTarget(String(item.programId))}>
                {targetId === String(item.programId) ? 'В плане' : 'В план'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

function PlanTab({
  tasks,
  taskDone,
  doneCount,
  nextId,
  onToggleTask,
  onRemoveExtra,
  hasTarget,
  actions,
  addedIds,
  onAddAction,
}: {
  tasks: PlanTask[];
  taskDone: Record<string, boolean>;
  doneCount: number;
  nextId: string | null;
  onToggleTask: (id: string) => void;
  onRemoveExtra: (id: string) => void;
  hasTarget: boolean;
  actions: DevelopmentAction[];
  addedIds: Set<string>;
  onAddAction: (action: DevelopmentAction) => void;
}) {
  if (!hasTarget) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-ink">Сначала выбери программу для плана</h2>
        <p className="mt-2 text-sm text-muted">План строится только по одной программе, без смешения требований разных вузов.</p>
      </Card>
    );
  }

  const groups: Array<{ title: string; items: PlanTask[] }> = [
    { title: 'Требование программы', items: tasks.filter((task) => task.basis === 'requirement' && task.id !== nextId) },
    { title: 'Совет Aurora', items: tasks.filter((task) => task.basis === 'advice' && task.id !== nextId) },
  ];
  const nextTask = tasks.find((task) => task.id === nextId) ?? null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">Прогресс плана</span>
        <span className="ml-1" title="Это выполнение задач плана, а не вероятность поступления.">
          {' '}
          · Выполнено {doneCount} из {tasks.length} задач
        </span>
      </p>
      {nextTask ? (
        <TaskRow
          task={nextTask}
          done={Boolean(taskDone[nextTask.id])}
          highlight
          onToggle={() => onToggleTask(nextTask.id)}
          onRemove={nextTask.removable ? () => onRemoveExtra(nextTask.id) : undefined}
        />
      ) : null}
      {groups.map((group) =>
        group.items.length ? (
          <section key={group.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">{group.title}</h2>
            <ul className="timeline space-y-3">
              {group.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  done={Boolean(taskDone[task.id])}
                  highlight={false}
                  onToggle={() => onToggleTask(task.id)}
                  onRemove={task.removable ? () => onRemoveExtra(task.id) : undefined}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}
      <StrengthenProfile actions={actions} addedIds={addedIds} onAdd={onAddAction} />
    </div>
  );
}

function TaskRow({
  task,
  done,
  highlight,
  onToggle,
  onRemove,
}: {
  task: PlanTask;
  done: boolean;
  highlight: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  const labels: Record<PlanTask['category'], string> = {
    exam: 'Экзамен',
    documents: 'Документы',
    academic: 'Учёба',
    application: 'Подача',
    finance: 'Финансы',
  };
  return (
    <li className={`timeline-item relative list-none ${highlight ? 'next-step-card' : 'raised-card'} rounded-[16px] p-4`}>
      <span className={`timeline-dot ${done ? 'is-done' : highlight ? 'is-current' : ''}`} aria-hidden="true" />
      <label className="flex cursor-pointer items-start gap-3">
        <input className="mt-1 h-5 w-5" type="checkbox" checked={done} onChange={onToggle} />
        <span className="min-w-0">
          {highlight ? <span className="text-xs font-medium tracking-wide text-muted">Следующий шаг</span> : null}
          <span className="mt-1 block text-xs text-muted">
            {labels[task.category]} · {task.basis === 'advice' ? 'Совет Aurora' : 'Требование программы'}
          </span>
          <span className={`block font-semibold ${done ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
          <span className="mt-1 block text-sm text-muted">{task.note}</span>
          {task.suggestedTiming ? (
            <span className="mt-2 block text-sm text-muted">
              {task.suggestedTiming} <span className="text-xs">Совет Aurora</span>
            </span>
          ) : null}
          <span className="mt-1 block text-xs text-muted">
            {task.officialDeadline
              ? `Официальный срок из каталога: ${task.officialDeadline}.`
              : 'Официальный дедлайн вуза в каталоге не указан.'}
          </span>
          {onRemove ? (
            <button
              type="button"
              className="mt-2 text-sm text-muted underline"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
            >
              Удалить совет
            </button>
          ) : null}
        </span>
      </label>
    </li>
  );
}
