import type { TokenAnalysis } from '../types'

// LocalStorage-backed persistence. No backend.
const KEY = 'trc:analyses:v2'

export function loadAll(): TokenAnalysis[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.warn('Failed to read saved analyses', e)
    return []
  }
}

export function saveAll(list: TokenAnalysis[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch (e) {
    console.warn('Failed to persist analyses', e)
    return false
  }
}

/** Upsert one analysis by id (bumping updatedAt), returning the updated list. */
export function upsert(analysis: TokenAnalysis): TokenAnalysis[] {
  const list = loadAll()
  const stamped: TokenAnalysis = {
    ...analysis,
    meta: { ...analysis.meta, updatedAt: new Date().toISOString() },
  }
  const idx = list.findIndex((x) => x.meta.id === analysis.meta.id)
  if (idx >= 0) list[idx] = stamped
  else list.unshift(stamped)
  saveAll(list)
  return list
}

export function remove(id: string): TokenAnalysis[] {
  const list = loadAll().filter((x) => x.meta.id !== id)
  saveAll(list)
  return list
}
