import { Block, Field, TextArea, ScoreSlider, Metric } from '../ui.jsx'
import { formatPrice, formatUsd, toNumber } from '../../lib/format.js'

// Block 8 — Valuation & upside. Target multiple implies a target price / MC.
export default function ValuationBlock({ a, set, setScore, setNote }) {
  const v = a.valuation
  const mult = toNumber(v.targetMultiple)
  const price = toNumber(a.tokenomics.price)
  const mc = toNumber(a.tokenomics.marketCap)
  const targetPrice = mult && price ? price * mult : null
  const targetMc = mult && mc ? mc * mult : null

  return (
    <Block index={8} title="Оценка и апсайд" subtitle="Целевой мультипликатор и сравнение с аналогами">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Целевой апсайд (×)"
          value={v.targetMultiple}
          onChange={(x) => set('valuation.targetMultiple', x)}
          mono
          type="number"
          placeholder="напр. 3"
          hint="во сколько раз видите потенциал роста"
        />
        <Field
          label="Аналоги / бенчмарк MC"
          value={v.comparables}
          onChange={(x) => set('valuation.comparables', x)}
          placeholder="напр. лидер сектора ~$2B"
        />
      </div>

      {(targetPrice != null || targetMc != null) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric label="Целевая цена" value={formatPrice(targetPrice)} tone="success" hint={`${mult}× от текущей`} />
          <Metric label="Целевой Market Cap" value={formatUsd(targetMc)} tone="success" hint={`${mult}× от текущего MC`} />
        </div>
      )}

      <div className="mt-3">
        <TextArea
          label="Тезис по оценке"
          value={v.valuationNote}
          onChange={(x) => set('valuation.valuationNote', x)}
          placeholder="Дорого/дёшево относительно аналогов и выручки? Что заложено в цену? Реалистичный сценарий переоценки и его драйверы…"
        />
      </div>

      <ScoreSlider
        score={a.scores.valuation}
        onScore={(n) => setScore('valuation', n)}
        note={a.notes.valuation}
        onNote={(x) => setNote('valuation', x)}
        notePlaceholder="Насколько привлекательна оценка с учётом апсайда и риска…"
      />
    </Block>
  )
}
