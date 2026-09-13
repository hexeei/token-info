import type { TokenAnalysis } from '../types'
import { SCORED_BLOCKS, MECHANISMS, CADENCES } from '../config'
import {
  computeSummary,
  computeTokenomics,
  computeBuyback,
  computeUpside,
} from './scoring'
import { formatUsd, formatPct, formatX, formatPrice, formatDate } from './format'

export function toJson(a: TokenAnalysis): string {
  return JSON.stringify(a, null, 2)
}

export function toMarkdown(a: TokenAnalysis): string {
  const s = computeSummary(a)
  const tk = computeTokenomics(a)
  const bb = computeBuyback(a)
  const up = computeUpside(a)
  const id = a.identity
  const L: string[] = []

  L.push(`# Разбор токена: ${id.name || '—'} (${id.ticker || '—'})`)
  L.push('')
  L.push(`**Итоговый скор:** ${s.overall.toFixed(1)} / 10 — ${s.verdict.label}`)
  L.push(`**Дата:** ${formatDate(a.meta.updatedAt)}`)
  if (id.chain) L.push(`**Сеть:** ${id.chain}`)
  if (id.contract) L.push(`**Контракт:** \`${id.contract}\``)
  const links = [
    id.website && `[Сайт](${id.website})`,
    id.docs && `[Docs](${id.docs})`,
    id.twitter && `[X](${id.twitter})`,
  ].filter(Boolean)
  if (links.length) L.push(`**Ссылки:** ${links.join(' · ')}`)
  L.push('')

  // Scores table
  L.push('## Скоры по блокам')
  L.push('')
  L.push('| Блок | Скор | Вес |')
  L.push('| --- | ---: | ---: |')
  for (const c of s.contributions) L.push(`| ${c.title} | ${c.score}/10 | ${c.weight} |`)
  L.push('')

  // Sector
  L.push('## Сектор и нарратив')
  L.push(`- Сектор: ${a.sector.sector || '—'}`)
  if (a.sector.narrativeNote) L.push(`- Нарратив: ${a.sector.narrativeNote}`)
  if (a.notes.sector) L.push(`- Заметка: ${a.notes.sector}`)
  L.push('')

  // Tokenomics
  L.push('## Токеномика')
  L.push(`- Цена: ${formatPrice(a.tokenomics.price)}`)
  L.push(`- Market Cap: ${formatUsd(a.tokenomics.marketCap)} · FDV: ${formatUsd(a.tokenomics.fdv)}`)
  if (tk.fdvMcRatio != null) L.push(`- FDV/MC: ${formatX(tk.fdvMcRatio, 2)}`)
  if (tk.pctCirculating != null) L.push(`- В обращении: ${formatPct(tk.pctCirculating)}`)
  L.push(
    `- Supply: circ ${a.tokenomics.circulatingSupply || '—'} / total ${a.tokenomics.totalSupply || '—'} / max ${a.tokenomics.maxSupply || '—'}`,
  )
  if (tk.distFilled) {
    const d = a.tokenomics.distribution
    L.push(
      `- Распределение: команда ${d.team || 0}% · инвесторы ${d.investors || 0}% · комьюнити ${d.community || 0}% · казна ${d.treasury || 0}% · прочее ${d.other || 0}% (Σ ${tk.distSum.toFixed(1)}%)`,
    )
  }
  if (a.tokenomics.unlocks.length) {
    L.push('- Анлоки:')
    for (const u of a.tokenomics.unlocks) {
      L.push(`  - ${formatDate(u.date)}: ${u.amount || '—'} токенов${u.pctOfCirc ? ` (${u.pctOfCirc}% circ)` : ''}`)
    }
    L.push(`  - В ближайшие 90 дней: ${formatPct(tk.unlock90dPct)} от circ`)
  }
  if (a.notes.tokenomics) L.push(`- Заметка: ${a.notes.tokenomics}`)
  L.push('')

  // Value accrual
  L.push('## Value accrual')
  if (a.valueAccrual.revenueModel) L.push(`- Revenue model: ${a.valueAccrual.revenueModel}`)
  L.push(`- Fees (24ч): ${formatUsd(a.valueAccrual.fees)} · Revenue (24ч): ${formatUsd(a.valueAccrual.revenue)}`)
  const mechs = a.valueAccrual.mechanisms
    .map((m) => MECHANISMS.find((x) => x.id === m)?.label || m)
    .join(', ')
  L.push(`- Держание даёт: ${mechs || '—'}`)
  if (a.notes.valueAccrual) L.push(`- Заметка: ${a.notes.valueAccrual}`)
  L.push('')

  // Buyback
  L.push('## Байбек и сжигание')
  L.push(`- Байбек: ${a.buyback.hasBuyback === true ? 'да' : a.buyback.hasBuyback === false ? 'нет' : '—'}`)
  if (a.buyback.amountUsd)
    L.push(
      `- Размер: ${formatUsd(a.buyback.amountUsd)} ${CADENCES.find((c) => c.id === a.buyback.cadence)?.label || ''}`,
    )
  if (a.buyback.pctOfRevenue) L.push(`- % от выручки: ${a.buyback.pctOfRevenue}%`)
  if (bb.buybackYield != null) L.push(`- Buyback yield: ${formatPct(bb.buybackYield)} годовых от MC`)
  if (a.buyback.burnMechanics) L.push(`- Burn: ${a.buyback.burnMechanics}`)
  if (a.notes.buyback) L.push(`- Заметка: ${a.notes.buyback}`)
  L.push('')

  // Trend
  L.push('## Тренд')
  L.push(`- Направление: ${trendLabel(a.trend.direction)}`)
  L.push(
    `- 7д: ${formatPct(a.tokenomics.priceChange7d, { sign: true })} · 30д: ${formatPct(a.tokenomics.priceChange30d, { sign: true })} · от ATH: ${formatPct(a.tokenomics.athChangePct, { sign: true })}`,
  )
  if (a.trend.momentumNote) L.push(`- Momentum: ${a.trend.momentumNote}`)
  if (a.notes.trend) L.push(`- Заметка: ${a.notes.trend}`)
  L.push('')

  // Upside
  L.push('## Апсайд')
  if (a.upside.targetMc) L.push(`- Целевая MC: ${formatUsd(a.upside.targetMc)}`)
  if (up.targetX != null) L.push(`- Потенциал: ${formatX(up.targetX)}`)
  if (up.comps.length) {
    L.push('- Comps:')
    for (const c of up.comps) {
      L.push(`  - ${c.label}: ${formatUsd(c.marketCap)}${c.x != null ? ` → ${formatX(c.x)}` : ''}`)
    }
  }
  if (a.notes.upside) L.push(`- Заметка: ${a.notes.upside}`)
  L.push('')

  // Red flags
  L.push('## Ред-флаги')
  if (s.redFlags.length === 0) L.push('- Не обнаружено.')
  else for (const f of s.redFlags) L.push(`- **[${f.severity}]** ${f.title} — ${f.detail}`)
  L.push('')

  L.push('---')
  L.push('_Сгенерировано Token Research Checklist. Не финансовый совет._')

  // keep SCORED_BLOCKS referenced for future ordering guarantees
  void SCORED_BLOCKS
  return L.join('\n')
}

function trendLabel(d: string): string {
  return d === 'uptrend' ? 'Аптренд' : d === 'downtrend' ? 'Даунтренд' : d === 'range' ? 'Рейндж' : '—'
}

export function downloadFile(filename: string, content: string, mime: string) {
  try {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    console.warn('download failed', e)
  }
}

export function slugFor(a: TokenAnalysis): string {
  const base = a.identity.ticker || a.identity.name || 'token'
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'token'
}
