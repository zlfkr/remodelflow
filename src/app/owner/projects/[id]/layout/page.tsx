import { redirect } from 'next/navigation'

/**
 * Redirects /owner/projects/[id]/layout to the Wall Elevation editor with project context.
 */
export default async function OwnerProjectLayoutPage({
  params,
}: {
  params: { id: string }
}) {
  redirect(`/wall-elevation?projectId=${encodeURIComponent(params.id)}`)
}
