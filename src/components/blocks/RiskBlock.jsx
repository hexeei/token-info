import { Block, TextArea, ScoreSlider } from '../ui.jsx'
import { collectRedFlags } from '../../lib/scoring.js'

const SEVERITY = {
  critical: { dot: 'bg-danger', text: 'text-danger', label: 'критично' },
  warning: { dot: 'bg-danger/70', text: 'text-danger', label: 'внимание' },
  info: { dot: 'bg-accent', text: 'text-secondary', label: 'контекст' },
}

// Block 7 — Risk. Higher score = safer. Surfaces auto-detected red flags.
export default function RiskBlock({ a, set, setScore, setNote }) {
  const flags = collectRedFlags(a)

  return (
    <Block
      index={7}
      title="Риски"
      subtitle="Выше скор = ниже риск. Автоматически найденные флаги ниже"
    >
      {flags.length === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          Автоматических ред-флагов не обнаружено. Проверьте риски вручную (регуляторка,
          контракт, зависимость от эмиссии, централизация).
        </div>
      ) : (
        <ul className="space-y-2">
          {flags.map((f, i) => {
            const s = SEVERITY[f.severity]
            return (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-bg-2 bg-bg-0 px-3 py-2.5"
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${s.text}`}>{f.title}</span>
                    <span className="rounded-full border border-bg-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-secondary">{f.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3">
        <TextArea
          label="Прочие риски"
          value={a.risk.riskNote}
          onChange={(v) => set('risk.riskNote', v)}
          placeholder="Регуляторные риски, аудит/безопасность контракта, зависимость от одного клиента/чейна, юридическая структура, конкуренция…"
        />
      </div>

      <ScoreSlider
        score={a.scores.risk}
        onScore={(n) => setScore('risk', n)}
        note={a.notes.risk}
        onNote={(v) => setNote('risk', v)}
        notePlaceholder="Общая оценка риск-профиля (10 = минимальный риск)…"
      />
    </Block>
  )
}
