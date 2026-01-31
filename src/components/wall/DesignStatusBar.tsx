'use client'

interface DesignStatusBarProps {
  placementsCount: number
  lastError: string | null
  wallLabel: string
  dimensionsLocked: boolean
}

export default function DesignStatusBar({
  placementsCount,
  lastError,
  wallLabel,
  dimensionsLocked,
}: DesignStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
      <span className="font-medium text-gray-700">{wallLabel}</span>
      <span className="text-gray-500">{placementsCount} cabinet(s)</span>
      {dimensionsLocked && (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">Dimensions locked</span>
      )}
      {lastError && (
        <span className="text-red-600">{lastError}</span>
      )}
    </div>
  )
}
