'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ProjectMessages from './ProjectMessages'
import ProjectDesigns from './ProjectDesigns'
import ProjectActivity from './ProjectActivity'
import StatusProgressControl from './StatusProgressControl'
import EstimateSection from './EstimateSection'
import CustomerEstimateView from './CustomerEstimateView'
import CabinetBulkUpload from './cabinets/CabinetBulkUpload'

interface Project {
  id: string
  name: string
  status: string
  owner_id: string
  created_at: string
  updated_at: string
}

interface ProjectDetailsProps {
  projectId: string
  userRole?: 'owner' | 'customer'
  userId?: string
}

export default function ProjectDetails({ projectId, userRole, userId }: ProjectDetailsProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [actualUserRole, setActualUserRole] = useState<'owner' | 'customer'>(userRole || 'customer')
  const [actualUserId, setActualUserId] = useState<string>(userId || '')
  const [activeTab, setActiveTab] = useState<'overview' | 'cabinets'>('overview')

  useEffect(() => {
    if (!userRole || !userId) {
      loadUserInfo()
    }
    loadProject()
  }, [projectId, userRole, userId])

  const loadUserInfo = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setActualUserRole(profile.role as 'owner' | 'customer')
        setActualUserId(profile.id)
      }
    }
  }

  const loadProject = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (data) {
      // Only update if project data actually changed
      setProject(prev => {
        if (!prev || prev.id !== data.id || prev.status !== data.status || prev.name !== data.name) {
          return data
        }
        return prev
      })
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Project Status</h2>
          {(actualUserRole === 'owner' || userRole === 'owner') && (
            <StatusProgressControl 
              projectId={projectId}
              currentStatus={project.status}
              onStatusChange={loadProject}
            />
          )}
        </div>
        
        {/* Status Timeline */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      index === currentStepIndex
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : index < currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                    title={index === currentStepIndex ? 'Current Status' : ''}
                  >
                    {index + 1}
                  </div>
                  <div className={`mt-2 text-xs text-center font-medium ${
                    index === currentStepIndex 
                      ? 'text-blue-600 font-bold' 
                      : index < currentStepIndex 
                      ? 'text-blue-600' 
                      : 'text-gray-500'
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 mt-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          {(actualUserRole || userRole) === 'owner' && (
            <button
              onClick={() => setActiveTab('cabinets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cabinets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Cabinets
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Activity Timeline */}
          <ProjectActivity projectId={projectId} />

          {/* Phase 3: Estimate Section */}
          {(actualUserId || userId) && (
            <>
              {/* Owner view: Full EstimateSection with editing */}
              {(actualUserRole || userRole) === 'owner' && (
                <EstimateSection
                  projectId={projectId}
                  ownerId={project.owner_id || ''}
                  userRole="owner"
                />
              )}
              {/* Customer view: Read-only CustomerEstimateView */}
              {(actualUserRole || userRole) === 'customer' && (
                <CustomerEstimateView projectId={projectId} />
              )}
            </>
          )}

          {/* Designs Section */}
          {(actualUserId || userId) && (
            <ProjectDesigns 
              projectId={projectId} 
              userRole={actualUserRole || userRole || 'customer'}
              userId={actualUserId || userId || ''}
              onProjectUpdate={loadProject}
            />
          )}

          {/* Messages Section - Place at bottom to prevent jumping */}
          {(actualUserId || userId) && (
            <ProjectMessages 
              projectId={projectId} 
              userRole={actualUserRole || userRole || 'customer'}
              userId={actualUserId || userId || ''}
            />
          )}
        </div>
      )}

      {/* Cabinets Tab - Owner only */}
      {activeTab === 'cabinets' && (actualUserRole || userRole) === 'owner' && (
        <CabinetBulkUpload projectId={projectId} />
      )}
    </div>
  )
}
