import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { SCORED_BLOCKS } from '../config'
import { computeSummary } from '../lib/scoring'
import type { TokenAnalysis } from '../types'

// Violet-family shades so multiple series stay within "violet = score" semantics.
const SERIES_COLORS = ['#a78bfa', '#6d5bd0', '#c4b5fd']

const TONE_TEXT = { success: 'text-success', accent: 'text-accent', danger: 'text-danger', muted: 'text-secondary' } as const

export default function CompareView({
  analyses,
  onClose,
  onOpen,
}: {
  analyses: TokenAnalysis[]
  onClose: () => void
  onOpen: (id: string) => void
}) {
  const items = analyses.slice(0, 3).map((a, i) => ({
    a,
    summary: computeSummary(a),
    color: SERIES_COLORS[i],
    label: a.identity.ticker || a.identity.name || `#${i + 1}`,
  }))

  // Radar dataset: one row per axis, one key per token label.
  const data = SCORED_BLOCKS.map((b) => {
    const row: Record<string, string | number> = { axis: b.short }
    for (const it of items) row[it.label] = it.a.scores[b.id]
    return row
  })

  return (
    <div className="rounded-2xl border border-bg-2 bg-bg-1">
      <header className="flex items-center justify-between border-b border-bg-2 px-5 py-4">
        <h2 className="text-sm font-semibold text-primary">Сравнение разборов · {items.length}</h2>
        <button type="button" onClick={onClose} className="text-sm text-secondary hover:text-primary">
          Закрыть ✕
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_1fr]">
        {/* Grouped radar */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="var(--bg-2)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} stroke="var(--bg-2)" axisLine={false} />
              {items.map((it) => (
                <Radar key={it.label} name={it.label} dataKey={it.label} stroke={it.color} fill={it.color} fillOpacity={0.18} />
              ))}
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--bg-2)', borderRadius: 12, color: 'var(--text-primary)', fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Score table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">Блок</th>
                {items.map((it) => (
                  <th key={it.label} className="px-3 py-2 text-right font-medium">
                    <button type="button" onClick={() => onOpen(it.a.meta.id)} className="tabular hover:underline" style={{ color: it.color }}>
                      {it.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCORED_BLOCKS.map((b) => (
                <tr key={b.id} className="border-t border-bg-2">
                  <td className="py-2 pr-3 text-secondary">{b.title}</td>
                  {items.map((it) => (
                    <td key={it.label} className="tabular px-3 py-2 text-right text-primary">
                      {it.a.scores[b.id]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-bg-2">
                <td className="py-2 pr-3 font-semibold text-primary">Итог</td>
                {items.map((it) => (
                  <td key={it.label} className={`tabular px-3 py-2 text-right font-semibold ${TONE_TEXT[it.summary.verdict.tone]}`}>
                    {it.summary.overall.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-xs text-muted">Вердикт</td>
                {items.map((it) => (
                  <td key={it.label} className={`px-3 py-2 text-right text-xs ${TONE_TEXT[it.summary.verdict.tone]}`}>
                    {it.summary.verdict.label}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
