'use client'

type DesignPreviewSectionProps = {
  projectId: string
  ownerId: string
  customerId: string | null
}

export default function DesignPreviewSection({
  projectId,
  ownerId,
  customerId,
}: DesignPreviewSectionProps) {
  return (
    <section className="mt-8" aria-label="Design preview">
      {/* Reusable design preview section — wire to your design/renders UI */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Design preview (project: {projectId})
      </div>
    </section>
  )
}
