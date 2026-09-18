import type { DevelopmentAction } from '../types';

const categoryLabels: Record<DevelopmentAction['category'], string> = {
  requirement: 'Требование программы',
  advice: 'Дополнительный совет',
};

export function StrengthenProfile({
  actions,
  addedIds,
  onAdd,
}: {
  actions: DevelopmentAction[];
  addedIds: Set<string>;
  onAdd: (action: DevelopmentAction) => void;
}) {
  if (!actions.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-ink">Как усилить свой профиль</h2>
        <p className="mt-1 text-sm text-muted">
          Сначала закрываем известные пробелы. Конкретные курсы показываем только из проверенного каталога — сейчас таких
          записей нет.
        </p>
      </div>
      {actions.map((action) => {
        const added = addedIds.has(action.id);
        return (
          <article key={action.id} className="rounded-[16px] border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">{action.title}</h3>
              <span className="status-badge">
                {action.category === 'requirement' ? '●' : '○'} {categoryLabels[action.category]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{action.reason}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Первый шаг</dt>
                <dd className="text-ink">{action.firstStep}</dd>
              </div>
              <div>
                <dt className="text-muted">Ожидаемый результат</dt>
                <dd className="text-ink">{action.expectedOutcome}</dd>
              </div>
              <div>
                <dt className="text-muted">Нагрузка</dt>
                <dd className="text-ink">{action.suggestedEffort}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn-secondary mt-4 px-4 py-2 text-sm"
              disabled={added}
              onClick={() => onAdd(action)}
            >
              {added ? 'Уже в плане' : 'Добавить в мой план'}
            </button>
          </article>
        );
      })}
    </section>
  );
}
