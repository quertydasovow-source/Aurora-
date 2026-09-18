import type { DevelopmentAction } from '../types';

function SkeletonCard() {
  return <div className="advice-card h-48 animate-pulse" aria-hidden="true" />;
}

export function ProfileAdviceSection({
  intro,
  actions,
  addedIds,
  loading,
  fallback,
  onAdd,
  onRefresh,
  refreshDisabled,
}: {
  intro: string;
  actions: DevelopmentAction[];
  addedIds: Set<string>;
  loading: boolean;
  fallback: boolean;
  onAdd: (action: DevelopmentAction) => void;
  onRefresh: () => void;
  refreshDisabled: boolean;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Персональные рекомендации Aurora</h2>
            <span className="status-badge is-match">AI-рекомендации</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            AI анализирует твой профиль и предлагает конкретные действия, которые могут усилить твою подготовку к
            поступлению.
          </p>
        </div>
        <button
          type="button"
          className="btn-tertiary px-3 py-1.5 text-xs"
          onClick={onRefresh}
          disabled={loading || refreshDisabled}
        >
          Обновить советы
        </button>
      </div>

      {intro && !loading ? <p className="max-w-2xl text-sm leading-6 text-muted">{intro}</p> : null}
      {fallback && !loading ? (
        <p className="text-xs text-muted">Сейчас показываем базовые рекомендации Aurora.</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Готовим персональные рекомендации">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {actions.map((action, index) => {
            const added = addedIds.has(action.id);
            return (
              <article key={action.id} className="advice-card flex flex-col p-5">
                <p className="font-mono text-xs tracking-[0.18em] text-accent/80">{String(index + 1).padStart(2, '0')}</p>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-semibold leading-6 text-ink">{action.title}</h3>
                  <span className="status-badge shrink-0">Совет Aurora</span>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-6">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Почему тебе</p>
                    <p className="mt-1 text-muted">{action.reason}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Первый шаг</p>
                    <p className="mt-1 text-ink">{action.firstStep}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Результат</p>
                    <p className="mt-1 text-muted">{action.expectedOutcome}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                  <p className="text-xs text-muted">{action.suggestedEffort}</p>
                  <button
                    type="button"
                    className="btn-secondary px-4 py-2 text-sm"
                    disabled={added}
                    onClick={() => onAdd(action)}
                  >
                    {added ? 'Добавлено в план ✓' : 'Добавить в мой план'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
