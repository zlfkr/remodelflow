'use client'

import Link from 'next/link'

interface CabinetBulkUploadProps {
  projectId: string
}

/**
 * Placeholder for cabinet bulk upload. Replace with full implementation when available.
 */
export default function CabinetBulkUpload({ projectId }: CabinetBulkUploadProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Cabinets</h3>
      <p className="mt-2 text-sm text-gray-600">
        Manage cabinet inventory and bulk upload for this project.
      </p>
      <Link
        href={`/owner/projects/${projectId}/layout`}
        className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Open 2D Layout Designer →
      </Link>
    </div>
  )
}
