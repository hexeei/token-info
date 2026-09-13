import type { TokenAnalysis, Scores, Notes, TrendDirection } from '../types'
import { computeTokenomics, computeBuyback, computeUpside } from './scoring'
import { toNumber, clamp, formatPct, formatUsd, formatX } from './format'

// Sectors that are typically in narrative focus — nudges the sector score up.
const HOT_SECTORS = new Set(['AI', 'RWA', 'DePIN', 'Restaking', 'Liquid Staking', 'Perp DEX'])

export interface AutoResult {
  scores: Partial<Scores>
  notes: Partial<Notes>
  trendDirection: TrendDirection | ''
}

// Derive a first-pass analysis (scores + notes + trend) from the fetched data.
// Everything stays editable — these are data-driven suggestions, not verdicts.
export function autoAnalyze(a: TokenAnalysis): AutoResult {
  const tk = computeTokenomics(a)
  const up = computeUpside(a)

  const chg7 = toNumber(a.tokenomics.priceChange7d)
  const chg30 = toNumber(a.tokenomics.priceChange30d)
  const athPct = toNumber(a.tokenomics.athChangePct)
  const mc = toNumber(a.tokenomics.marketCap)
  const rev24 = toNumber(a.valueAccrual.revenue)

  const scores: Partial<Scores> = {}
  const notes: Partial<Notes> = {}

  // ---- Sector ----
  {
    let s = 5
    const bits: string[] = []
    if (a.sector.sector) {
      bits.push(`Сектор: ${a.sector.sector}`)
      if (HOT_SECTORS.has(a.sector.sector)) {
        s += 1
        bits.push('сектор в фокусе рынка')
      }
    }
    if (chg30 != null && chg30 > 25) {
      s += 1
      bits.push(`сильный приток за 30д (${formatPct(chg30, { sign: true })})`)
    }
    scores.sector = clamp(s, 0, 10)
    notes.sector = bits.length ? bits.join('; ') + '. Оцените силу нарратива вручную.' : 'Оцените силу нарратива вручную.'
  }

  // ---- Tokenomics ----
  {
    let s = 7
    const bits: string[] = []
    if (tk.fdvMcRatio != null) {
      bits.push(`FDV/MC ${formatX(tk.fdvMcRatio, 2)}`)
      if (tk.fdvMcRatio >= 5) s -= 3
      else if (tk.fdvMcRatio >= 3) s -= 2
      else if (tk.fdvMcRatio >= 2) s -= 1
      else if (tk.fdvMcRatio <= 1.2) s += 1
    }
    if (tk.pctCirculating != null) {
      bits.push(`в обращении ${formatPct(tk.pctCirculating)}`)
      if (tk.pctCirculating < 10) s -= 2
      else if (tk.pctCirculating < 20) s -= 1
      else if (tk.pctCirculating >= 70) s += 1
    }
    if (tk.unlock90dPct > 0) {
      bits.push(`анлок 90д ${formatPct(tk.unlock90dPct)}`)
      if (tk.unlock90dPct > 10) s -= 2
      else if (tk.unlock90dPct > 5) s -= 1
    }
    scores.tokenomics = clamp(s, 0, 10)
    notes.tokenomics = bits.length
      ? bits.join(', ') + '. Проверьте распределение и график анлоков.'
      : 'Заполните supply/распределение для оценки навеса.'
  }

  // ---- Value accrual ----
  {
    let s: number
    const bits: string[] = []
    if (rev24 != null && rev24 > 0 && mc) {
      const ps = mc / (rev24 * 365)
      bits.push(`годовая выручка ≈ ${formatUsd(rev24 * 365)}`, `MC/выручка ≈ ${ps.toFixed(0)}×`)
      s = 6
      if (ps < 15) s += 2
      else if (ps < 40) s += 1
      else if (ps > 250) s -= 3
      else if (ps > 100) s -= 2
    } else {
      s = 4
      bits.push('выручка не найдена в DefiLlama — проверьте модель дохода вручную')
    }
    scores.valueAccrual = clamp(s, 0, 10)
    notes.valueAccrual = bits.join('. ') + '. Отметьте, что даёт держание (staking / fee share / real yield).'
  }

  // ---- Buyback (no public API signal) ----
  {
    scores.buyback = 5
    notes.buyback = 'Данных о байбеке/burn нет в публичных API — укажите вручную (есть ли, размер, периодичность).'
  }

  // ---- Trend ----
  {
    const vals = [chg7, chg30].filter((x): x is number => x != null)
    let dir: TrendDirection | '' = ''
    let s = 5
    if (vals.length) {
      const avg = vals.reduce((sum, x) => sum + x, 0) / vals.length
      if (avg >= 20) s = 9
      else if (avg >= 8) s = 7
      else if (avg >= 0) s = 6
      else if (avg > -8) s = 4
      else if (avg > -20) s = 3
      else s = 2
      dir = avg > 8 ? 'uptrend' : avg < -8 ? 'downtrend' : 'range'
    }
    scores.trend = clamp(s, 0, 10)
    const parts = [
      `7д ${formatPct(chg7, { sign: true })}`,
      `30д ${formatPct(chg30, { sign: true })}`,
      `от ATH ${formatPct(athPct, { sign: true })}`,
    ]
    notes.trend = parts.join(', ') + '.'
    return finalize(scores, notes, dir, { mc, athPct, up })
  }
}

function finalize(
  scores: Partial<Scores>,
  notes: Partial<Notes>,
  trendDirection: TrendDirection | '',
  ctx: { mc: number | null; athPct: number | null; up: ReturnType<typeof computeUpside> },
): AutoResult {
  // ---- Upside (by size + distance from ATH) ----
  let s = 5
  const bits: string[] = []
  const { mc, athPct } = ctx
  if (mc != null) {
    bits.push(`MC ${formatUsd(mc)}`)
    if (mc < 50e6) s = 7
    else if (mc < 300e6) s = 6
    else if (mc < 2e9) s = 5
    else if (mc < 10e9) s = 4
    else s = 3
  }
  if (athPct != null) {
    if (athPct <= -85) {
      s += 1
      bits.push('глубоко ниже ATH — есть куда восстанавливаться')
    } else if (athPct >= -20) {
      s -= 1
      bits.push('около ATH — апсайд ограничен')
    }
  }
  scores.upside = clamp(s, 0, 10)
  notes.upside = (bits.length ? bits.join(', ') + '. ' : '') + 'Добавьте comps конкурентов для расчёта X-потенциала.'

  return { scores, notes, trendDirection }
}
