import { toNumber, daysUntil } from './format.js'

// The scored blocks and their weights (sum = 100).
// `risk` is scored so that HIGHER = safer (lower risk), keeping the slider
// semantics consistent across every block: more = better.
export const SCORED_BLOCKS = [
  { id: 'narrative', title: 'Сектор и нарратив', weight: 12 },
  { id: 'tokenomics', title: 'Токеномика', weight: 22 },
  { id: 'team', title: 'Команда и бэкеры', weight: 14 },
  { id: 'product', title: 'Продукт и трэкшн', weight: 18 },
  { id: 'liquidity', title: 'Ликвидность и рынок', weight: 10 },
  { id: 'risk', title: 'Риски (выше = безопаснее)', weight: 14 },
  { id: 'valuation', title: 'Оценка и апсайд', weight: 10 },
]

export function createEmptyAnalysis() {
  const now = new Date().toISOString()
  return {
    id: cryptoId(),
    createdAt: now,
    updatedAt: now,
    identity: {
      ticker: '',
      name: '',
      logo: '',
      coingeckoId: '',
      chain: '',
      contract: '',
      website: '',
      docs: '',
      twitter: '',
    },
    narrative: { sector: '' },
    tokenomics: {
      totalSupply: '',
      circulatingSupply: '',
      maxSupply: '',
      fdv: '',
      marketCap: '',
      price: '',
      priceChange7d: '',
      priceChange30d: '',
      ath: '',
      athChangePct: '',
      distribution: { team: '', investors: '', community: '', treasury: '', other: '' },
      unlocks: [],
    },
    team: { backers: '' },
    product: { tvl: '', revenue: '', fees: '', users: '' },
    liquidity: { volume24h: '' },
    risk: {},
    valuation: { targetMultiple: '', comparables: '' },
    scores: {
      narrative: 5,
      tokenomics: 5,
      team: 5,
      product: 5,
      liquidity: 5,
      risk: 5,
      valuation: 5,
    },
    notes: {
      narrative: '',
      tokenomics: '',
      team: '',
      product: '',
      liquidity: '',
      risk: '',
      valuation: '',
    },
    // Map of dotted field paths that were auto-filled from an API.
    autoFields: {},
  }
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'a_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- Derived tokenomics metrics -------------------------------------------

export function computeTokenomics(a) {
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
  const distKeys = ['team', 'investors', 'community', 'treasury', 'other']
  const distValues = distKeys.map((k) => toNumber(d[k]) ?? 0)
  const distSum = distValues.reduce((s, v) => s + v, 0)
  const distFilled = distKeys.some((k) => toNumber(d[k]) != null)
  const insiderPct = (toNumber(d.team) ?? 0) + (toNumber(d.investors) ?? 0)

  // Unlocks in the next 90 days as a share of circulating supply.
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
    unlock90dPct: unlock90dPct || 0,
    unlock90dTokens,
  }
}

// ---- Red flags -------------------------------------------------------------
// severity: 'critical' (hard risk), 'warning' (watch), 'info' (context).

export function collectRedFlags(a) {
  const flags = []
  const tk = computeTokenomics(a)

  if (tk.unlock90dPct > 10) {
    flags.push({
      severity: 'critical',
      title: 'Крупный анлок в ближайшие 90 дней',
      detail: `Суммарный анлок ~${tk.unlock90dPct.toFixed(1)}% от circ supply в течение 90 дней (> 10%). Навес предложения давит на цену.`,
    })
  }

  if (tk.fdvMcRatio != null && tk.fdvMcRatio >= 3) {
    flags.push({
      severity: 'warning',
      title: 'Высокий FDV / MC',
      detail: `FDV в ${tk.fdvMcRatio.toFixed(1)}× выше Market Cap — большая часть токенов ещё не в обращении (будущий навес).`,
    })
  }

  if (tk.pctCirculating != null && tk.pctCirculating < 20) {
    flags.push({
      severity: 'warning',
      title: 'Мало токенов в обращении',
      detail: `В обращении лишь ~${tk.pctCirculating.toFixed(1)}% supply — значительная будущая эмиссия.`,
    })
  }

  if (tk.distFilled && tk.insiderPct > 45) {
    flags.push({
      severity: 'warning',
      title: 'Высокая доля инсайдеров',
      detail: `Команда + инвесторы держат ~${tk.insiderPct.toFixed(0)}% распределения (> 45%).`,
    })
  }

  if (tk.distFilled && Math.abs(tk.distSum - 100) > 0.5) {
    flags.push({
      severity: 'info',
      title: 'Распределение не даёт 100%',
      detail: `Сумма долей = ${tk.distSum.toFixed(1)}%. Проверьте разбивку токеномики.`,
    })
  }

  if ((a.scores.risk ?? 5) <= 3) {
    flags.push({
      severity: 'warning',
      title: 'Низкий скор по рискам',
      detail: `Ручная оценка рисков ${a.scores.risk}/10 — см. заметку в блоке «Риски».`,
    })
  }

  const athDown = toNumber(a.tokenomics.athChangePct)
  if (athDown != null && athDown <= -90) {
    flags.push({
      severity: 'info',
      title: 'Глубоко ниже ATH',
      detail: `Цена ниже ATH на ${Math.abs(athDown).toFixed(0)}%. Либо реповивка, либо структурный даунтренд — проверьте нарратив и трэкшн.`,
    })
  }

  return flags
}

// ---- Aggregate summary -----------------------------------------------------

export function computeSummary(a) {
  const contributions = SCORED_BLOCKS.map((b) => {
    const score = clamp(a.scores[b.id] ?? 0, 0, 10)
    return {
      id: b.id,
      title: b.title,
      weight: b.weight,
      score,
      points: (score * b.weight) / 10, // out of `weight`
    }
  })

  // Weights sum to 100, scores are 0..10 → overall is 0..100.
  const overallScore = Math.round(contributions.reduce((s, c) => s + c.points, 0))

  const redFlags = collectRedFlags(a)
  const criticalCount = redFlags.filter((f) => f.severity === 'critical').length

  const verdict = deriveVerdict(overallScore, criticalCount)

  return { overallScore, contributions, redFlags, criticalCount, verdict }
}

function deriveVerdict(score, criticalCount) {
  // A critical flag caps the verdict — never "strong" while a hard risk stands.
  let tier
  if (score >= 75) tier = 'strong'
  else if (score >= 60) tier = 'watch'
  else if (score >= 45) tier = 'neutral'
  else tier = 'weak'

  if (criticalCount > 0 && (tier === 'strong' || tier === 'watch')) {
    tier = 'watch'
  }

  const map = {
    strong: { label: 'Сильный кандидат', tone: 'success' },
    watch: { label: 'Интересно, но с оговорками', tone: 'accent' },
    neutral: { label: 'Нейтрально — нужно больше данных', tone: 'muted' },
    weak: { label: 'Слабо — скорее пропустить', tone: 'danger' },
  }
  const base = map[tier]
  if (criticalCount > 0) {
    return { ...base, label: base.label + ` · ${criticalCount} крит. флаг${plural(criticalCount)}` }
  }
  return base
}

function plural(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return ''
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'а'
  return 'ов'
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}
