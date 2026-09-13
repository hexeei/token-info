import { useEffect, useRef, useState } from 'react'
import Dashboard from './components/Dashboard'
import Editor from './components/Editor'
import TokenSearch from './components/TokenSearch'
import { createEmptyAnalysis, SECTOR_LEADERS, newCompId } from './config'
import { guessSector } from './lib/sectors'
import { autoAnalyze } from './lib/autoAnalyze'
import { clamp } from './lib/format'
import { fetchCoin, fetchCompByTicker } from './api/coingecko'
import { fetchProtocol } from './api/defillama'
import { loadAll, upsert, remove } from './lib/storage'
import { importAnalysis } from './lib/importAnalysis'
import type { TokenAnalysis, ScoredBlockId, Comp } from './types'
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
  const [apiBase, setApiBase] = useState<string>(() => {
    try {
      return localStorage.getItem('trc:apiBase') || ''
    } catch {
      return ''
    }
  })
  const [showSettings, setShowSettings] = useState(false)
  function saveApiBase(v: string) {
    const clean = v.trim().replace(/\/$/, '')
    setApiBase(clean)
    try {
      localStorage.setItem('trc:apiBase', clean)
    } catch {
      /* ignore */
    }
  }
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
      // Backend path — if a research API is configured, let it fill EVERYTHING
      // (unlocks, buyback, distribution, value accrual) for any token.
      if (apiBase) {
        try {
          const r = await fetch(`${apiBase}/api/token?q=${encodeURIComponent(coin.id)}`)
          if (r.ok) {
            const data = await r.json()
            if (data && !data.error) {
              const imported = importAnalysis(data)
              setSaved(upsert(imported))
              setAnalysis(imported)
              setSavedFlag(true)
              setFetchNote(`Разбор собран бэкендом (все метрики): ${imported.identity.name}.`)
              setView('editor')
              return
            }
          }
          setFetchNote('Бэкенд не ответил — собираю из бесплатных API (deep-метрики вручную).')
        } catch (e) {
          console.warn('backend failed, falling back to client', e)
          setFetchNote('Бэкенд недоступен — собираю из бесплатных API (deep-метрики вручную).')
        }
      }

      const cg = await fetchCoin(coin.id)
      const pairs: [string, unknown][] = []
      const auto: Record<string, boolean> = {}
      let sectorGuess = ''
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

        sectorGuess = guessSector(cg.categories)
        if (sectorGuess) push('sector.sector', sectorGuess)

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

      // Auto-load sector leaders as upside comps → instant X-potential.
      const selfSym = (cg.ok ? cg.symbol : coin.symbol).toUpperCase()
      const leaderTickers = (SECTOR_LEADERS[sectorGuess] || [])
        .filter((t) => t.toUpperCase() !== selfSym)
        .slice(0, 2)
      const leaderData = await Promise.all(leaderTickers.map((t) => fetchCompByTicker(t)))
      const comps: Comp[] = leaderData
        .map((r, i) =>
          r.ok && r.marketCap != null
            ? {
                id: newCompId(),
                ticker: leaderTickers[i],
                name: r.name || leaderTickers[i],
                marketCap: String(r.marketCap),
                fdv: r.fdv != null ? String(r.fdv) : '',
              }
            : null,
        )
        .filter((c): c is Comp => c !== null)

      // Apply onto a fresh analysis so the previous token doesn't linger,
      // then auto-score / auto-note every block from the fetched data.
      setAnalysis(() => {
        let next = createEmptyAnalysis()
        for (const [path, value] of pairs) next = setIn(next, path, value)
        next.autoFields = auto
        if (comps.length) next.upside.comps = comps
        const suggestion = autoAnalyze(next)
        next.scores = { ...next.scores, ...suggestion.scores }
        next.notes = { ...next.notes, ...suggestion.notes }
        if (suggestion.trendDirection) next.trend.direction = suggestion.trendDirection
        return next
      })
      setView('editor')

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
  function handleImport(json: unknown) {
    try {
      const imported = importAnalysis(json)
      setSaved(upsert(imported))
      setAnalysis(imported)
      setSavedFlag(true)
      setFetchNote(null)
      setView('editor')
      window.scrollTo({ top: 0 })
    } catch (e) {
      console.warn('import failed', e)
      alert('Импорт не удался — проверьте структуру JSON.')
    }
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

        {/* Global search — type a ticker anywhere and get a filled analysis. */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <TokenSearch onSelect={handleSelect} loading={loading} />
            </div>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              title="Настройки бэкенда"
              className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm ${
                apiBase ? 'border-success/40 bg-success/10 text-success' : 'border-bg-2 bg-bg-1 text-secondary hover:text-primary'
              }`}
            >
              ⚙
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            {fetchNote ??
              (apiBase
                ? 'Бэкенд подключён — введите тикер, всё (включая анлоки и байбек) соберётся автоматически.'
                : 'Введите тикер — рынок/скоры заполнятся авто. Для анлоков/байбека на все токены подключите бэкенд (⚙).')}
          </p>

          {showSettings && (
            <div className="mt-3 rounded-xl border border-bg-2 bg-bg-1 px-4 py-3">
              <label className="block text-xs font-medium text-secondary">
                URL бэкенда (Cloudflare Worker)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={apiBase}
                  onChange={(e) => saveApiBase(e.target.value)}
                  placeholder="https://token-research-api.<subdomain>.workers.dev"
                  className="tabular w-full rounded-lg border border-bg-2 bg-bg-0 px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent/60 focus:outline-none"
                />
                {apiBase && (
                  <button
                    type="button"
                    onClick={() => saveApiBase('')}
                    className="rounded-lg border border-bg-2 px-3 py-2 text-sm text-muted hover:text-danger"
                  >
                    Сброс
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Разверни бэкенд по инструкции в <span className="tabular">worker/README.md</span> и вставь его URL сюда.
                Тогда сайт сам собирает ВСЕ метрики (рынок, выручка, анлоки, байбек, value accrual) на любой токен. Хранится в этом браузере.
              </p>
            </div>
          )}
        </div>

        {view === 'dashboard' ? (
          <Dashboard items={saved} onNew={handleNew} onOpen={handleOpen} onDelete={handleDelete} onImport={handleImport} />
        ) : (
          <Editor
            analysis={analysis}
            set={set}
            setScore={setScore}
            setNote={setNote}
            isAuto={isAuto}
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
