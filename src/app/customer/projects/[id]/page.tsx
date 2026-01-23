import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import ProjectDetails from '@/components/ProjectDetails'

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

  if (customer) {
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .eq('customer_id', customer.id)
      .single()

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
        <ProjectDetails projectId={params.id} />
      </div>
    </div>
  )
}
