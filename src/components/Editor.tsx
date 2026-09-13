import Summary from './Summary'
import IdentityBlock from './blocks/IdentityBlock'
import SectorBlock from './blocks/SectorBlock'
import TokenomicsBlock from './blocks/TokenomicsBlock'
import ValueAccrualBlock from './blocks/ValueAccrualBlock'
import BuybackBlock from './blocks/BuybackBlock'
import TrendBlock from './blocks/TrendBlock'
import UpsideBlock from './blocks/UpsideBlock'
import { computeSummary } from '../lib/scoring'
import type { BlockProps } from './blocks/blockProps'
import type { TokenAnalysis, ScoredBlockId } from '../types'

export default function Editor({
  analysis,
  set,
  setScore,
  setNote,
  isAuto,
  onBack,
  saved,
}: {
  analysis: TokenAnalysis
  set: (path: string, value: unknown) => void
  setScore: (id: ScoredBlockId, n: number) => void
  setNote: (id: ScoredBlockId, v: string) => void
  isAuto: (path: string) => boolean
  onBack: () => void
  saved: boolean
}) {
  const summary = computeSummary(analysis)
  const autoPrefilled = Object.keys(analysis.autoFields).length > 0
  const blockProps: BlockProps = { a: analysis, set, setScore, setNote, isAuto }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-bg-2 bg-bg-1 px-3 py-2 text-sm text-secondary hover:border-accent/40 hover:text-primary"
        >
          ← К списку
        </button>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${saved ? 'bg-success' : 'bg-muted'}`} />
          {saved ? 'Автосохранено' : 'Черновик'}
        </span>
      </div>

      {autoPrefilled && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-xs text-accent">
          Скоры, заметки и тренд предзаполнены автоматически по данным CoinGecko/DefiLlama —
          проверьте и скорректируйте под свой взгляд. Байбек и распределение обычно нужно
          заполнить вручную.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <main className="space-y-4">
          <IdentityBlock {...blockProps} />
          <SectorBlock {...blockProps} />
          <TokenomicsBlock {...blockProps} />
          <ValueAccrualBlock {...blockProps} />
          <BuybackBlock {...blockProps} />
          <TrendBlock {...blockProps} />
          <UpsideBlock {...blockProps} />
        </main>

        <aside>
          <Summary analysis={analysis} summary={summary} />
        </aside>
      </div>
    </div>
  )
}
