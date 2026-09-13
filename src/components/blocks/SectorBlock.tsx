import { Block, Select, TextArea, ScoreSlider } from '../ui'
import { SECTORS } from '../../config'
import type { BlockProps } from './blockProps'

// Block 2 — Sector & narrative.
export default function SectorBlock({ a, set, setScore, setNote, isAuto }: BlockProps) {
  return (
    <Block index={2} title="Сектор и нарратив" subtitle="Насколько сектор в фокусе рынка сейчас">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Сектор"
          value={a.sector.sector}
          onChange={(v) => set('sector.sector', v)}
          options={SECTORS as unknown as string[]}
          auto={isAuto('sector.sector')}
          placeholder="Выбрать сектор"
        />
        <div className="rounded-lg border border-bg-2 bg-bg-0 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-muted">Подсказка</div>
          <div className="mt-1 text-xs text-secondary">
            Сектор предзаполнен из категорий CoinGecko — проверьте и уточните при
            необходимости.
          </div>
        </div>
      </div>

      <div className="mt-3">
        <TextArea
          label="Текущий нарратив"
          value={a.sector.narrativeNote}
          onChange={(v) => set('sector.narrativeNote', v)}
          placeholder="В фокусе ли сектор сейчас? Приток внимания/ликвидности, свежие катализаторы, ротация капитала в нарратив?"
        />
      </div>

      <ScoreSlider
        score={a.scores.sector}
        onScore={(n) => setScore('sector', n)}
        note={a.notes.sector}
        onNote={(v) => setNote('sector', v)}
        notePlaceholder="Аргументация скора силы нарратива…"
      />
    </Block>
  )
}
