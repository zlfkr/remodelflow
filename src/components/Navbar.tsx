'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import Notifications from './Notifications'

type Role = 'owner' | 'customer' | null

export default function Navbar() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole((profile?.role as Role) ?? null)
    } else {
      setRole(null)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href={role === 'owner' ? '/owner' : role === 'customer' ? '/customer' : '/'} className="text-xl font-bold text-gray-900 hover:text-gray-700">
              RemodelFlow
            </Link>
            {userId && (
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={role === 'owner' ? '/owner' : '/customer'}
                  className="font-medium text-gray-600 hover:text-gray-900"
                >
                  {role === 'owner' ? 'Dashboard' : 'My Projects'}
                </Link>
                {role === 'owner' && (
                  <Link
                    href="/owner/projects"
                    className="font-medium text-gray-600 hover:text-gray-900"
                  >
                    Projects
                  </Link>
                )}
                <Link
                  href="/wall-elevation"
                  className="font-medium text-gray-600 hover:text-gray-900"
                >
                  Wall Elevation
                </Link>
                {role === 'owner' && (
                  <Link
                    href="/owner/catalog"
                    className="font-medium text-gray-600 hover:text-gray-900"
                  >
                    Catalog
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {userId && <Notifications userId={userId} />}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              {loading ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
