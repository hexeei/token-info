import { useState } from 'react'
import { Block, Field, TextArea, ScoreSlider, Metric } from '../ui'
import { computeUpside } from '../../lib/scoring'
import { formatUsd, formatX, toNumber } from '../../lib/format'
import { newCompId } from '../../config'
import { fetchCompByTicker } from '../../api/coingecko'
import type { BlockProps } from './blockProps'
import type { Comp } from '../../types'

// Block 7 — Upside: target cap / X potential + competitor comps.
export default function UpsideBlock({ a, set, setScore, setNote }: BlockProps) {
  const up = a.upside
  const derived = computeUpside(a)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const addComp = () =>
    set('upside.comps', [...up.comps, { id: newCompId(), ticker: '', name: '', marketCap: '', fdv: '' } as Comp])
  const updateComp = (id: string, key: keyof Comp, value: string) =>
    set('upside.comps', up.comps.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
  const removeComp = (id: string) => set('upside.comps', up.comps.filter((c) => c.id !== id))

  async function pullComp(c: Comp) {
    if (!c.ticker.trim()) return
    setLoadingId(c.id)
    try {
      const r = await fetchCompByTicker(c.ticker)
      if (r.ok) {
        set(
          'upside.comps',
          up.comps.map((x) =>
            x.id === c.id
              ? {
                  ...x,
                  name: r.name || x.name,
                  marketCap: r.marketCap != null ? String(r.marketCap) : x.marketCap,
                  fdv: r.fdv != null ? String(r.fdv) : x.fdv,
                }
              : x,
          ),
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  const currentMc = toNumber(a.tokenomics.marketCap)

  return (
    <Block index={7} title="Апсайд" subtitle="Целевая капитализация и сравнение с конкурентами">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Целевая MC ($)" value={up.targetMc} onChange={(v) => set('upside.targetMc', v)} mono placeholder="$" hint="или X-потенциал ниже" />
        <Field label="X-потенциал" value={up.targetX} onChange={(v) => set('upside.targetX', v)} mono type="number" placeholder="напр. 5" />
      </div>

      {derived.targetX != null && (
        <div className="mt-3">
          <Metric label="Потенциал к цели" value={formatX(derived.targetX)} tone="success" hint={currentMc ? `от текущей MC ${formatUsd(currentMc)}` : 'укажите текущую MC в токеномике'} />
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">Comps (конкуренты)</span>
          <span className="text-[11px] text-muted">введите тикер и нажмите ⤓ чтобы подтянуть MC</span>
        </div>
        <div className="mt-2 space-y-2">
          {up.comps.map((c) => {
            const cx = derived.comps.find((x) => x.id === c.id)
            return (
              <div key={c.id} className="rounded-xl border border-bg-2 bg-bg-0 p-2.5">
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <MiniField label="Тикер" value={c.ticker} onChange={(v) => updateComp(c.id, 'ticker', v)} placeholder="напр. UNI" />
                  <MiniField label="Название" value={c.name} onChange={(v) => updateComp(c.id, 'name', v)} placeholder="авто при подтяжке" />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => pullComp(c)}
                      disabled={loadingId === c.id}
                      title="Подтянуть MC из CoinGecko"
                      className="rounded-lg border border-bg-2 px-2.5 py-2 text-secondary hover:border-accent/50 hover:text-accent disabled:opacity-50"
                    >
                      {loadingId === c.id ? '…' : '⤓'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeComp(c.id)}
                      title="Удалить"
                      className="rounded-lg border border-bg-2 px-2.5 py-2 text-muted hover:border-danger/50 hover:text-danger"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <MiniField label="Market Cap ($)" value={c.marketCap} onChange={(v) => updateComp(c.id, 'marketCap', v)} placeholder="$" />
                  <MiniField label="FDV ($)" value={c.fdv} onChange={(v) => updateComp(c.id, 'fdv', v)} placeholder="$" />
                  <div className="pb-2">
                    {cx?.x != null ? (
                      <span className="tabular text-sm font-semibold text-success">→ {formatX(cx.x)}</span>
                    ) : (
                      <span className="text-xs text-muted">→ —</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={addComp}
            className="rounded-lg border border-dashed border-bg-2 px-3 py-2 text-xs text-secondary hover:border-accent/50 hover:text-accent"
          >
            + Добавить конкурента
          </button>
        </div>
      </div>

      <div className="mt-3">
        <TextArea value={up.note} onChange={(v) => set('upside.note', v)} placeholder="Тезис по апсайду: реалистичный сценарий переоценки и его драйверы…" />
      </div>

      <ScoreSlider
        score={a.scores.upside}
        onScore={(n) => setScore('upside', n)}
        note={a.notes.upside}
        onNote={(v) => setNote('upside', v)}
        notePlaceholder="Насколько привлекателен апсайд с учётом риска…"
      />
    </Block>
  )
}

function MiniField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{label}</span>
      <input
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="tabular mt-1 w-full rounded-lg border border-bg-2 bg-bg-1 px-2.5 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none"
      />
    </label>
  )
}
