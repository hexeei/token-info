import { useEffect, useMemo, useState } from 'react'
import TokenSearch from './components/TokenSearch.jsx'
import Summary from './components/Summary.jsx'
import SavedList from './components/SavedList.jsx'
import IdentityBlock from './components/blocks/IdentityBlock.jsx'
import NarrativeBlock from './components/blocks/NarrativeBlock.jsx'
import TokenomicsBlock from './components/blocks/TokenomicsBlock.jsx'
import TeamBlock from './components/blocks/TeamBlock.jsx'
import ProductBlock from './components/blocks/ProductBlock.jsx'
import LiquidityBlock from './components/blocks/LiquidityBlock.jsx'
import RiskBlock from './components/blocks/RiskBlock.jsx'
import ValuationBlock from './components/blocks/ValuationBlock.jsx'
import { createEmptyAnalysis, computeSummary, clamp } from './lib/scoring.js'
import { guessSector } from './lib/sectors.js'
import { fetchCoin } from './api/coingecko.js'
import { fetchProtocol } from './api/defillama.js'
import { loadAll, upsert, remove } from './lib/storage.js'

// Immutable set of a dotted path (objects and arrays cloned along the way).
function setIn(obj, path, value) {
  const keys = path.split('.')
  const clone = Array.isArray(obj) ? [...obj] : { ...obj }
  let cur = clone
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
  return clone
}

export default function App() {
  const [analysis, setAnalysis] = useState(() => createEmptyAnalysis())
  const [saved, setSaved] = useState(() => loadAll())
  const [loading, setLoading] = useState(false)
  const [fetchNote, setFetchNote] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const summary = useMemo(() => computeSummary(analysis), [analysis])

  // ---- state helpers -------------------------------------------------------
  function set(path, value) {
    setAnalysis((prev) => {
      let next = setIn(prev, path, value)
      // Editing an auto-filled field drops its "auto" badge.
      if (prev.autoFields[path]) {
        const af = { ...prev.autoFields }
        delete af[path]
        next = { ...next, autoFields: af }
      }
      return next
    })
  }
  function setScore(id, n) {
    setAnalysis((prev) => ({ ...prev, scores: { ...prev.scores, [id]: clamp(n, 0, 10) } }))
  }
  function setNote(id, v) {
    setAnalysis((prev) => ({ ...prev, notes: { ...prev.notes, [id]: v } }))
  }
  function isAuto(path) {
    return !!analysis.autoFields[path]
  }

  // ---- auto-fill from APIs --------------------------------------------------
  async function handleSelect(coin) {
    setLoading(true)
    setFetchNote(null)
    try {
      const cg = await fetchCoin(coin.id)
      const pairs = []
      const auto = {}
      const push = (path, value) => {
        if (value === null || value === undefined || value === '') return
        pairs.push([path, value])
        auto[path] = true
      }

      if (cg.ok) {
        push('identity.ticker', cg.symbol)
        push('identity.name', cg.name)
        push('identity.logo', cg.logo)
        push('identity.coingeckoId', cg.id)
        push('identity.chain', cg.chain)
        push('identity.contract', cg.contract)
        push('identity.website', cg.website)
        push('identity.docs', cg.docs)
        push('identity.twitter', cg.twitter)

        const sector = guessSector(cg.categories)
        if (sector) push('narrative.sector', sector)

        push('tokenomics.price', cg.price)
        push('tokenomics.marketCap', cg.marketCap)
        push('tokenomics.fdv', cg.fdv)
        push('tokenomics.circulatingSupply', cg.circulatingSupply)
        push('tokenomics.totalSupply', cg.totalSupply)
        push('tokenomics.maxSupply', cg.maxSupply)
        push('tokenomics.ath', cg.ath)
        push('tokenomics.athChangePct', cg.athChangePct)
        push('tokenomics.priceChange7d', cg.priceChange7d)
        push('tokenomics.priceChange30d', cg.priceChange30d)
        push('liquidity.volume24h', cg.volume24h)
      } else {
        // Fall back to the lightweight search hit so identity isn't empty.
        push('identity.ticker', coin.symbol)
        push('identity.name', coin.name)
        push('identity.logo', coin.thumb)
        push('identity.coingeckoId', coin.id)
      }

      // DefiLlama — best-effort protocol match for TVL / revenue / fees.
      const llama = await fetchProtocol({ symbol: cg.ok ? cg.symbol : coin.symbol, name: cg.ok ? cg.name : coin.name })
      if (llama?.ok && llama.matched) {
        push('product.tvl', llama.tvl)
        push('product.fees', llama.fees24h)
        push('product.revenue', llama.revenue24h)
      }

      // Apply onto a fresh analysis so a previous token's data doesn't linger.
      setAnalysis((prev) => {
        let next = createEmptyAnalysis()
        // keep a stable id per session-new analysis; already fresh
        for (const [path, value] of pairs) next = setIn(next, path, value)
        next.autoFields = auto
        return next
      })

      if (!cg.ok) {
        setFetchNote('CoinGecko недоступен или лимит — заполнено из поиска, остальное вручную.')
      } else if (!llama?.matched) {
        setFetchNote('Протокол не найден в DefiLlama — TVL/revenue заполните вручную.')
      } else {
        setFetchNote(`Подтянуто: CoinGecko + DefiLlama (${llama.name}).`)
      }
    } catch (e) {
      console.warn(e)
      setFetchNote('Не удалось подтянуть данные — заполните вручную.')
    } finally {
      setLoading(false)
    }
  }

  // ---- saved analyses -------------------------------------------------------
  function handleSave() {
    const { list } = upsert(analysis)
    setSaved(list)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
  }
  function handleNew() {
    setAnalysis(createEmptyAnalysis())
    setFetchNote(null)
  }
  function handleOpen(id) {
    const item = saved.find((x) => x.id === id)
    if (item) {
      setAnalysis(item)
      setFetchNote(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
  function handleDelete(id) {
    const list = remove(id)
    setSaved(list)
    if (analysis.id === id) setAnalysis(createEmptyAnalysis())
  }

  // Keep the "auto" note visible only briefly-ish; clears on token change.
  useEffect(() => {
    if (!fetchNote) return
    const t = setTimeout(() => setFetchNote(null), 6000)
    return () => clearTimeout(t)
  }, [fetchNote])

  const blockProps = { a: analysis, set, setScore, setNote, isAuto }

  return (
    <div className="min-h-screen bg-bg-0">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-1 text-accent">
                <LogoIcon />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-primary">Token Research Checklist</h1>
                <p className="text-xs text-muted">
                  Системный разбор токена перед добавлением в портфель
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNew}
                className="rounded-lg border border-bg-2 bg-bg-1 px-3 py-2 text-sm text-secondary hover:border-accent/40 hover:text-primary"
              >
                Новый разбор
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  savedFlash
                    ? 'bg-success text-bg-0'
                    : 'bg-accent text-bg-0 hover:opacity-90'
                }`}
              >
                {savedFlash ? '✓ Сохранено' : 'Сохранить'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <TokenSearch onSelect={handleSelect} loading={loading} />
            {fetchNote && <p className="mt-2 text-xs text-secondary">{fetchNote}</p>}
          </div>
        </header>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <main className="space-y-4">
            <IdentityBlock {...blockProps} />
            <NarrativeBlock {...blockProps} />
            <TokenomicsBlock {...blockProps} />
            <TeamBlock {...blockProps} />
            <ProductBlock {...blockProps} />
            <LiquidityBlock {...blockProps} />
            <RiskBlock {...blockProps} />
            <ValuationBlock {...blockProps} />
          </main>

          <aside className="space-y-4">
            <Summary summary={summary} ticker={analysis.identity.ticker} />

            <section className="rounded-2xl border border-bg-2 bg-bg-1 px-4 py-4">
              <h2 className="mb-3 text-sm font-semibold text-primary">
                Сохранённые разборы
                {saved.length > 0 && <span className="tabular text-muted"> · {saved.length}</span>}
              </h2>
              <SavedList
                items={saved}
                currentId={analysis.id}
                onOpen={handleOpen}
                onDelete={handleDelete}
              />
            </section>
          </aside>
        </div>

        <footer className="mt-10 border-t border-bg-2 pt-4 text-center text-xs text-muted">
          Данные: CoinGecko + DefiLlama (публичные API, без ключей). Не финансовый совет —
          инструмент для собственного due diligence.
        </footer>
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 15l4-4 3 3 6.5-6.5"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="7.5" r="1.9" fill="var(--success)" />
    </svg>
  )
}
