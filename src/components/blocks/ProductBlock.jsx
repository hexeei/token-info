import { Block, Field, TextArea, ScoreSlider, Metric } from '../ui.jsx'
import { formatUsd, toNumber } from '../../lib/format.js'

// Block 5 — Product & traction. TVL / revenue / fees auto from DefiLlama when matched.
export default function ProductBlock({ a, set, setScore, setNote, isAuto }) {
  const p = a.product
  const rev = toNumber(p.revenue)
  const mc = toNumber(a.tokenomics.marketCap)
  // Annualized P/S style sanity check: MC / (revenue * 365) if revenue is daily.
  const psRatio = rev && mc ? mc / (rev * 365) : null

  return (
    <Block index={5} title="Продукт и трэкшн" subtitle="Есть ли реальное использование и выручка">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="TVL" value={p.tvl} onChange={(v) => set('product.tvl', v)} auto={isAuto('product.tvl')} mono placeholder="$" />
        <Field label="Fees (24ч)" value={p.fees} onChange={(v) => set('product.fees', v)} auto={isAuto('product.fees')} mono placeholder="$" />
        <Field label="Revenue (24ч)" value={p.revenue} onChange={(v) => set('product.revenue', v)} auto={isAuto('product.revenue')} mono placeholder="$" hint="если протокол найден в DefiLlama" />
        <Field label="Активные юзеры / кол-во" value={p.users} onChange={(v) => set('product.users', v)} auto={isAuto('product.users')} mono placeholder="напр. DAU, holders" />
      </div>

      {psRatio != null && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric
            label="MC / годовая выручка (≈P/S)"
            value={`${psRatio.toFixed(0)}×`}
            tone={psRatio <= 20 ? 'success' : psRatio <= 60 ? 'accent' : 'danger'}
            hint="грубо: MC ÷ (revenue 24ч × 365)"
          />
          <Metric label="Годовая выручка (аннуал.)" value={formatUsd(rev * 365)} tone="accent" hint="revenue 24ч × 365" />
        </div>
      )}

      <div className="mt-3">
        <TextArea
          label="Продукт и трэкшн"
          value={p.productNote}
          onChange={(v) => set('product.productNote', v)}
          placeholder="Что делает продукт, есть ли органический спрос, динамика TVL/выручки, ретеншн, конкуренты…"
        />
      </div>

      <ScoreSlider
        score={a.scores.product}
        onScore={(n) => setScore('product', n)}
        note={a.notes.product}
        onNote={(v) => setNote('product', v)}
        notePlaceholder="Оценка реального использования и выручки…"
      />
    </Block>
  )
}
