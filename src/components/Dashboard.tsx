import { useState } from 'react'
import CompareView from './CompareView'
import { computeSummary } from '../lib/scoring'
import { formatDate } from '../lib/format'
import type { TokenAnalysis } from '../types'

const TONE_TEXT = { success: 'text-success', accent: 'text-accent', danger: 'text-danger', muted: 'text-secondary' } as const
const TONE_BORDER = { success: 'border-success/40', accent: 'border-accent/40', danger: 'border-danger/40', muted: 'border-bg-2' } as const

export default function Dashboard({
  items,
  onNew,
  onOpen,
  onDelete,
}: {
  items: TokenAnalysis[]
  onNew: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev // cap at 3
      return [...prev, id]
    })

  const compareItems = items.filter((it) => selected.includes(it.meta.id))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Мои разборы</h2>
          <p className="text-xs text-muted">
            {items.length === 0
              ? 'Пока пусто — начните новый разбор'
              : `${items.length} сохранено · выберите 2–3 для сравнения`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length >= 2 && (
            <button
              type="button"
              onClick={() => setComparing(true)}
              className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Сравнить ({selected.length})
            </button>
          )}
          {selected.length > 0 && (
            <button type="button" onClick={() => setSelected([])} className="text-sm text-muted hover:text-secondary">
              Сбросить
            </button>
          )}
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg-0 hover:opacity-90"
          >
            + Новый разбор
          </button>
        </div>
      </div>

      {comparing && compareItems.length >= 2 && (
        <div className="mb-5">
          <CompareView
            analyses={compareItems}
            onClose={() => setComparing(false)}
            onOpen={(id) => onOpen(id)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bg-2 px-6 py-16 text-center">
          <p className="text-sm text-secondary">Здесь появятся карточки сохранённых разборов.</p>
          <button type="button" onClick={onNew} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg-0 hover:opacity-90">
            Начать первый разбор
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => {
            const s = computeSummary(it)
            const isSel = selected.includes(it.meta.id)
            return (
              <div
                key={it.meta.id}
                className={`group relative rounded-2xl border bg-bg-1 p-4 transition ${
                  isSel ? 'border-accent' : TONE_BORDER[s.verdict.tone]
                }`}
              >
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => onOpen(it.meta.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    {it.identity.logo ? (
                      <img src={it.identity.logo} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="tabular flex h-10 w-10 items-center justify-center rounded-full bg-bg-2 text-xs text-muted">
                        {(it.identity.ticker || '?').slice(0, 3)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-primary">
                        {it.identity.name || 'Без названия'}
                      </div>
                      <div className="tabular text-xs text-muted">
                        {it.identity.ticker || '—'} · {formatDate(it.meta.updatedAt)}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-col items-center gap-2">
                    <label className="flex cursor-pointer items-center" title="В сравнение">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(it.meta.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => onDelete(it.meta.id)}
                      title="Удалить"
                      className="text-muted opacity-0 transition group-hover:opacity-100 hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className={`tabular text-3xl font-bold leading-none ${TONE_TEXT[s.verdict.tone]}`}>
                      {s.overall.toFixed(1)}
                    </div>
                    <div className="tabular mt-1 text-[11px] text-muted">/ 10</div>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${TONE_BORDER[s.verdict.tone]} ${TONE_TEXT[s.verdict.tone]}`}>
                    {s.verdict.label}
                  </span>
                </div>

                {s.redFlags.length > 0 && (
                  <div className="mt-3 text-[11px] text-danger">⚑ {s.redFlags.length} ред-флаг(ов)</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
