import type { TokenAnalysis, Scores, Notes, TrendDirection } from '../types'
import { computeTokenomics, computeBuyback, computeUpside } from './scoring'
import { toNumber, clamp, formatPct, formatUsd, formatX } from './format'
import { RUBRIC, SECTOR_RUBRIC, UPSIDE_RUBRIC, scoreMetric } from '../rubric'

export interface AutoResult {
  scores: Partial<Scores>
  notes: Partial<Notes>
  trendDirection: TrendDirection | ''
}

// Average the available (non-null) sub-scores; null if none are known.
function avg(subs: (number | null)[]): number | null {
  const vals = subs.filter((x): x is number => x != null)
  if (!vals.length) return null
  return vals.reduce((s, x) => s + x, 0) / vals.length
}

// Derive a first-pass analysis (scores + notes + trend) strictly from RUBRIC.
// Everything stays editable — these are the base-rule suggestions.
export function autoAnalyze(a: TokenAnalysis): AutoResult {
  const tk = computeTokenomics(a)
  const bb = computeBuyback(a)

  const chg7 = toNumber(a.tokenomics.priceChange7d)
  const chg30 = toNumber(a.tokenomics.priceChange30d)
  const athPct = toNumber(a.tokenomics.athChangePct)
  const mc = toNumber(a.tokenomics.marketCap)
  const rev24 = toNumber(a.valueAccrual.revenue)

  const scores: Partial<Scores> = {}
  const notes: Partial<Notes> = {}

  // ---- Sector ----
  {
    let s = SECTOR_RUBRIC.base
    const bits: string[] = []
    if (a.sector.sector) {
      bits.push(`сектор ${a.sector.sector}`)
      if (SECTOR_RUBRIC.hotSectors.includes(a.sector.sector)) {
        s += SECTOR_RUBRIC.hotBonus
        bits.push('в фокусе рынка')
      }
    }
    if (chg30 != null && chg30 > SECTOR_RUBRIC.momentum30dThreshold) {
      s += SECTOR_RUBRIC.momentumBonus
      bits.push(`приток за 30д ${formatPct(chg30, { sign: true })}`)
    }
    scores.sector = clamp(s, 0, 10)
    notes.sector = (bits.length ? bits.join(', ') + '. ' : '') + 'Оцените силу нарратива вручную.'
  }

  // ---- Tokenomics: composite of FDV/MC, %circ, unlock 90d ----
  {
    const sFdv = scoreMetric(tk.fdvMcRatio, RUBRIC.fdvMc)
    const sCirc = scoreMetric(tk.pctCirculating, RUBRIC.pctCirc)
    const sUnlock = scoreMetric(tk.unlock90dPct, RUBRIC.unlock90d)
    const composite = avg([sFdv, sCirc, sUnlock])
    scores.tokenomics = composite != null ? Math.round(composite) : 5
    const bits: string[] = []
    if (tk.fdvMcRatio != null) bits.push(`FDV/MC ${formatX(tk.fdvMcRatio, 2)}→${sFdv}`)
    if (tk.pctCirculating != null) bits.push(`в обращении ${formatPct(tk.pctCirculating)}→${sCirc}`)
    if (tk.unlock90dPct > 0) bits.push(`анлок 90д ${formatPct(tk.unlock90dPct)}→${sUnlock}`)
    notes.tokenomics = (bits.length ? bits.join(', ') + '. ' : '') + 'Проверьте распределение и график анлоков.'
  }

  // ---- Value accrual: P/S when revenue is known ----
  {
    if (rev24 != null && rev24 > 0 && mc) {
      const ps = mc / (rev24 * 365)
      const sPs = scoreMetric(ps, RUBRIC.ps) ?? 5
      scores.valueAccrual = sPs
      notes.valueAccrual = `годовая выручка ≈ ${formatUsd(rev24 * 365)}, MC/выручка ≈ ${ps.toFixed(0)}×→${sPs}. Отметьте, что даёт держание (staking / fee share / real yield).`
    } else {
      scores.valueAccrual = 4
      notes.valueAccrual = 'Выручка не найдена в DefiLlama — проверьте модель дохода вручную и отметьте механики держания.'
    }
  }

  // ---- Buyback: buyback yield (unknown → base 4) ----
  {
    const sBuy = scoreMetric(bb.buybackYield, RUBRIC.buybackYield) ?? 4
    scores.buyback = sBuy
    notes.buyback =
      bb.buybackYield != null
        ? `buyback yield ${formatPct(bb.buybackYield)}→${sBuy}.`
        : 'Данных о байбеке/burn нет в публичных API — укажите вручную (есть ли, размер, периодичность).'
  }

  // ---- Trend ----
  let trendDirection: TrendDirection | '' = ''
  {
    const avgTrend = avg([chg7, chg30])
    const sTrend = scoreMetric(avgTrend, RUBRIC.trend)
    scores.trend = sTrend ?? 5
    if (avgTrend != null) trendDirection = avgTrend > 8 ? 'uptrend' : avgTrend < -8 ? 'downtrend' : 'range'
    notes.trend = `7д ${formatPct(chg7, { sign: true })}, 30д ${formatPct(chg30, { sign: true })}, от ATH ${formatPct(athPct, { sign: true })}.`
  }

  // ---- Upside: market-cap ladder ± ATH distance ----
  {
    let s = scoreMetric(mc, RUBRIC.marketCap) ?? 5
    const bits: string[] = []
    if (mc != null) bits.push(`MC ${formatUsd(mc)}→${scoreMetric(mc, RUBRIC.marketCap)}`)
    if (athPct != null) {
      if (athPct <= UPSIDE_RUBRIC.deepBelowAthPct) {
        s += UPSIDE_RUBRIC.deepBelowAthBonus
        bits.push('глубоко ниже ATH (+1)')
      } else if (athPct >= UPSIDE_RUBRIC.nearAthPct) {
        s += UPSIDE_RUBRIC.nearAthPenalty
        bits.push('около ATH (−1)')
      }
    }
    scores.upside = clamp(s, 0, 10)
    const micro = mc != null && mc < 25e6 ? 'Микрокап: потенциал высокий, но риск ликвидности/выживаемости. ' : ''
    // Comps were auto-loaded before this runs — surface the X to each leader.
    const up = computeUpside(a)
    const compBits = up.comps
      .filter((c) => c.x != null)
      .map((c) => `${c.label} → ${formatX(c.x!)}`)
    const compText = compBits.length ? `До лидеров сектора: ${compBits.join(', ')}. ` : 'Добавьте comps для расчёта X-потенциала. '
    notes.upside = (bits.length ? bits.join(', ') + '. ' : '') + micro + compText
  }

  return { scores, notes, trendDirection }
}
