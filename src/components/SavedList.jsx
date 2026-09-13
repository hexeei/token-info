import { computeSummary } from '../lib/scoring.js'
import { formatDate } from '../lib/format.js'

// Sidebar list of saved analyses stored in LocalStorage.
export default function SavedList({ items, currentId, onOpen, onDelete }) {
  if (!items || items.length === 0) {
    return (
      <p className="px-1 text-xs text-muted">
        Пока нет сохранённых разборов. Заполните чеклист и нажмите «Сохранить».
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const summary = computeSummary(it)
        const active = it.id === currentId
        const tone =
          summary.overallScore >= 75 ? 'text-success' : summary.overallScore >= 45 ? 'text-accent' : 'text-danger'
        return (
          <li key={it.id}>
            <div
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                active ? 'border-accent/50 bg-bg-2' : 'border-bg-2 bg-bg-0 hover:border-bg-2 hover:bg-bg-2'
              }`}
            >
              <button type="button" onClick={() => onOpen(it.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {it.identity?.logo ? (
                  <img src={it.identity.logo} alt="" className="h-7 w-7 rounded-full" />
                ) : (
                  <span className="tabular flex h-7 w-7 items-center justify-center rounded-full bg-bg-2 text-[10px] text-muted">
                    {(it.identity?.ticker || '?').slice(0, 3)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-primary">
                    {it.identity?.name || 'Без названия'}
                  </span>
                  <span className="tabular block text-[11px] text-muted">
                    {it.identity?.ticker || '—'} · {formatDate(it.updatedAt)}
                  </span>
                </span>
                <span className={`tabular text-sm font-semibold ${tone}`}>{summary.overallScore}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(it.id)}
                title="Удалить"
                className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"
              >
                ✕
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
