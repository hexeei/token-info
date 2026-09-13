import type {
  TokenAnalysis,
  RedFlag,
  Summary,
  BlockContribution,
  Verdict,
  ScoredBlockId,
} from '../types'
import { WEIGHTS, SCORED_BLOCKS, VERDICT_THRESHOLDS, cadencePerYear } from '../config'
import { toNumber, daysUntil, clamp } from './format'

// ---- Derived tokenomics ----------------------------------------------------
export interface TokenomicsDerived {
  circ: number | null
  total: number | null
  max: number | null
  fdv: number | null
  mc: number | null
  pctCirculating: number | null
  fdvMcRatio: number | null
  distSum: number
  distFilled: boolean
  insiderPct: number
  unlock90dPct: number
  unlock90dTokens: number
}

export function computeTokenomics(a: TokenAnalysis): TokenomicsDerived {
  const t = a.tokenomics
  const circ = toNumber(t.circulatingSupply)
  const total = toNumber(t.totalSupply)
  const max = toNumber(t.maxSupply)
  const fdv = toNumber(t.fdv)
  const mc = toNumber(t.marketCap)

  const supplyDenom = max ?? total
  const pctCirculating = supplyDenom && circ != null ? (circ / supplyDenom) * 100 : null
  const fdvMcRatio = fdv && mc ? fdv / mc : null

  const d = t.distribution
  const distKeys: (keyof typeof d)[] = ['team', 'investors', 'community', 'treasury', 'other']
  const distSum = distKeys.reduce((s, k) => s + (toNumber(d[k]) ?? 0), 0)
  const distFilled = distKeys.some((k) => toNumber(d[k]) != null)
  const insiderPct = (toNumber(d.team) ?? 0) + (toNumber(d.investors) ?? 0)

  let unlock90dPct = 0
  let unlock90dTokens = 0
  for (const u of t.unlocks || []) {
    const dd = daysUntil(u.date)
    if (dd != null && dd >= 0 && dd <= 90) {
      const amt = toNumber(u.amount)
      const pct = toNumber(u.pctOfCirc)
      if (pct != null) unlock90dPct += pct
      else if (amt != null && circ) unlock90dPct += (amt / circ) * 100
      if (amt != null) unlock90dTokens += amt
    }
  }

  return {
    circ,
    total,
    max,
    fdv,
    mc,
    pctCirculating,
    fdvMcRatio,
    distSum,
    distFilled,
    insiderPct,
    unlock90dPct,
    unlock90dTokens,
  }
}

// ---- Derived buyback -------------------------------------------------------
export interface BuybackDerived {
  annualBuyback: number | null
  buybackYield: number | null // % of market cap per year
}

export function computeBuyback(a: TokenAnalysis): BuybackDerived {
  const b = a.buyback
  const mc = toNumber(a.tokenomics.marketCap)
  const amount = toNumber(b.amountUsd)
  const perYear = cadencePerYear(b.cadence)

  let annualBuyback: number | null = null
  if (amount != null && perYear != null) {
    annualBuyback = amount * perYear
  } else {
    // Fall back to % of (annualized) revenue.
    const pct = toNumber(b.pctOfRevenue)
    const rev24h = toNumber(a.valueAccrual.revenue)
    if (pct != null && rev24h != null) annualBuyback = rev24h * 365 * (pct / 100)
  }

  const buybackYield = annualBuyback != null && mc ? (annualBuyback / mc) * 100 : null
  return { annualBuyback, buybackYield }
}

// ---- Derived upside (comps → X potential) ----------------------------------
export interface CompX {
  id: string
  label: string
  marketCap: number | null
  x: number | null
}
export interface UpsideDerived {
  currentMc: number | null
  comps: CompX[]
  targetX: number | null // from targetMc or explicit targetX
}

export function computeUpside(a: TokenAnalysis): UpsideDerived {
  const currentMc = toNumber(a.tokenomics.marketCap)
  const comps: CompX[] = (a.upside.comps || []).map((c) => {
    const compMc = toNumber(c.marketCap)
    return {
      id: c.id,
      label: c.name || c.ticker || '—',
      marketCap: compMc,
      x: compMc != null && currentMc ? compMc / currentMc : null,
    }
  })

  let targetX = toNumber(a.upside.targetX)
  if (targetX == null) {
    const targetMc = toNumber(a.upside.targetMc)
    if (targetMc != null && currentMc) targetX = targetMc / currentMc
  }

  return { currentMc, comps, targetX }
}

// ---- Red flags (from blocks 3 tokenomics & 4 value accrual) -----------------
export function collectRedFlags(a: TokenAnalysis): RedFlag[] {
  const flags: RedFlag[] = []
  const tk = computeTokenomics(a)
  const push = (
    severity: RedFlag['severity'],
    source: RedFlag['source'],
    title: string,
    detail: string,
  ) => flags.push({ id: `${source}:${title}`, severity, source, title, detail })

  // Tokenomics
  if (tk.unlock90dPct > 10) {
    push(
      'critical',
      'tokenomics',
      'Крупный анлок ≤ 90 дней',
      `Суммарный анлок ~${tk.unlock90dPct.toFixed(1)}% от circ supply в ближайшие 90 дней (> 10%). Навес предложения.`,
    )
  }
  if (tk.fdvMcRatio != null && tk.fdvMcRatio >= 3) {
    push(
      'warning',
      'tokenomics',
      'Высокий FDV / MC',
      `FDV в ${tk.fdvMcRatio.toFixed(1)}× выше Market Cap — много токенов ещё не в обращении.`,
    )
  }
  if (tk.pctCirculating != null && tk.pctCirculating < 20) {
    push(
      'warning',
      'tokenomics',
      'Мало в обращении',
      `В обращении лишь ~${tk.pctCirculating.toFixed(1)}% supply — значительная будущая эмиссия.`,
    )
  }
  if (tk.distFilled && tk.insiderPct > 45) {
    push(
      'warning',
      'tokenomics',
      'Много у инсайдеров',
      `Команда + инвесторы держат ~${tk.insiderPct.toFixed(0)}% (> 45%).`,
    )
  }
  if (tk.distFilled && Math.abs(tk.distSum - 100) > 0.5) {
    push(
      'info',
      'tokenomics',
      'Распределение ≠ 100%',
      `Сумма долей = ${tk.distSum.toFixed(1)}%. Проверьте разбивку.`,
    )
  }

  // Value accrual — weak if only governance / nothing / unset.
  const m = a.valueAccrual.mechanisms || []
  const onlyGov = m.length === 1 && m[0] === 'governance'
  const nothing = m.length === 0 || (m.length === 1 && m[0] === 'none')
  if (onlyGov || nothing) {
    push(
      'warning',
      'valueAccrual',
      'Слабый value accrual',
      nothing
        ? 'Держание токена ничего не даёт (нет механик начисления стоимости).'
        : 'Только governance — прямого начисления стоимости держателю нет.',
    )
  }

  return flags
}

// ---- Aggregate summary -----------------------------------------------------
export function computeSummary(a: TokenAnalysis): Summary {
  const contributions: BlockContribution[] = SCORED_BLOCKS.map((b) => {
    const score = clamp(a.scores[b.id] ?? 0, 0, 10)
    const weight = WEIGHTS[b.id]
    return { id: b.id, title: b.title, weight, score, points: (score * weight) / 100 }
  })

  const overall = round1(contributions.reduce((s, c) => s + c.points, 0)) // 0–10
  const redFlags = collectRedFlags(a)
  const verdict = deriveVerdict(overall)

  return { overall, contributions, redFlags, verdict }
}

function deriveVerdict(overall: number): Verdict {
  if (overall > VERDICT_THRESHOLDS.strong) {
    return { tier: 'strong', label: 'Сильный кандидат', tone: 'success' }
  }
  if (overall >= VERDICT_THRESHOLDS.medium) {
    return { tier: 'medium', label: 'Средний — с оговорками', tone: 'accent' }
  }
  return { tier: 'pass', label: 'Пас', tone: 'danger' }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function weightOf(id: ScoredBlockId): number {
  return WEIGHTS[id]
}
