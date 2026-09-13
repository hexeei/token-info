import type { TokenAnalysis } from '../types'
import { createEmptyAnalysis, SCHEMA_VERSION, newUnlockId, newCompId } from '../config'
import { autoAnalyze } from './autoAnalyze'

function isObj(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}

// Deep-merge source onto base: objects merge recursively, arrays/primitives replace.
function deepMerge<T>(base: T, src: unknown): T {
  if (!isObj(src)) return (src === undefined ? base : (src as T))
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) }
  for (const k of Object.keys(src)) {
    const bv = out[k]
    const sv = (src as any)[k]
    out[k] = isObj(bv) && isObj(sv) ? deepMerge(bv, sv) : sv
  }
  return out as T
}

/**
 * Turn loosely-shaped JSON (e.g. a research export) into a valid analysis:
 * merges onto an empty analysis, backfills ids, stamps fresh meta, and
 * auto-scores from the rubric if the JSON didn't set scores.
 */
export function importAnalysis(json: unknown): TokenAnalysis {
  const base = createEmptyAnalysis()
  const merged = deepMerge(base, json) as TokenAnalysis

  // Fresh identity / meta — never reuse an incoming id.
  merged.meta = {
    id: base.meta.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  }

  // Backfill ids on nested rows.
  merged.tokenomics.unlocks = (merged.tokenomics.unlocks || []).map((u) => ({
    ...u,
    id: u.id || newUnlockId(),
  }))
  merged.upside.comps = (merged.upside.comps || []).map((c) => ({
    ...c,
    id: c.id || newCompId(),
  }))

  // Guarantee full scores/notes objects.
  merged.scores = { ...base.scores, ...(merged.scores || {}) }
  merged.notes = { ...base.notes, ...(merged.notes || {}) }
  merged.autoFields = merged.autoFields || {}

  // If the import left scores at defaults, derive them from the data — but keep
  // any notes the payload already provided (backend research notes are richer).
  const allDefault = Object.values(merged.scores).every((s) => s === 5)
  if (allDefault) {
    const sug = autoAnalyze(merged)
    merged.scores = { ...merged.scores, ...sug.scores }
    for (const k of Object.keys(sug.notes) as (keyof typeof sug.notes)[]) {
      if (!merged.notes[k] && sug.notes[k]) merged.notes[k] = sug.notes[k] as string
    }
    if (sug.trendDirection && !merged.trend.direction) merged.trend.direction = sug.trendDirection
  }

  return merged
}
