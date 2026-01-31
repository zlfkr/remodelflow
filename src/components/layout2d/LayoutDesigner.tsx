'use client'

import Link from 'next/link'
import type { LayoutState } from '@/engine/layout2d/types'

interface LayoutDesignerProps {
  projectId: string
  initialLayout?: LayoutState
  onLayoutChange: (layout: LayoutState) => void
}

/**
 * Placeholder for 2D cabinet layout designer. Opens full Wall Elevation editor for this project.
 */
export default function LayoutDesigner({
  projectId,
  initialLayout,
  onLayoutChange,
}: LayoutDesignerProps) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
      <p className="text-sm font-medium text-gray-700">2D Layout Designer</p>
      <p className="mt-1 text-sm text-gray-500">
        Project: {projectId}. Use the full Wall Elevation editor to place and edit cabinets.
      </p>
      {initialLayout != null && (
        <p className="mt-2 text-xs text-gray-500">
          Layout loaded ({typeof initialLayout === 'object' ? 'object' : typeof initialLayout}).
        </p>
      )}
      <Link
        href={`/wall-elevation?projectId=${encodeURIComponent(projectId)}`}
        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Open full Wall Elevation editor →
      </Link>
    </div>
  )
}
