'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  user_id: string
  project_id: string
  type: 'new_message' | 'design_uploaded' | 'design_approved'
  title: string
  message: string
  read_at: string | null
  created_at: string
}

interface NotificationsProps {
  userId: string
}

export default function Notifications({ userId }: NotificationsProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 5 seconds
    const interval = setInterval(loadNotifications, 5000)
    return () => clearInterval(interval)
  }, [userId])

  const loadNotifications = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error loading notifications:', error)
    } else if (data) {
      // Only update if notifications actually changed
      setNotifications(prev => {
        const newUnreadCount = data.filter(n => !n.read_at).length
        if (prev.length !== data.length || prev.filter(n => !n.read_at).length !== newUnreadCount) {
          setUnreadCount(newUnreadCount)
          return data
        }
        return prev
      })
    }

    setLoading(false)
  }

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    await loadNotifications()
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds)

      await loadNotifications()
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_message':
        return '💬'
      case 'design_uploaded':
        return '📎'
      case 'design_approved':
        return '✅'
      default:
        return '🔔'
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showDropdown && notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => {
                  markAsRead(notification.id)
                  setShowDropdown(false)
                  // Navigate based on user role - TODO: determine role properly
                  router.push(`/customer/projects/${notification.project_id}`)
                }}
                className={`block p-4 hover:bg-gray-50 cursor-pointer ${!notification.read_at ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showDropdown && notifications.length === 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 p-4">
          <p className="text-sm text-gray-500 text-center">No notifications</p>
        </div>
      )}
      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
