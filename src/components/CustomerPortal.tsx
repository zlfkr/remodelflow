'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

interface CustomerPortalProps {
  userEmail: string
}

export default function CustomerPortal({ userEmail }: CustomerPortalProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [userEmail])

  const loadProjects = async () => {
    const supabase = createClient()
    
    // First, find the customer record by email
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (!customer) {
      setLoading(false)
      return
    }

    // Then, get projects for this customer
    const { data: projectsData } = await supabase
      .from('projects')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (projectsData) {
      setProjects(projectsData)
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">My Projects</h2>
      
      {projects.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">
            You don't have any projects yet. Contact your project manager to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/customer/projects/${project.id}`}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
