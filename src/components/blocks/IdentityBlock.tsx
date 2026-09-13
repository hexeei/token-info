import { Block, Field, AutoBadge } from '../ui'
import type { BlockProps } from './blockProps'

// Block 1 — Identification. Mostly auto-filled, no score.
export default function IdentityBlock({ a, set, isAuto }: BlockProps) {
  const id = a.identity
  return (
    <Block index={1} title="Идентификация" subtitle="В основном подтягивается автоматически">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-bg-2 bg-bg-0">
          {id.logo ? (
            <img src={id.logo} alt={id.name} className="h-full w-full object-contain" />
          ) : (
            <span className="tabular text-lg font-semibold text-muted">
              {(id.ticker || '?').slice(0, 3)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-lg font-semibold text-primary">
              {id.name || 'Токен не выбран'}
            </span>
            <AutoBadge show={isAuto('identity.name')} />
          </div>
          <div className="tabular text-sm text-secondary">{id.ticker || '—'}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Тикер" value={id.ticker} onChange={(v) => set('identity.ticker', v)} auto={isAuto('identity.ticker')} mono />
        <Field label="Название" value={id.name} onChange={(v) => set('identity.name', v)} auto={isAuto('identity.name')} />
        <Field label="Сеть / чейн" value={id.chain} onChange={(v) => set('identity.chain', v)} auto={isAuto('identity.chain')} placeholder="Ethereum, Solana…" />
        <Field label="Контракт-адрес" value={id.contract} onChange={(v) => set('identity.contract', v)} auto={isAuto('identity.contract')} mono placeholder="0x… / mint" />
        <Field label="Сайт" value={id.website} onChange={(v) => set('identity.website', v)} auto={isAuto('identity.website')} placeholder="https://" />
        <Field label="Документация / WP" value={id.docs} onChange={(v) => set('identity.docs', v)} auto={isAuto('identity.docs')} placeholder="https://docs…" />
        <Field label="X / Twitter" value={id.twitter} onChange={(v) => set('identity.twitter', v)} auto={isAuto('identity.twitter')} placeholder="https://x.com/…" />
        <Field label="CoinGecko ID" value={id.coingeckoId} onChange={(v) => set('identity.coingeckoId', v)} auto={isAuto('identity.coingeckoId')} mono />
      </div>
    </Block>
  )
}
