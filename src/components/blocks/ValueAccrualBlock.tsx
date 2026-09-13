import { Block, Field, TextArea, ScoreSlider, Metric } from '../ui'
import { MECHANISMS } from '../../config'
import { formatUsd, toNumber } from '../../lib/format'
import type { BlockProps } from './blockProps'
import type { ValueAccrualMechanism } from '../../types'

// Block 4 — Value accrual: how the token earns / what holding it gives you.
export default function ValueAccrualBlock({ a, set, setScore, setNote, isAuto }: BlockProps) {
  const v = a.valueAccrual
  const rev = toNumber(v.revenue)
  const mc = toNumber(a.tokenomics.marketCap)
  const psRatio = rev && mc ? mc / (rev * 365) : null

  const toggle = (id: ValueAccrualMechanism) => {
    const has = v.mechanisms.includes(id)
    let next: ValueAccrualMechanism[]
    if (id === 'none') {
      next = has ? [] : ['none']
    } else {
      next = has ? v.mechanisms.filter((m) => m !== id) : [...v.mechanisms.filter((m) => m !== 'none'), id]
    }
    set('valueAccrual.mechanisms', next)
  }

  const onlyGov = v.mechanisms.length === 1 && v.mechanisms[0] === 'governance'
  const nothing = v.mechanisms.length === 0 || (v.mechanisms.length === 1 && v.mechanisms[0] === 'none')
  const weak = onlyGov || nothing

  return (
    <Block index={4} title="Value accrual" subtitle="Как токен зарабатывает и что даёт держание">
      <TextArea
        label="Revenue model протокола"
        value={v.revenueModel}
        onChange={(x) => set('valueAccrual.revenueModel', x)}
        placeholder="За что протокол берёт деньги, откуда выручка, кому она достаётся…"
      />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fees (24ч)" value={v.fees} onChange={(x) => set('valueAccrual.fees', x)} auto={isAuto('valueAccrual.fees')} mono placeholder="$" hint="auto из DefiLlama если найден" />
        <Field label="Revenue (24ч)" value={v.revenue} onChange={(x) => set('valueAccrual.revenue', x)} auto={isAuto('valueAccrual.revenue')} mono placeholder="$" />
      </div>

      {psRatio != null && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric label="MC / год. выручка (≈P/S)" value={`${psRatio.toFixed(0)}×`} tone={psRatio <= 20 ? 'success' : psRatio <= 60 ? 'accent' : 'danger'} hint="MC ÷ (revenue 24ч × 365)" />
          <Metric label="Годовая выручка" value={formatUsd(rev! * 365)} tone="accent" hint="revenue 24ч × 365" />
        </div>
      )}

      <div className="mt-4">
        <span className="text-xs font-medium text-secondary">Что даёт держание токена</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {MECHANISMS.map((m) => {
            const active = v.mechanisms.includes(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  active
                    ? m.id === 'none'
                      ? 'border-danger/50 bg-danger/10 text-danger'
                      : 'border-success/50 bg-success/10 text-success'
                    : 'border-bg-2 bg-bg-0 text-secondary hover:border-accent/40'
                }`}
              >
                {active ? '✓ ' : ''}
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {weak && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
          <span className="mt-0.5">⚑</span>
          <span>
            Ред-флаг: слабый value accrual — {nothing ? 'держание ничего не даёт' : 'только governance'}. Учтено в вердикте.
          </span>
        </div>
      )}

      <div className="mt-3">
        <TextArea value={v.note} onChange={(x) => set('valueAccrual.note', x)} placeholder="Детали механик начисления стоимости держателю…" />
      </div>

      <ScoreSlider
        score={a.scores.valueAccrual}
        onScore={(n) => setScore('valueAccrual', n)}
        note={a.notes.valueAccrual}
        onNote={(x) => setNote('valueAccrual', x)}
        notePlaceholder="Насколько реально токен захватывает стоимость протокола…"
      />
    </Block>
  )
}
