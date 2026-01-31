'use client'

import Link from 'next/link'
import type { WallCabinetPlacement } from '@/engine/wallElevation'

interface WallEditorProps {
  placements: WallCabinetPlacement[]
  onPlacementsChange: (p: WallCabinetPlacement[]) => void
  wallLabel: string
  onWallLabelChange: (s: string) => void
  scale: number
  onScaleChange: (n: number) => void
  showDimensions: boolean
  onShowDimensionsChange: (b: boolean) => void
  showLabels: boolean
  onShowLabelsChange: (b: boolean) => void
  addedPlacementIdToExpand?: string | null
  dimensionsLocked: boolean
  compact?: boolean
  summaryOnly?: boolean
  addButtonLabel?: string
  addButtonHref?: string
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  selectedPlacementId: string | null
  onSelectPlacement: (id: string | null) => void
}

export default function WallEditor({
  placements,
  onPlacementsChange,
  wallLabel,
  onWallLabelChange,
  scale,
  onScaleChange,
  showDimensions,
  onShowDimensionsChange,
  showLabels,
  onShowLabelsChange,
  dimensionsLocked,
  compact,
  summaryOnly,
  addButtonLabel,
  addButtonHref,
  onMoveUp,
  onMoveDown,
  selectedPlacementId,
  onSelectPlacement,
}: WallEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">
          Wall label
          <input
            type="text"
            value={wallLabel}
            onChange={(e) => onWallLabelChange(e.target.value)}
            disabled={dimensionsLocked}
            className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        {addButtonLabel && addButtonHref && (
          <Link
            href={addButtonHref}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {addButtonLabel}
          </Link>
        )}
      </div>
      {!summaryOnly && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Cabinets ({placements.length})</div>
          <ul className="space-y-1">
            {placements.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                  selectedPlacementId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPlacement(selectedPlacementId === p.id ? null : p.id)}
                  className="text-left font-medium text-gray-900"
                >
                  {p.cabinet_label}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveUp(p.id)}
                    disabled={i <= 0 || dimensionsLocked}
                    className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDown(p.id)}
                    disabled={i >= placements.length - 1 || dimensionsLocked}
                    className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {compact && (
        <p className="text-xs text-gray-500">
          Scale: {scale} px/in · Dimensions: {showDimensions ? 'on' : 'off'} · Labels: {showLabels ? 'on' : 'off'}
        </p>
      )}
    </div>
  )
}
