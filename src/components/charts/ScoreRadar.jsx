import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

// Short labels so the radar stays legible.
const SHORT = {
  narrative: 'Нарратив',
  tokenomics: 'Токеномика',
  team: 'Команда',
  product: 'Продукт',
  liquidity: 'Ликвидность',
  risk: 'Риск-профиль',
  valuation: 'Апсайд',
}

export default function ScoreRadar({ contributions }) {
  const data = contributions.map((c) => ({
    axis: SHORT[c.id] || c.title,
    score: c.score,
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--bg-2)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 10]}
            tickCount={6}
            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
            stroke="var(--bg-2)"
            axisLine={false}
          />
          <Radar
            name="Скор"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.35}
            dot={{ r: 2.5, fill: 'var(--accent)' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-1)',
              border: '1px solid var(--bg-2)',
              borderRadius: 12,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
            formatter={(v) => [`${v}/10`, 'Скор']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
