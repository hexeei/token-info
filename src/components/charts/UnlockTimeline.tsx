import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { toNumber, daysUntil, compactNumber } from '../../lib/format'
import type { UnlockEvent } from '../../types'

// Bar timeline of token unlocks by date. Bars within 90 days are tinted danger.
export default function UnlockTimeline({
  unlocks,
  circulating,
}: {
  unlocks: UnlockEvent[]
  circulating: number | null
}) {
  const rows = (unlocks || [])
    .filter((u) => u.date)
    .map((u) => {
      const amt = toNumber(u.amount)
      let pct = toNumber(u.pctOfCirc)
      if (pct == null && amt != null && circulating) pct = (amt / circulating) * 100
      const dd = daysUntil(u.date)
      return {
        date: u.date,
        pct: pct != null ? Number(pct.toFixed(2)) : 0,
        amount: amt,
        near: dd != null && dd >= 0 && dd <= 90,
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-bg-2 text-sm text-muted">
        Добавьте записи анлоков, чтобы увидеть таймлайн.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-2)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickFormatter={(d: string) => (d || '').slice(0, 7)}
            stroke="var(--bg-2)"
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            stroke="var(--bg-2)"
            tickFormatter={(v: number) => `${v}%`}
            width={44}
          />
          <Tooltip
            cursor={{ fill: 'var(--bg-2)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--bg-1)',
              border: '1px solid var(--bg-2)',
              borderRadius: 12,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
            formatter={(v: number | string, _n: string, item: any) => {
              const amt = item?.payload?.amount
              return [
                `${v}% от circ${amt != null ? ` · ${compactNumber(amt)} токенов` : ''}`,
                item?.payload?.near ? 'Анлок ≤ 90 дн.' : 'Анлок',
              ]
            }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.near ? 'var(--danger)' : 'var(--accent)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
