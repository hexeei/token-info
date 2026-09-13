import type { TokenAnalysis, ScoredBlockId } from '../../types'

// Shared prop surface handed to every checklist block.
export interface BlockProps {
  a: TokenAnalysis
  set: (path: string, value: unknown) => void
  setScore: (id: ScoredBlockId, n: number) => void
  setNote: (id: ScoredBlockId, v: string) => void
  isAuto: (path: string) => boolean
}
