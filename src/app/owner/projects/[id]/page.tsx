import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProjectDetails from '@/components/ProjectDetails'
import DesignPreviewSection from '@/components/designs/DesignPreviewSection'

export default async function OwnerProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    redirect('/owner')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, customer_id')
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single()

  if (!project) {
    redirect('/owner/projects')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Owner', href: '/owner' },
            { label: 'Projects', href: '/owner/projects' },
            { label: project.name },
          ]}
        />
        <ProjectDetails
          projectId={params.id}
          userRole="owner"
          userId={user.id}
        />
        <DesignPreviewSection
          projectId={params.id}
          ownerId={user.id}
          customerId={project.customer_id ?? null}
        />
      </div>
    </div>
  )
}
