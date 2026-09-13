// LocalStorage-backed persistence for saved analyses. No backend.

const KEY = 'trc:analyses:v1'

export function loadAll() {
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

export function saveAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch (e) {
    console.warn('Failed to persist analyses', e)
    return false
  }
}

// Upsert one analysis by id, returning the updated list.
export function upsert(analysis) {
  const list = loadAll()
  const stamped = { ...analysis, updatedAt: new Date().toISOString() }
  const idx = list.findIndex((x) => x.id === analysis.id)
  if (idx >= 0) list[idx] = stamped
  else list.unshift(stamped)
  saveAll(list)
  return { list, saved: stamped }
}

export function remove(id) {
  const list = loadAll().filter((x) => x.id !== id)
  saveAll(list)
  return list
}
