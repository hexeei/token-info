import { RUBRIC, SECTOR_RUBRIC, UPSIDE_RUBRIC } from '../rubric'
import { WEIGHTS, SCORED_BLOCKS, VERDICT_THRESHOLDS } from '../config'
import { formatUsd } from '../lib/format'
import type { RubricMetric } from '../rubric'

function fmtThreshold(t: number | null, unit: RubricMetric['unit']): string {
  if (t === null) return 'иначе'
  if (unit === '$') return formatUsd(t)
  if (unit === '%') return `${t}%`
  if (unit === '×') return `${t}×`
  return String(t)
}

function MetricRow({ m }: { m: RubricMetric }) {
  const cmp = m.higherIsBetter ? '≥' : '≤'
  return (
    <div className="border-t border-bg-2 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-primary">{m.label}</span>
        <span className="text-[11px] text-muted">{m.hint}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {m.bands.map(([t, s], i) => (
          <span
            key={i}
            className="tabular inline-flex items-center gap-1 rounded-md border border-bg-2 bg-bg-0 px-2 py-1 text-xs"
          >
            <span className="text-secondary">
              {t === null ? 'иначе' : `${cmp} ${fmtThreshold(t, m.unit)}`}
            </span>
            <span className="text-muted">→</span>
            <span className="font-semibold text-accent">{s}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// Transparent scoring base ("Методика"): rubric tables + weights + verdict.
export default function RubricPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-bg-2 bg-bg-1">
      <header className="flex items-center justify-between border-b border-bg-2 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Методика скоринга (база)</h2>
          <p className="text-xs text-muted">Пороги, по которым авто-скор выставляет 0–10. Правится в src/rubric.ts</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-secondary hover:text-primary">
          Закрыть ✕
        </button>
      </header>

      <div className="grid grid-cols-1 gap-x-8 px-5 py-2 md:grid-cols-2">
        <div>
          {[RUBRIC.marketCap, RUBRIC.fdvMc, RUBRIC.pctCirc, RUBRIC.unlock90d].map((m) => (
            <MetricRow key={m.key} m={m} />
          ))}
        </div>
        <div>
          {[RUBRIC.ps, RUBRIC.trend, RUBRIC.buybackYield].map((m) => (
            <MetricRow key={m.key} m={m} />
          ))}
          <div className="border-t border-bg-2 py-3">
            <div className="text-sm font-medium text-primary">Сектор и апсайд</div>
            <ul className="mt-2 space-y-1 text-xs text-secondary">
              <li>Сектор: база {SECTOR_RUBRIC.base}, +{SECTOR_RUBRIC.hotBonus} за горячий сектор ({SECTOR_RUBRIC.hotSectors.join(', ')}), +{SECTOR_RUBRIC.momentumBonus} при 30д &gt; {SECTOR_RUBRIC.momentum30dThreshold}%.</li>
              <li>Апсайд: лестница капитализации выше, {UPSIDE_RUBRIC.deepBelowAthBonus > 0 ? '+' : ''}{UPSIDE_RUBRIC.deepBelowAthBonus} если ≤ {UPSIDE_RUBRIC.deepBelowAthPct}% от ATH, {UPSIDE_RUBRIC.nearAthPenalty} если ≥ {UPSIDE_RUBRIC.nearAthPct}%.</li>
              <li>Токеномика: среднее по FDV/MC, % в обращении и анлоку 90д.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-bg-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <span className="text-muted">Веса блоков:</span>
          {SCORED_BLOCKS.map((b) => (
            <span key={b.id} className="tabular text-secondary">
              {b.short} <span className="text-accent">{WEIGHTS[b.id]}</span>
            </span>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted">
          Вердикт: <span className="text-success">&gt; {VERDICT_THRESHOLDS.strong}</span> сильный ·{' '}
          <span className="text-accent">{VERDICT_THRESHOLDS.medium}–{VERDICT_THRESHOLDS.strong}</span> средний ·{' '}
          <span className="text-danger">&lt; {VERDICT_THRESHOLDS.medium}</span> пас
        </div>
      </div>
    </div>
  )
}
