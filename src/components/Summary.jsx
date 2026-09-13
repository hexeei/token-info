import { Card } from './ui.jsx'
import ScoreRadar from './charts/ScoreRadar.jsx'

const TONE_TEXT = {
  success: 'text-success',
  accent: 'text-accent',
  danger: 'text-danger',
  muted: 'text-secondary',
}
const TONE_BORDER = {
  success: 'border-success/40 bg-success/10',
  accent: 'border-accent/40 bg-accent/10',
  danger: 'border-danger/40 bg-danger/10',
  muted: 'border-bg-2 bg-bg-0',
}

const SEVERITY = {
  critical: 'text-danger',
  warning: 'text-danger',
  info: 'text-secondary',
}

// Aggregate score gauge + verdict + radar + red flags.
export default function Summary({ summary, ticker }) {
  const { overallScore, verdict, contributions, redFlags } = summary
  const scoreTone =
    overallScore >= 75 ? 'success' : overallScore >= 45 ? 'accent' : 'danger'

  return (
    <Card className="sticky top-4 overflow-hidden">
      <div className="border-b border-bg-2 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">Итоговый скор</h2>
          {ticker && <span className="tabular text-xs text-muted">{ticker}</span>}
        </div>

        <div className="mt-3 flex items-end gap-3">
          <span className={`tabular text-5xl font-bold leading-none ${TONE_TEXT[scoreTone]}`}>
            {overallScore}
          </span>
          <span className="tabular mb-1 text-sm text-muted">/ 100</span>
        </div>

        {/* Score bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-2">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${overallScore}%`,
              background:
                scoreTone === 'success'
                  ? 'var(--success)'
                  : scoreTone === 'danger'
                    ? 'var(--danger)'
                    : 'var(--accent)',
            }}
          />
        </div>

        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${TONE_BORDER[verdict.tone]} ${TONE_TEXT[verdict.tone]}`}
        >
          {verdict.label}
        </div>
      </div>

      {/* Radar */}
      <div className="border-b border-bg-2 px-3 py-3">
        <ScoreRadar contributions={contributions} />
      </div>

      {/* Per-block contributions */}
      <div className="border-b border-bg-2 px-5 py-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Вклад блоков</h3>
        <ul className="mt-2 space-y-2">
          {contributions.map((c) => (
            <li key={c.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary">{c.title}</span>
                <span className="tabular text-muted">
                  <span className="text-accent">{c.score}/10</span> · вес {c.weight}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(c.score / 10) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Red flags */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
          Ред-флаги {redFlags.length > 0 && <span className="text-danger">· {redFlags.length}</span>}
        </h3>
        {redFlags.length === 0 ? (
          <p className="mt-2 text-xs text-success">Критичных флагов не обнаружено.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {redFlags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-danger">⚑</span>
                <span>
                  <span className={`font-medium ${SEVERITY[f.severity]}`}>{f.title}.</span>{' '}
                  <span className="text-secondary">{f.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
