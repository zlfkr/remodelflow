import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import OwnerDashboard from '@/components/OwnerDashboard'

export default async function OwnerPage() {
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
    redirect('/customer')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[{ label: 'Owner', href: '/owner' }]} />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile.full_name || 'Owner'}
          </h1>
          <Link
            href="/owner/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View all projects →
          </Link>
        </div>
        <OwnerDashboard />
      </div>
    </div>
  )
}
