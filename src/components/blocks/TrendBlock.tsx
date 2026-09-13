import { Block, TextArea, ScoreSlider, Metric } from '../ui'
import { formatPct, toNumber } from '../../lib/format'
import type { BlockProps } from './blockProps'
import type { TrendDirection } from '../../types'

const DIRECTIONS: { id: TrendDirection; label: string }[] = [
  { id: 'uptrend', label: 'Аптренд' },
  { id: 'range', label: 'Рейндж' },
  { id: 'downtrend', label: 'Даунтренд' },
]

// Suggest a default direction from CoinGecko 7d/30d change.
function suggest(chg7: number | null, chg30: number | null): TrendDirection | null {
  const vals = [chg7, chg30].filter((x): x is number => x != null)
  if (vals.length === 0) return null
  const avg = vals.reduce((s, x) => s + x, 0) / vals.length
  if (avg > 8) return 'uptrend'
  if (avg < -8) return 'downtrend'
  return 'range'
}

// Block 6 — Trend.
export default function TrendBlock({ a, set, setScore, setNote }: BlockProps) {
  const t = a.trend
  const chg7 = toNumber(a.tokenomics.priceChange7d)
  const chg30 = toNumber(a.tokenomics.priceChange30d)
  const suggested = suggest(chg7, chg30)

  return (
    <Block index={6} title="Тренд" subtitle="Текущее направление и моментум">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Тренд 7д" value={formatPct(chg7, { sign: true })} tone={chg7 == null ? 'accent' : chg7 >= 0 ? 'success' : 'danger'} />
        <Metric label="Тренд 30д" value={formatPct(chg30, { sign: true })} tone={chg30 == null ? 'accent' : chg30 >= 0 ? 'success' : 'danger'} />
        <Metric label="От ATH" value={formatPct(a.tokenomics.athChangePct, { sign: true })} tone={toNumber(a.tokenomics.athChangePct) != null && toNumber(a.tokenomics.athChangePct)! <= -90 ? 'danger' : 'accent'} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">Текущий тренд</span>
          {suggested && (
            <button
              type="button"
              onClick={() => set('trend.direction', suggested)}
              className="text-[11px] text-accent hover:underline"
            >
              предложено: {DIRECTIONS.find((d) => d.id === suggested)?.label} → применить
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {DIRECTIONS.map((d) => {
            const active = t.direction === d.id
            const tone = d.id === 'uptrend' ? 'success' : d.id === 'downtrend' ? 'danger' : 'accent'
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => set('trend.direction', active ? '' : d.id)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? tone === 'success'
                      ? 'border-success/50 bg-success/10 text-success'
                      : tone === 'danger'
                        ? 'border-danger/50 bg-danger/10 text-danger'
                        : 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-bg-2 bg-bg-0 text-secondary hover:border-accent/40'
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3">
        <TextArea label="Momentum" value={t.momentumNote} onChange={(v) => set('trend.momentumNote', v)} placeholder="Сила движения, объёмы, структура (HH/HL), реакция на новости, дивергенции…" />
      </div>

      <ScoreSlider
        score={a.scores.trend}
        onScore={(n) => setScore('trend', n)}
        note={a.notes.trend}
        onNote={(v) => setNote('trend', v)}
        notePlaceholder="Оценка тренда/моментума для тайминга входа…"
      />
    </Block>
  )
}
