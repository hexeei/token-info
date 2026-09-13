import { useEffect, useRef, useState } from 'react'
import { searchCoins } from '../api/coingecko'
import type { CoinSearchHit } from '../api/coingecko'

// Ticker/name input with debounced CoinGecko autocomplete.
export default function TokenSearch({
  onSelect,
  loading,
}: {
  onSelect: (coin: CoinSearchHit) => void
  loading?: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CoinSearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const r = await searchCoins(q)
      setResults(r)
      setOpen(true)
      setActiveIdx(-1)
      setSearching(false)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function choose(coin: CoinSearchHit) {
    setQuery(`${coin.name} (${coin.symbol})`)
    setOpen(false)
    onSelect(coin)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[activeIdx] || results[0]
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-bg-2 bg-bg-1 px-3 py-2.5 focus-within:border-accent/60">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Тикер или название токена — напр. ARB, Ethereum, jupiter"
          className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
        />
        {(searching || loading) && <Spinner />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-bg-2 bg-bg-1 py-1 shadow-2xl shadow-black/40">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === activeIdx ? 'bg-bg-2' : ''}`}
              >
                {c.thumb ? (
                  <img src={c.thumb} alt="" className="h-6 w-6 rounded-full" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-bg-2" />
                )}
                <span className="flex-1 truncate text-sm text-primary">{c.name}</span>
                <span className="tabular text-xs text-secondary">{c.symbol}</span>
                {c.rank && <span className="tabular text-[11px] text-muted">#{c.rank}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !searching && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-bg-2 bg-bg-1 px-3 py-3 text-sm text-muted">
          Ничего не найдено (или лимит CoinGecko). Заполните поля вручную.
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="11" cy="11" r="7" stroke="var(--text-muted)" strokeWidth="2" />
      <path d="M20 20l-3.5-3.5" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
