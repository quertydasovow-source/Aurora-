import { useMemo, useState, type ReactNode } from 'react';
import type { RecItem, RecsResponse } from '../api/recommendationsClient';
import { countryPreferenceLabels, fieldLabels, languagePreferenceLabels, suitabilityLabels } from '../data/labels';
import { parseCatalogLink } from '../lib/recommendations/links';
import { buildPlanForProgram } from '../lib/recommendations/planFromProgram';
import type { DevelopmentAction, PlanTask, Profile, SuitabilityStatus } from '../types';
import { DemoBanner } from './Shell';
import { StrengthenProfile } from './StrengthenProfile';

export type JourneyTab = 'summary' | 'recs' | 'compare' | 'plan';

const statusMark: Record<SuitabilityStatus, string> = {
  suitable: '●',
  preparation_needed: '◐',
  clarification_needed: '○',
  not_suitable: '✕',
};

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
  const allItems = [...confirmed, ...preview];
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
        />
      ) : null}

      {tab === 'recs' && recs ? (
        <ProgramsTab
          profile={profile}
          confirmed={confirmed}
          preview={preview}
          selectedIds={selectedIds}
          targetId={targetId}
          onToggleSelect={onToggleSelect}
          onTarget={onTarget}
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

function Overview({
  profile,
  recs,
  confirmed,
  preview,
  addedIds,
  onAddAction,
}: {
  profile: Profile;
  recs: RecsResponse;
  confirmed: RecItem[];
  preview: RecItem[];
  addedIds: Set<string>;
  onAddAction: (action: DevelopmentAction) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-ink">{recs.profileSummary}</p>
        <p className="mt-3 text-sm text-muted">
          Подтверждённых вариантов для выбранного года: {countPhrase(confirmed.length)}
          {preview.length ? `. Ещё ${countPhrase(preview.length)} — для предварительного изучения.` : '.'} Мы не добавляем
          вымышленные программы.
        </p>
        {confirmed.length === 0 && preview.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            По направлению «{fieldLabels[profile.field]}» сейчас нет записей, которые можно показать. Измени страну,
            год, направление или бюджет.
          </p>
        ) : null}
      </Card>
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">На что можно опереться</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
            {(recs.strengths.length ? recs.strengths : ['Пока опираемся на выбранное направление и ответы анкеты.']).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">Что предстоит подготовить</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
            {(recs.constraints.length
              ? recs.constraints
              : confirmed.flatMap((item) => item.requirementsToComplete).slice(0, 6)
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">Что нужно уточнить</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
            {(recs.missingInformation.length
              ? recs.missingInformation
              : confirmed.flatMap((item) => item.questionsToClarify).slice(0, 6)
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <StrengthenProfile actions={recs.developmentActions ?? []} addedIds={addedIds} onAdd={onAddAction} />
    </div>
  );
}

function ProgramsTab({
  profile,
  confirmed,
  preview,
  selectedIds,
  targetId,
  onToggleSelect,
  onTarget,
}: {
  profile: Profile;
  confirmed: RecItem[];
  preview: RecItem[];
  selectedIds: string[];
  targetId: string | null;
  onToggleSelect: (id: string) => void;
  onTarget: (id: string) => void;
}) {
  const [limitsOpen, setLimitsOpen] = useState(false);
  return (
    <div className="space-y-4">
      <DemoBanner onOpen={() => setLimitsOpen(true)} />
      {limitsOpen ? (
        <p className="text-sm text-muted">
          Каталог — единственный источник фактов. Если в записи нет порога, срока или стоимости, это не считается ни
          соответствием, ни отказом. Существенные ограничения конкретной программы остаются на её карточке.
        </p>
      ) : null}
      {confirmed.length === 0 && preview.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink">По твоим ответам ничего не подошло</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            По направлению «{fieldLabels[profile.field]}» и выбранной стране в каталоге нет программ, которые можно
            показать. Мы не добавляем вымышленные варианты.
          </p>
        </Card>
      ) : null}
      {confirmed.length > 0 && confirmed.length < 3 ? (
        <p className="text-sm text-muted">Сейчас для рассмотрения {countPhrase(confirmed.length)}. Мы не дополняем список ради числа.</p>
      ) : null}
      {confirmed.map((item) => (
        <ProgramCard
          key={item.programId}
          item={item}
          checked={selectedIds.includes(String(item.programId))}
          isTarget={targetId === String(item.programId)}
          onToggleSelect={() => onToggleSelect(String(item.programId))}
          onTarget={() => onTarget(String(item.programId))}
        />
      ))}
      {preview.length ? (
        <Card>
          <h2 className="text-lg font-semibold text-ink">Для предварительного изучения</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            У этих записей не подтверждены условия выбранного года, срок уже прошёл или набор не открыт. Их нельзя считать
            готовыми вариантами для подачи сейчас.
          </p>
        </Card>
      ) : null}
      {preview.map((item) => (
        <ProgramCard
          key={`preview-${item.programId}`}
          item={item}
          checked={selectedIds.includes(String(item.programId))}
          isTarget={targetId === String(item.programId)}
          onToggleSelect={() => onToggleSelect(String(item.programId))}
          onTarget={() => onTarget(String(item.programId))}
        />
      ))}
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

  return (
    <article className="rounded-[16px] border border-line bg-card p-5">
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
        <span className="status-badge">
          <span aria-hidden="true">{statusMark[item.suitability ?? 'clarification_needed'] || '○'}</span>
          {item.eligibility === 'preview'
            ? 'Предварительно'
            : suitabilityLabels[item.suitability] || suitabilityLabels.clarification_needed}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted">Почему такой статус: {item.statusWhy || 'Не хватает подтверждённых сведений.'}</p>
      {item.eligibility === 'preview' ? (
        <p className="mt-3 text-sm text-warn">{item.yearNote || item.deadlineNote}</p>
      ) : null}
      <p className="mt-3 text-sm text-ink">Стоимость: {item.tuitionNote}</p>
      <p className="mt-1 text-sm text-muted">{item.deadlineNote}</p>
      <div className="mt-4">
        <p className="text-sm font-semibold text-ink">Почему подходит</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {item.whyItFits.slice(0, 4).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <details className="mt-4" open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-sm font-semibold text-ink">Требования и источники</summary>
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
          className={`rounded-[10px] px-4 py-2 text-sm ${checked ? 'bg-accent text-on-accent' : 'border border-line'}`}
          onClick={onToggleSelect}
          aria-pressed={checked}
        >
          {checked ? 'В сравнении · убрать' : 'Добавить к сравнению'}
        </button>
        <button
          type="button"
          className={`rounded-[10px] px-4 py-2 text-sm ${isTarget ? 'border border-accent text-ink' : 'border border-line'}`}
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
    ['Язык', (item) => item.program?.language || ''],
    ['Год набора в каталоге', (item) => String(item.program?.admissionYear ?? 'не указан')],
    ['Срок', (item) => item.deadlineNote],
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
            <ul className="space-y-3">
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
    <li className={`list-none rounded-[16px] border border-line p-4 ${highlight ? 'next-step-card' : 'bg-card'}`}>
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
