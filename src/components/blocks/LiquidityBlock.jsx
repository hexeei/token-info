import { Block, Field, TextArea, ScoreSlider, Metric } from '../ui.jsx'
import { formatPct, formatPrice, toNumber } from '../../lib/format.js'

// Block 6 — Liquidity & market. Volume, trend and ATH position (auto where possible).
export default function LiquidityBlock({ a, set, setScore, setNote, isAuto }) {
  const l = a.liquidity
  const t = a.tokenomics
  const vol = toNumber(l.volume24h)
  const mc = toNumber(t.marketCap)
  const volToMc = vol && mc ? (vol / mc) * 100 : null
  const chg7 = toNumber(t.priceChange7d)
  const chg30 = toNumber(t.priceChange30d)

  return (
    <Block index={6} title="Ликвидность и рынок" subtitle="Объём, тренд и позиция относительно ATH">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Объём торгов (24ч)" value={l.volume24h} onChange={(v) => set('liquidity.volume24h', v)} auto={isAuto('liquidity.volume24h')} mono placeholder="$" />
        <Field label="ATH" value={t.ath} onChange={(v) => set('tokenomics.ath', v)} auto={isAuto('tokenomics.ath')} mono placeholder="$" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          label="Vol / MC (24ч)"
          value={volToMc != null ? formatPct(volToMc) : '—'}
          tone={volToMc != null && volToMc < 1 ? 'danger' : volToMc != null && volToMc > 5 ? 'success' : 'accent'}
          hint="ликвидность рынка"
        />
        <Metric
          label="От ATH"
          value={t.athChangePct !== '' && t.athChangePct != null ? formatPct(toNumber(t.athChangePct), { sign: true }) : '—'}
          tone={toNumber(t.athChangePct) != null && toNumber(t.athChangePct) <= -90 ? 'danger' : 'accent'}
        />
        <Metric
          label="Тренд 7д"
          value={chg7 != null ? formatPct(chg7, { sign: true }) : '—'}
          tone={chg7 == null ? 'accent' : chg7 >= 0 ? 'success' : 'danger'}
        />
        <Metric
          label="Тренд 30д"
          value={chg30 != null ? formatPct(chg30, { sign: true }) : '—'}
          tone={chg30 == null ? 'accent' : chg30 >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Metric label="Текущая цена" value={formatPrice(t.price)} tone="accent" />
        <Metric label="% от ATH (авто)" value={t.athChangePct !== '' && t.athChangePct != null ? formatPct(toNumber(t.athChangePct)) : '—'} tone="accent" />
      </div>

      <div className="mt-3">
        <TextArea
          label="Ликвидность и рынок"
          value={l.liquidityNote}
          onChange={(v) => set('liquidity.liquidityNote', v)}
          placeholder="Глубина стакана, на каких биржах/DEX торгуется, концентрация ликвидности, слиппедж, риск манипуляций…"
        />
      </div>

      <ScoreSlider
        score={a.scores.liquidity}
        onScore={(n) => setScore('liquidity', n)}
        note={a.notes.liquidity}
        onNote={(v) => setNote('liquidity', v)}
        notePlaceholder="Оценка ликвидности и рыночной структуры…"
      />
    </Block>
  )
}
