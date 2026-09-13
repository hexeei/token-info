import { useEffect, useRef, useState } from 'react'
import Dashboard from './components/Dashboard'
import Editor from './components/Editor'
import { createEmptyAnalysis } from './config'
import { guessSector } from './lib/sectors'
import { clamp } from './lib/format'
import { fetchCoin } from './api/coingecko'
import { fetchProtocol } from './api/defillama'
import { loadAll, upsert, remove } from './lib/storage'
import type { TokenAnalysis, ScoredBlockId } from './types'
import type { CoinSearchHit } from './api/coingecko'

// Immutable set of a dotted path (objects & arrays cloned along the way).
function setIn<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) }
  let cur: any = clone
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
  return clone
}

function hasContent(a: TokenAnalysis): boolean {
  if (a.identity.ticker || a.identity.name) return true
  if (a.tokenomics.unlocks.length || a.upside.comps.length || a.valueAccrual.mechanisms.length) return true
  if (Object.values(a.notes).some((n) => n && n.trim())) return true
  if (Object.values(a.scores).some((s) => s !== 5)) return true
  return false
}

type View = 'dashboard' | 'editor'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [analysis, setAnalysis] = useState<TokenAnalysis>(() => createEmptyAnalysis())
  const [saved, setSaved] = useState<TokenAnalysis[]>(() => loadAll())
  const [loading, setLoading] = useState(false)
  const [fetchNote, setFetchNote] = useState<string | null>(null)
  const [savedFlag, setSavedFlag] = useState(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>()

  // ---- Autosave to LocalStorage on every change while editing ----
  useEffect(() => {
    if (view !== 'editor' || !hasContent(analysis)) return
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    setSavedFlag(false)
    autosaveRef.current = setTimeout(() => {
      const list = upsert(analysis)
      setSaved(list)
      setSavedFlag(true)
    }, 500)
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [analysis, view])

  // ---- state helpers ----
  function set(path: string, value: unknown) {
    setAnalysis((prev) => {
      let next = setIn(prev, path, value)
      if (prev.autoFields[path]) {
        const af = { ...prev.autoFields }
        delete af[path]
        next = { ...next, autoFields: af }
      }
      return next
    })
  }
  function setScore(id: ScoredBlockId, n: number) {
    setAnalysis((prev) => ({ ...prev, scores: { ...prev.scores, [id]: clamp(n, 0, 10) } }))
  }
  function setNote(id: ScoredBlockId, v: string) {
    setAnalysis((prev) => ({ ...prev, notes: { ...prev.notes, [id]: v } }))
  }
  const isAuto = (path: string) => !!analysis.autoFields[path]

  // ---- auto-fill from APIs ----
  async function handleSelect(coin: CoinSearchHit) {
    setLoading(true)
    setFetchNote(null)
    try {
      const cg = await fetchCoin(coin.id)
      const pairs: [string, unknown][] = []
      const auto: Record<string, boolean> = {}
      const push = (path: string, value: unknown) => {
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
        if (sector) push('sector.sector', sector)

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
      } else {
        push('identity.ticker', coin.symbol)
        push('identity.name', coin.name)
        push('identity.logo', coin.thumb)
        push('identity.coingeckoId', coin.id)
      }

      const llama = await fetchProtocol({
        symbol: cg.ok ? cg.symbol : coin.symbol,
        name: cg.ok ? cg.name : coin.name,
      })
      if (llama.ok && llama.matched) {
        push('valueAccrual.fees', llama.fees24h)
        push('valueAccrual.revenue', llama.revenue24h)
      }

      // Apply onto a fresh analysis so the previous token doesn't linger.
      setAnalysis(() => {
        let next = createEmptyAnalysis()
        for (const [path, value] of pairs) next = setIn(next, path, value)
        next.autoFields = auto
        return next
      })

      if (!cg.ok) setFetchNote('CoinGecko недоступен или лимит — заполнено из поиска, остальное вручную.')
      else if (!llama.matched) setFetchNote('Протокол не найден в DefiLlama — fees/revenue заполните вручную.')
      else setFetchNote(`Подтянуто: CoinGecko + DefiLlama (${llama.name}).`)
    } catch (e) {
      console.warn(e)
      setFetchNote('Не удалось подтянуть данные — заполните вручную.')
    } finally {
      setLoading(false)
    }
  }

  // ---- navigation / crud ----
  function handleNew() {
    setAnalysis(createEmptyAnalysis())
    setFetchNote(null)
    setSavedFlag(false)
    setView('editor')
  }
  function handleOpen(id: string) {
    const item = loadAll().find((x) => x.meta.id === id)
    if (item) {
      setAnalysis(item)
      setFetchNote(null)
      setSavedFlag(true)
      setView('editor')
      window.scrollTo({ top: 0 })
    }
  }
  function handleDelete(id: string) {
    setSaved(remove(id))
    if (analysis.meta.id === id) setAnalysis(createEmptyAnalysis())
  }
  function handleBack() {
    setSaved(loadAll())
    setView('dashboard')
  }

  useEffect(() => {
    if (!fetchNote) return
    const t = setTimeout(() => setFetchNote(null), 6000)
    return () => clearTimeout(t)
  }, [fetchNote])

  return (
    <div className="min-h-screen bg-bg-0">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-1 text-accent">
            <LogoIcon />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-primary">Token Research Checklist</h1>
            <p className="text-xs text-muted">Системный разбор токена перед добавлением в портфель</p>
          </div>
        </header>

        {view === 'dashboard' ? (
          <Dashboard items={saved} onNew={handleNew} onOpen={handleOpen} onDelete={handleDelete} />
        ) : (
          <Editor
            analysis={analysis}
            set={set}
            setScore={setScore}
            setNote={setNote}
            isAuto={isAuto}
            onSelect={handleSelect}
            loading={loading}
            fetchNote={fetchNote}
            onBack={handleBack}
            saved={savedFlag}
          />
        )}

        <footer className="mt-10 border-t border-bg-2 pt-4 text-center text-xs text-muted">
          Данные: CoinGecko + DefiLlama (публичные API, без ключей). Не финансовый совет — инструмент для собственного due diligence.
        </footer>
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 15l4-4 3 3 6.5-6.5" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18.5" cy="7.5" r="1.9" fill="var(--success)" />
    </svg>
  )
}
