'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import WallEditor from '@/components/wall/WallEditor'
import WallSvgPreview from '@/components/wall/WallSvgPreview'
import { WallCabinetPlacement, WallElevationInput } from '@/engine/wallElevation'
import { generateWallElevation } from '@/engine/wallElevation'

export default function WallElevationPage() {
  // Default wall with 3 cabinets
  const [placements, setPlacements] = useState<WallCabinetPlacement[]>([
    {
      id: 'cab1',
      cabinet_label: 'B24-FF-01',
      x_from_left_in: 0,
      cabinet_width_in: 24,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'face_frame',
      shelves: 1,
      opening: {
        drawer_openings: 0,
        door_openings: 2,
        reveal_gap_in: 0.125,
      },
      face_frame: {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
    {
      id: 'cab2',
      cabinet_label: 'B30-FF-01',
      x_from_left_in: 24,
      cabinet_width_in: 30,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'face_frame',
      shelves: 0,
      opening: {
        drawer_openings: 3,
        door_openings: 0,
        top_drawer_height_in: 6,
        middle_drawer_height_in: 6,
        remaining_drawer_height_in: 6,
        reveal_gap_in: 0.125,
      },
      face_frame: {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
    {
      id: 'cab3',
      cabinet_label: 'W30-FL-01',
      x_from_left_in: 60,
      cabinet_width_in: 30,
      cabinet_height_in: 30,
      cabinet_depth_in: 12,
      type: 'wall',
      construction: 'frameless',
      shelves: 2,
      opening: {
        drawer_openings: 0,
        door_openings: 2,
        reveal_gap_in: 0,
      },
      face_frame: {
        enabled: false,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
  ])

  const [wallLabel, setWallLabel] = useState('Kitchen Wall')
  const [scale, setScale] = useState(20)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastGoodSvg, setLastGoodSvg] = useState<string | null>(null)
  const [lastGoodMeta, setLastGoodMeta] = useState<{
    width_px: number
    height_px: number
    cabinetFrames: Array<{
      id: string
      cabinet_label: string
      x_px: number
      y_px: number
      width_px: number
      height_px: number
    }>
    warnings: string[]
  } | null>(null)

  // Parse error message for user-friendly display
  const parseError = (errorMessage: string): { message: string; hint?: string } => {
    if (errorMessage.startsWith('cabinet_overlap:')) {
      const parts = errorMessage.split(':')
      if (parts.length >= 3) {
        const id1 = parts[1]
        const id2 = parts[2]
        return {
          message: errorMessage,
          hint: `Cabinets overlap: ${id1} and ${id2}. Adjust X positions or widths.`,
        }
      }
    }
    return { message: errorMessage }
  }

  // Compute wall elevation with last-good fallback
  const wallResult = useMemo(() => {
    try {
      setLastError(null)
      const input: WallElevationInput = {
        wall_label: wallLabel,
        placements,
        scale_px_per_in: scale,
        show_dimensions: showDimensions,
        show_labels: showLabels,
        align_bottoms: true,
      }
      const result = generateWallElevation(input)
      // Update last-good state on success
      setLastGoodSvg(result.svg)
      setLastGoodMeta({
        width_px: result.width_px,
        height_px: result.height_px,
        cabinetFrames: result.cabinetFrames,
        warnings: result.warnings,
      })
      return result
    } catch (error: any) {
      const errorInfo = parseError(error.message || 'Failed to generate wall elevation')
      setLastError(errorInfo.message)
      // Return null to trigger fallback to last-good render
      return null
    }
  }, [placements, wallLabel, scale, showDimensions, showLabels])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Wall Elevation Builder</h1>
          <Link
            href="/cabinet-builder"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            Single Cabinet Builder →
          </Link>
        </div>

        {lastError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm font-medium mb-1">Error: {lastError}</p>
            {lastError.startsWith('cabinet_overlap:') && (
              <p className="text-red-700 text-sm">
                {parseError(lastError).hint || 'Cabinets overlap. Adjust X positions or widths.'}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Wall Configuration</h2>
            <WallEditor
              placements={placements}
              onPlacementsChange={setPlacements}
              wallLabel={wallLabel}
              onWallLabelChange={setWallLabel}
              scale={scale}
              onScaleChange={setScale}
              showDimensions={showDimensions}
              onShowDimensionsChange={setShowDimensions}
              showLabels={showLabels}
              onShowLabelsChange={setShowLabels}
            />
          </div>

          {/* Right: Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Wall Elevation Preview</h2>
            {wallResult ? (
              <>
                <WallSvgPreview svg={wallResult.svg} width={wallResult.width_px} height={wallResult.height_px} />
                {wallResult.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                      {wallResult.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 text-sm text-gray-600">
                  <p>Canvas: {wallResult.width_px} × {wallResult.height_px} px</p>
                  <p>Cabinets: {wallResult.cabinetFrames.length}</p>
                </div>
              </>
            ) : lastGoodSvg && lastGoodMeta ? (
              <>
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  Showing last valid render (fix errors above to update)
                </div>
                <WallSvgPreview svg={lastGoodSvg} width={lastGoodMeta.width_px} height={lastGoodMeta.height_px} />
                {lastGoodMeta.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                      {lastGoodMeta.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 text-sm text-gray-600">
                  <p>Canvas: {lastGoodMeta.width_px} × {lastGoodMeta.height_px} px</p>
                  <p>Cabinets: {lastGoodMeta.cabinetFrames.length}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {lastError ? 'Error generating wall elevation' : 'Loading...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
