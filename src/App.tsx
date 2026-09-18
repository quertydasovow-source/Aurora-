import { useEffect, useRef, useState } from 'react';
import { requestRecommendations, type RecsResponse } from './api/recommendationsClient';
import { Landing } from './components/Landing';
import { Journey } from './components/Journey';
import { Quiz } from './components/Quiz';
import { Shell } from './components/Shell';
import { describeMatchChange } from './logic/explain';
import { actionToPlanTask } from './lib/recommendations/developmentActions';
import { fingerprint } from './lib/recommendations/fingerprint';
import { defaultProfileDraft, emptyState, loadState, saveState } from './storage';
import type { DevelopmentAction, JourneyTab, Profile, StoredState } from './types';

type Tab = JourneyTab;

function recsKey(profile: Profile, targetId: string | null): string {
  return `${fingerprint(profile)}|${targetId || ''}`;
}

export default function App() {
  const [state, setState] = useState<StoredState>(() => loadState());
  const [draft, setDraft] = useState<Profile>(state.profile ?? defaultProfileDraft);
  const [tab, setTab] = useState<Tab>(state.journeyTab || 'summary');
  const [loading, setLoading] = useState(false);
  const [groqMode, setGroqMode] = useState('проверяем доступность AI-пояснений…');
  const [previousProfile, setPreviousProfile] = useState<Profile | null>(() => state.profile);
  const [recs, setRecs] = useState<RecsResponse | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fetchedKey = useRef<string | null>(null);
  const inflightKey = useRef<string | null>(null);
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function patch(partial: Partial<StoredState>) {
    setState((current) => {
      const next = { ...current, ...partial };
      saveState(next);
      stateRef.current = next;
      return next;
    });
  }

  function goHome() {
    patch({ view: 'landing' });
  }

  function restartConfirmed() {
    const ok = window.confirm('Начать заново? Ответы анкеты, рекомендации и план будут удалены. Это нельзя отменить.');
    if (!ok) return;
    abortRef.current?.abort();
    fetchedKey.current = null;
    inflightKey.current = null;
    setRecs(null);
    setRecsError(null);
    setToast(null);
    setPreviousProfile(null);
    setDraft(defaultProfileDraft);
    setTab('summary');
    const cleared = { ...emptyState };
    stateRef.current = cleared;
    saveState(cleared);
    setState(cleared);
  }

  async function loadRecommendations(
    profile: Profile,
    targetProgramId?: number | null,
    options?: { keepExisting?: boolean },
  ) {
    const key = recsKey(profile, targetProgramId != null ? String(targetProgramId) : null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++requestSeq.current;
    inflightKey.current = key;
    setRecsError(null);
    if (!options?.keepExisting) {
      setRecs(null);
      setLoading(true);
    }
    try {
      const data = await requestRecommendations(profile, targetProgramId, controller.signal);
      if (seq !== requestSeq.current) return null;
      setRecs(data);
      fetchedKey.current = key;
      return data;
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return null;
      if (seq !== requestSeq.current) return null;
      setRecsError(err instanceof Error ? err.message : 'Не удалось получить рекомендации.');
      return null;
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        inflightKey.current = null;
      }
    }
  }

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (state.changeNote) {
      setToast('Маршрут обновлён');
      patch({ changeNote: null });
    }
  }, [state.changeNote]);

  useEffect(() => {
    if (state.view !== 'journey' || !state.profile) return;
    const key = recsKey(state.profile, state.targetId);
    if (fetchedKey.current === key || inflightKey.current === key) return;
    const sameProfile = Boolean(fetchedKey.current?.startsWith(`${fingerprint(state.profile)}|`));
    void loadRecommendations(state.profile, state.targetId ? Number(state.targetId) : null, {
      keepExisting: sameProfile && Boolean(recs),
    });
  }, [state.view, state.lastFingerprint, state.profile, state.targetId]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setGroqMode(
          data.groqConfigured
            ? 'AI-пояснения на сервере включены'
            : 'AI-пояснения пока недоступны — показываем объяснения по правилам, подбор программ это не затрагивает',
        );
      })
      .catch(() => {
        setGroqMode('AI-пояснения пока недоступны — показываем объяснения по правилам, подбор программ это не затрагивает');
      });
  }, []);

  async function buildRoute(profile: Profile, priorProfile: Profile | null) {
    setLoading(true);
    setRecs(null);
    setRecsError(null);
    try {
      const data = await loadRecommendations(profile, state.targetId ? Number(state.targetId) : null);
      const ids = data ? [...data.recommendations, ...data.preview].map((item) => String(item.programId)) : [];
      const targetId = ids.includes(state.targetId || '')
        ? state.targetId
        : data?.nextAction.programId != null
          ? String(data.nextAction.programId)
          : ids[0] ?? null;
      const selectedIds = state.selectedIds.filter((id) => ids.includes(id));
      const nextTaskPrefix = targetId ? `p${targetId}-` : null;
      const taskDone = nextTaskPrefix
        ? Object.fromEntries(Object.entries(state.taskDone).filter(([id]) => id.startsWith(nextTaskPrefix) || id.startsWith('extra-')))
        : {};
      patch({
        profile,
        view: 'journey',
        targetId,
        selectedIds,
        taskDone,
        lastFingerprint: fingerprint(profile),
        journeyTab: 'summary',
        changeNote: priorProfile ? describeMatchChange(priorProfile, profile) : null,
        resetNotice: null,
      });
      setTab('summary');
      setPreviousProfile(profile);
    } catch (err) {
      setRecsError(err instanceof Error ? err.message : 'Не удалось получить рекомендации.');
      patch({
        profile,
        view: 'journey',
        lastFingerprint: fingerprint(profile),
        resetNotice: null,
      });
    } finally {
      setLoading(false);
    }
  }

  function addActionToPlan(action: DevelopmentAction) {
    const task = actionToPlanTask(action);
    if (state.extraPlanTasks.some((item) => item.id === task.id)) return;
    patch({ extraPlanTasks: [...state.extraPlanTasks, task] });
    setTab('plan');
  }

  const hasProfile = Boolean(state.profile);
  const hasRoute = Boolean(state.profile && state.lastFingerprint);

  return (
    <Shell onHome={goHome} showHome={state.view !== 'landing'} aurora={state.view === 'landing'}>
      {state.resetNotice ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[16px] border border-line bg-warn-soft px-4 py-3 text-sm text-warn">
          <p>{state.resetNotice}</p>
          <button type="button" className="btn-secondary shrink-0 px-3 py-1 text-xs" onClick={() => patch({ resetNotice: null })}>
            Понятно
          </button>
        </div>
      ) : null}

      {loading && !recs ? (
        <div className="mb-4 rounded-[16px] border border-line bg-card px-4 py-3 text-sm text-muted" role="status">
          Собираем маршрут по твоим ответам…
        </div>
      ) : null}

      {state.view === 'landing' && (
        <Landing
          groqMode={groqMode}
          hasProfile={hasProfile}
          hasRoute={hasRoute}
          onStart={() => {
            setDraft(state.profile ?? defaultProfileDraft);
            patch({ view: 'quiz', quizStep: 0 });
          }}
          onContinue={() => {
            setDraft(state.profile ?? defaultProfileDraft);
            patch({ view: 'quiz', quizStep: state.quizStep || 0 });
          }}
          onOpenRoute={() => {
            setDraft(state.profile ?? defaultProfileDraft);
            patch({ view: 'journey' });
          }}
          onRestart={restartConfirmed}
          onDemo={(profile) => {
            setDraft(profile);
            void buildRoute(profile, previousProfile);
          }}
        />
      )}
      {state.view === 'quiz' && (
        <Quiz
          value={draft}
          step={state.quizStep}
          onStep={(quizStep) => patch({ quizStep })}
          onChange={(profile) => {
            setDraft(profile);
            patch({ profile });
          }}
          onBackHome={goHome}
          onSubmit={() => {
            void buildRoute(draft, previousProfile);
          }}
        />
      )}
      {state.view === 'journey' && state.profile && (
        <Journey
          profile={state.profile}
          selectedIds={state.selectedIds}
          targetId={state.targetId}
          taskDone={state.taskDone}
          extraPlanTasks={state.extraPlanTasks}
          loading={loading}
          tab={tab}
          onTab={(next) => {
            setTab(next);
            patch({ journeyTab: next });
          }}
          recs={recs}
          recsLoading={loading}
          recsError={recsError}
          onRetryRecs={() => {
            if (state.profile) {
              fetchedKey.current = null;
              void loadRecommendations(state.profile, state.targetId ? Number(state.targetId) : null);
            }
          }}
          onToggleSelect={(id) => {
            const selectedIds = state.selectedIds.includes(id)
              ? state.selectedIds.filter((item) => item !== id)
              : [...state.selectedIds, id];
            patch({ selectedIds });
          }}
          onTarget={(id) => {
            const nextId = state.targetId === id ? null : id;
            const prefix = nextId ? `p${nextId}-` : null;
            const taskDone = prefix
              ? Object.fromEntries(
                  Object.entries(state.taskDone).filter(([taskId]) => taskId.startsWith(prefix) || taskId.startsWith('extra-')),
                )
              : state.taskDone;
            patch({ targetId: nextId, taskDone });
          }}
          onToggleTask={(id) =>
            patch({
              taskDone: { ...state.taskDone, [id]: !state.taskDone[id] },
            })
          }
          onAddAction={addActionToPlan}
          onRemoveExtra={(id) => {
            patch({
              extraPlanTasks: state.extraPlanTasks.filter((task) => task.id !== id),
              taskDone: Object.fromEntries(Object.entries(state.taskDone).filter(([taskId]) => taskId !== id)),
            });
          }}
          onEdit={() => {
            setDraft(state.profile ?? defaultProfileDraft);
            patch({ view: 'quiz', quizStep: 0 });
          }}
          onRebuild={() => {
            if (state.profile) void buildRoute(state.profile, previousProfile);
          }}
        />
      )}

      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </Shell>
  );
}
