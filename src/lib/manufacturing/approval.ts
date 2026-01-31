/**
 * Manufacturing approval helpers.
 * Dimension lock is session-scoped (gates Wall Editor width/height/X after approval).
 */

const DIMENSIONS_LOCKED_KEY = 'remodelflow_dimensions_locked'

export function getDimensionsLocked(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(DIMENSIONS_LOCKED_KEY) === '1'
  } catch {
    return false
  }
}

export function setDimensionsLocked(locked: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (locked) {
      sessionStorage.setItem(DIMENSIONS_LOCKED_KEY, '1')
    } else {
      sessionStorage.removeItem(DIMENSIONS_LOCKED_KEY)
    }
  } catch {
    // ignore
  }
}
