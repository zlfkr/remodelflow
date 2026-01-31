'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProjectMessages from './ProjectMessages'
import ProjectDesigns from './ProjectDesigns'
import ProjectActivity from './ProjectActivity'
import StatusProgressControl from './StatusProgressControl'
import { LayoutState } from '@/engine/layout2d/types'
import { loadLayout, saveLayout } from '@/lib/layout2d/persistence'
import LayoutDesigner from './layout2d/LayoutDesigner'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'cabinets' | 'layout'>('overview')

  useEffect(() => {
    if (!userRole || !userId) loadUserInfo()
    loadProject()
  }, [projectId, userRole, userId])

  const loadUserInfo = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          if (profileError.code !== 'PGRST116') {
            console.error('[ProjectDetails] Error loading profile:', profileError)
          }
          return
        }

        if (profile) {
          const typedProfile = profile as { id: string; role: 'owner' | 'customer' }
          if (typedProfile.role && typedProfile.id) {
            setActualUserRole(typedProfile.role)
            setActualUserId(typedProfile.id)
          }
        }
      }
    } catch (err: any) {
      console.error('[ProjectDetails] Error in loadUserInfo:', err)
    }
  }

  const loadProject = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No project found
          console.error('[ProjectDetails] Project not found:', projectId)
          setProject(null)
        } else {
          console.error('[ProjectDetails] Error loading project:', error)
        }
        setLoading(false)
        return
      }

      if (data && data.id && data.status && data.name) {
        const typedData = data as Project
        setProject(prev => {
          if (!prev || prev.id !== typedData.id || prev.status !== typedData.status || prev.name !== typedData.name) {
            return typedData
          }
          return prev
        })
      }
      setLoading(false)
    } catch (err: any) {
      console.error('[ProjectDetails] Error in loadProject:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p>Loading...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Project not found</p>
      </div>
    )
  }

  const statusSteps = [
    { key: 'draft', label: 'Draft' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
  ]

  const currentStepIndex = statusSteps.findIndex(step => step.key === project.status)

  const isOwner = (actualUserRole || userRole) === 'owner'
  const lastUpdated = project ? new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const openLayoutDesigner = () => setActiveTab('layout')

  return (
    <div>
      {/* Header: Back + project name + status line + primary CTA */}
      <div className="mb-6">
        <Link
          href={actualUserRole === 'owner' ? '/owner/projects' : '/customer'}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← Back to Projects
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Status: <span className="font-medium text-gray-700 capitalize">{project.status.replace('_', ' ')}</span>
              {' · '}
              Last updated: {lastUpdated}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openLayoutDesigner}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Open 2D Layout Designer →
            </button>
            {isOwner && (
              <StatusProgressControl
                projectId={projectId}
                currentStatus={project.status}
                onStatusChange={loadProject}
              />
            )}
          </div>
        </div>
      </div>

      {/* Project Status — card with stronger stepper */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        index === currentStepIndex
                          ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                          : index < currentStepIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                      }`}
                      title={index === currentStepIndex ? 'Current status' : index < currentStepIndex ? 'Completed' : 'Locked'}
                    >
                      {index + 1}
                    </div>
                    <div className={`mt-2 text-xs text-center font-medium ${
                      index === currentStepIndex
                        ? 'text-blue-600 font-bold'
                        : index < currentStepIndex
                          ? 'text-blue-600'
                          : 'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Information — card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
          {isOwner && (
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
          <button
            onClick={() => setActiveTab('layout')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'layout'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            2D Layout Designer
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 2D Cabinet Layout Designer — single CTA card (secondary placement) */}
          <Card>
            <CardHeader>
              <CardTitle>2D Cabinet Layout Designer</CardTitle>
              <CardDescription>
                Design your cabinet layout with drag-and-drop placement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button
                onClick={openLayoutDesigner}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Open 2D Layout Designer →
              </button>
            </CardContent>
          </Card>

          {/* Activity Timeline — card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Activity will appear as the project progresses.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectActivity projectId={projectId} showTitle={false} />
            </CardContent>
          </Card>

          {/* Designs — card */}
          {(actualUserId || userId) && (
            <Card>
              <CardHeader>
                <CardTitle>Designs</CardTitle>
                <CardDescription>Upload and manage design files.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectDesigns
                  projectId={projectId}
                  userRole={actualUserRole || userRole || 'customer'}
                  userId={actualUserId || userId || ''}
                  onProjectUpdate={loadProject}
                  showTitle={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Messages — card */}
          {(actualUserId || userId) && (
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Start the conversation.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectMessages
                  projectId={projectId}
                  userRole={actualUserRole || userRole || 'customer'}
                  userId={actualUserId || userId || ''}
                  showTitle={false}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cabinets Tab - Owner only (CabinetBulkUpload component not in this workspace) */}
      {activeTab === 'cabinets' && (actualUserRole || userRole) === 'owner' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cabinets</CardTitle>
            <CardDescription>Manage cabinet inventory and bulk upload for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Use the 2D Layout Designer tab to place cabinets, or open the full Wall Elevation editor for this project.
            </p>
            <Link
              href={`/wall-elevation?projectId=${encodeURIComponent(projectId)}`}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Open Wall Elevation editor →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Layout Designer Tab */}
      {activeTab === 'layout' && <LayoutDesignerTab projectId={projectId} />}
    </div>
  )
}

// Layout Designer Tab Component
function LayoutDesignerTab({ projectId }: { projectId: string }) {
  const [layout, setLayout] = useState<LayoutState | null>(null)
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null)
  const [lastSavedLayout, setLastSavedLayout] = useState<LayoutState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const result = await loadLayout(supabase, projectId)
        if (result) {
          setLayout(result.layout)
          setServerUpdatedAt(result.serverUpdatedAt)
          setLastSavedLayout(result.layout)
        } else {
          const { createInitialLayoutState } = await import('@/engine/layout2d/state')
          const initialLayout = createInitialLayoutState()
          setLayout(initialLayout)
          setLastSavedLayout(initialLayout)
        }
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load layout')
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  useEffect(() => {
    if (!layout || !projectId || loading || isUnmountingRef.current) return
    if (lastSavedLayout && JSON.stringify(layout) === JSON.stringify(lastSavedLayout)) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (isUnmountingRef.current) return
      try {
        setSaving(true)
        const supabase = createClient()
        const result = await saveLayout(supabase, projectId, layout, serverUpdatedAt || undefined)
        if (result.success) {
          setLastSavedLayout(layout)
          setServerUpdatedAt(result.serverUpdatedAt || null)
        } else {
          setError(result.error || 'Failed to save')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to save')
      } finally {
        if (!isUnmountingRef.current) setSaving(false)
      }
    }, 1500)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [layout, projectId, loading, lastSavedLayout, serverUpdatedAt])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading layout...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">2D Cabinet Layout Designer</h2>
        <div className="flex items-center gap-4">
          {saving && <span className="text-sm text-gray-600">Saving...</span>}
          {error && <span className="text-sm text-red-600">⚠️ {error}</span>}
          {!saving && !error && layout && (
            <span className="text-sm text-green-600">
              {lastSavedLayout && JSON.stringify(layout) !== JSON.stringify(lastSavedLayout) 
                ? '● Unsaved changes' 
                : '✓ Saved'}
            </span>
          )}
          <Link
            href={`/wall-elevation?projectId=${encodeURIComponent(projectId)}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Open full Wall Elevation editor →
          </Link>
        </div>
      </div>
      <LayoutDesigner
        projectId={projectId}
        initialLayout={layout || undefined}
        onLayoutChange={setLayout}
      />
    </div>
  )
}
