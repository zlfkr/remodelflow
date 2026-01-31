import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

export default async function OwnerProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    redirect('/owner')
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, customer_id, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const customerIds = [...new Set((projects ?? []).map((p) => p.customer_id).filter(Boolean))] as string[]
  const { data: customers } = customerIds.length
    ? await supabase.from('customers').select('id, full_name, email').in('id', customerIds)
    : { data: [] }
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Owner', href: '/owner' }, { label: 'Projects', href: '/owner/projects' }]} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <Link
            href="/owner"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to dashboard
          </Link>
        </div>

        {!projects?.length ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            No projects yet. Create one from the{' '}
            <Link href="/owner" className="text-indigo-600 hover:underline">
              owner dashboard
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => {
              const customer = project.customer_id ? customerMap.get(project.customer_id) : null
              return (
                <li key={project.id}>
                  <Link
                    href={`/owner/projects/${project.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500">
                          {customer?.full_name ?? customer?.email ?? 'No customer'} · {project.status}
                        </p>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
