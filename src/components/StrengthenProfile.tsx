import type { DevelopmentAction } from '../types';

const categoryLabels: Record<DevelopmentAction['category'], string> = {
  requirement: 'Известный пробел',
  advice: 'Совет Aurora',
};

export function StrengthenProfile({
  actions,
  addedIds,
  onAdd,
  loading = false,
}: {
  actions: DevelopmentAction[];
  addedIds: Set<string>;
  onAdd: (action: DevelopmentAction) => void;
  loading?: boolean;
}) {
  if (!loading && !actions.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">Как усилить свой профиль</h2>
        <p className="mt-1 text-sm text-muted">
          Это персональные советы Aurora, не официальные требования вузов. Конкретные курсы показываем только из
          проверенного каталога.
        </p>
      </div>
      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Готовим персональные советы">
          <div className="raised-card h-28 animate-pulse bg-section" />
          <div className="raised-card h-28 animate-pulse bg-section" />
        </div>
      ) : null}
      {actions.map((action) => {
        const added = addedIds.has(action.id);
        return (
          <article key={action.id} className="raised-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">{action.title}</h3>
              <span className="status-badge">{categoryLabels[action.category]}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{action.reason}</p>
            <p className="mt-2 text-sm text-ink">{action.firstStep}</p>
            <p className="mt-2 text-xs text-muted">
              {action.suggestedEffort} · {action.expectedOutcome}
            </p>
            <button type="button" className="btn-secondary mt-4 px-4 py-2 text-sm" disabled={added} onClick={() => onAdd(action)}>
              {added ? 'Уже в плане' : 'Добавить в мой план'}
            </button>
          </article>
        );
      })}
    </section>
  );
}
