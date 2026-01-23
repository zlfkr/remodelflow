'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

interface ProjectDetailsProps {
  projectId: string
}

export default function ProjectDetails({ projectId }: ProjectDetailsProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (data) {
      setProject(data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!project) {
    return <div className="text-center py-8 text-red-600">Project not found</div>
  }

  const statusSteps = [
    { key: 'draft', label: 'Draft' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
  ]

  const currentStepIndex = statusSteps.findIndex(step => step.key === project.status)

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push('/customer')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Projects
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Project Status</h2>
        
        {/* Status Timeline */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      index <= currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className={`mt-2 text-xs text-center ${
                    index <= currentStepIndex ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Project Information</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{project.status.replace('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(project.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(project.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Messages section - placeholder for Phase 2 */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Messages</h2>
        <p className="text-gray-500 text-sm">Messages feature coming in Phase 2</p>
      </div>
    </div>
  )
}
