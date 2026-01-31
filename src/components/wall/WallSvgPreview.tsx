'use client'

interface CabinetFrame {
  id: string
  cabinet_label: string
  x_px: number
  y_px: number
  width_px: number
  height_px: number
}

interface WallSvgPreviewProps {
  svg: string
  width: number
  height: number
  selectedPlacementId?: string | null
  cabinetFrames?: CabinetFrame[]
}

export default function WallSvgPreview({
  svg,
  width,
  height,
  selectedPlacementId,
  cabinetFrames,
}: WallSvgPreviewProps) {
  return (
    <div
      className="overflow-auto rounded border border-gray-200 bg-white"
      style={{ maxWidth: '100%' }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ width, height, minWidth: width, minHeight: height }}
        data-selected-id={selectedPlacementId ?? undefined}
        data-cabinet-frames={cabinetFrames ? JSON.stringify(cabinetFrames) : undefined}
      />
    </div>
  )
}
