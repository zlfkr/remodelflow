/**
 * Types for 2D cabinet layout designer.
 * Minimal shape; extend when full layout engine is available.
 */

export interface LayoutState {
  room?: {
    walls?: Array<{ id: string; a: { x: number; y: number }; b: { x: number; y: number } }>
    width?: number
    depth?: number
  }
  placements?: Array<{
    id: string
    wallId?: string
    s?: number
    skuId?: string
    rot?: number
  }>
  [key: string]: unknown
}
