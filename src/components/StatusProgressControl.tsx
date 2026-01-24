'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StatusProgressControlProps {
  projectId: string
  currentStatus: string
  onStatusChange: () => void
}

export default function StatusProgressControl({ 
  projectId, 
  currentStatus, 
  onStatusChange 
}: StatusProgressControlProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [updating, setUpdating] = useState(false)

  const statusOptions = [
    { key: 'draft', label: 'Draft' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'completed', label: 'Completed' },
  ]

  const currentIndex = statusOptions.findIndex(s => s.key === currentStatus)
  const nextStatus = currentIndex < statusOptions.length - 1 
    ? statusOptions[currentIndex + 1] 
    : null

  const handleStatusChange = async (newStatus: string) => {
    if (updating) return

    setUpdating(true)
    const supabase = createClient()

    try {
      const oldStatus = currentStatus
      
      // Update project status
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: newStatus as any })
        .eq('id', projectId)

      if (updateError) {
        throw updateError
      }

      // Get current user for activity
      const { data: { user } } = await supabase.auth.getUser()

      // Create activity entry
      await supabase.rpc('create_project_activity', {
        p_project_id: projectId,
        p_type: 'status_changed',
        p_description: `Status changed: ${oldStatus.replace('_', ' ')} → ${newStatus.replace('_', ' ')}`,
        p_metadata: { 
          old_status: oldStatus, 
          new_status: newStatus 
        },
        p_created_by: user?.id || null,
      })

      setShowMenu(false)
      onStatusChange()
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert('Failed to update status: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="relative">
      {nextStatus ? (
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={updating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {updating ? 'Updating...' : `Move to ${nextStatus.label} →`}
        </button>
      ) : (
        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
          ✓ Completed
        </span>
      )}

      {showMenu && nextStatus && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-2 py-1 mb-1">Change Status To:</div>
            {statusOptions.slice(currentIndex + 1).map((status) => (
              <button
                key={status.key}
                onClick={() => handleStatusChange(status.key)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
              >
                {status.label}
              </button>
            ))}
            <button
              onClick={() => setShowMenu(false)}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded mt-1 border-t"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}
