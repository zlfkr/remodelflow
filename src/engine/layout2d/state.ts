import type { LayoutState } from './types'

/**
 * Creates an initial empty layout state for the 2D layout designer.
 */
export function createInitialLayoutState(): LayoutState {
  return {
    room: {
      walls: [],
      width: 0,
      depth: 0,
    },
    placements: [],
  }
}
