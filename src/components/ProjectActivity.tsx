'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Activity {
  id: string
  project_id: string
  type: 'design_uploaded' | 'design_approved' | 'status_changed' | 'message_sent' | 'project_created'
  description: string
  metadata: any
  created_by: string | null
  created_at: string
}

interface ProjectActivityProps {
  projectId: string
}

export default function ProjectActivity({ projectId }: ProjectActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivity()
    // Poll for new activity every 10 seconds
    const interval = setInterval(loadActivity, 10000)
    return () => clearInterval(interval)
  }, [projectId])

  const loadActivity = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_activity')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error loading activity:', error)
      setLoading(false)
    } else if (data) {
      // Only update if data actually changed to prevent unnecessary re-renders
      setActivities(prev => {
        if (prev.length !== data.length) {
          return data
        }
        // Check if first (latest) activity changed
        if (prev.length > 0 && data.length > 0 && prev[0]?.id !== data[0]?.id) {
          return data
        }
        return prev
      })
      setLoading(false)
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'design_uploaded':
        return '📎'
      case 'design_approved':
        return '✅'
      case 'status_changed':
        return '🔄'
      case 'message_sent':
        return '💬'
      case 'project_created':
        return '🆕'
      default:
        return '•'
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'design_uploaded':
        return 'bg-blue-100 text-blue-800'
      case 'design_approved':
        return 'bg-green-100 text-green-800'
      case 'status_changed':
        return 'bg-purple-100 text-purple-800'
      case 'message_sent':
        return 'bg-gray-100 text-gray-800'
      case 'project_created':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading activity...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
      
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <p className="text-gray-600 font-medium mb-2">No activity yet</p>
          <p className="text-sm text-gray-500">Activity will appear here as the project progresses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                <span className="text-sm">{getActivityIcon(activity.type)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                {activity.metadata && (
                  <div className="text-xs text-gray-500 mt-1">
                    {activity.metadata.file_name && (
                      <span>File: {activity.metadata.file_name}</span>
                    )}
                    {activity.metadata.old_status && activity.metadata.new_status && (
                      <span>
                        Status: {activity.metadata.old_status} → {activity.metadata.new_status}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
