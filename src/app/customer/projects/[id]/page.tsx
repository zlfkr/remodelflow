import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import ProjectDetails from '@/components/ProjectDetails'
import DesignPreviewSection from '@/components/designs/DesignPreviewSection'

export default async function ProjectDetailPage({
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

  if (!profile || profile.role !== 'customer') {
    redirect('/owner')
  }

  // Verify customer has access to this project
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', user.email!)
    .single()

  let project: { id: string; name: string; owner_id: string; customer_id: string | null } | null = null

  if (customer) {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .eq('customer_id', customer.id)
      .single()

    project = projectData
    if (!project) {
      redirect('/customer')
    }
  } else {
    redirect('/customer')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { label: 'Customer', href: '/customer' },
            { label: 'My Projects', href: '/customer' },
            { label: project?.name ?? 'Project' },
          ]}
        />
        <ProjectDetails 
          projectId={params.id} 
          userRole="customer"
          userId={user.id}
        />
        {project && (
          <DesignPreviewSection
            projectId={params.id}
            ownerId={project.owner_id}
            customerId={customer?.id ?? null}
          />
        )}
      </div>
    </div>
  )
}
