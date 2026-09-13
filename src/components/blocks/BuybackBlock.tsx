import { Block, Field, Select, TextArea, ScoreSlider, Metric } from '../ui'
import { CADENCES } from '../../config'
import { computeBuyback } from '../../lib/scoring'
import { formatPct, formatUsd } from '../../lib/format'
import type { BlockProps } from './blockProps'

// Block 5 — Buyback & burn.
export default function BuybackBlock({ a, set, setScore, setNote }: BlockProps) {
  const b = a.buyback
  const bb = computeBuyback(a)

  return (
    <Block index={5} title="Байбек и сжигание" subtitle="Возврат стоимости через выкуп и burn">
      <div>
        <span className="text-xs font-medium text-secondary">Есть ли байбек?</span>
        <div className="mt-2 flex gap-2">
          {[
            { v: true, label: 'Да' },
            { v: false, label: 'Нет' },
          ].map((opt) => (
            <button
              key={String(opt.v)}
              type="button"
              onClick={() => set('buyback.hasBuyback', b.hasBuyback === opt.v ? null : opt.v)}
              className={`rounded-lg border px-4 py-1.5 text-sm transition ${
                b.hasBuyback === opt.v
                  ? opt.v
                    ? 'border-success/50 bg-success/10 text-success'
                    : 'border-bg-2 bg-bg-2 text-secondary'
                  : 'border-bg-2 bg-bg-0 text-secondary hover:border-accent/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Размер байбека ($)" value={b.amountUsd} onChange={(v) => set('buyback.amountUsd', v)} mono placeholder="$ за период" />
        <Select
          label="Периодичность"
          value={b.cadence}
          onChange={(v) => set('buyback.cadence', v)}
          options={CADENCES.map((c) => ({ value: c.id, label: c.label }))}
          placeholder="—"
        />
        <Field label="% от выручки" value={b.pctOfRevenue} onChange={(v) => set('buyback.pctOfRevenue', v)} mono type="number" placeholder="напр. 50" hint="альтернатива сумме" />
      </div>

      {(bb.buybackYield != null || bb.annualBuyback != null) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric label="Buyback yield" value={bb.buybackYield != null ? formatPct(bb.buybackYield) : '—'} tone="success" hint="годовой байбек ÷ market cap" />
          <Metric label="Годовой байбек" value={formatUsd(bb.annualBuyback)} tone="success" hint="аннуализировано" />
        </div>
      )}

      <div className="mt-3">
        <TextArea label="Burn-механика" value={b.burnMechanics} onChange={(v) => set('buyback.burnMechanics', v)} placeholder="Что и как сжигается: часть комиссий, выкупленные токены, EIP-1559-подобное…" />
      </div>
      <div className="mt-3">
        <TextArea value={b.note} onChange={(v) => set('buyback.note', v)} placeholder="Заметка по байбеку/burn: устойчивость, источник финансирования…" rows={2} />
      </div>

      <ScoreSlider
        score={a.scores.buyback}
        onScore={(n) => setScore('buyback', n)}
        note={a.notes.buyback}
        onNote={(v) => setNote('buyback', v)}
        notePlaceholder="Насколько байбек/burn реально поддерживают цену…"
      />
    </Block>
  )
}
