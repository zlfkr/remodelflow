'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  project_id: string
  sender_role: 'owner' | 'customer'
  sender_id: string
  message: string
  created_at: string
}

interface ProjectMessagesProps {
  projectId: string
  userRole: 'owner' | 'customer'
  userId: string
}

export default function ProjectMessages({ projectId, userRole, userId }: ProjectMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  useEffect(() => {
    loadMessages()
    // Poll for new messages every 5 seconds (simple polling, no real-time yet)
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [projectId])

  useEffect(() => {
    // Only auto-scroll if user is near bottom or just sent a message
    // Use requestAnimationFrame for smoother scrolling
    if (shouldAutoScroll && messages.length > 0 && !loading) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
        }
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [messages.length, shouldAutoScroll, loading]) // Only depend on length, not full array

  // Check if user is near bottom of scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShouldAutoScroll(isNearBottom)
    }
  }

  const loadMessages = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      setLoading(false)
      return
    }

    if (data) {
      // Only update if messages actually changed to prevent unnecessary re-renders
      setMessages(prev => {
        // Check if data actually changed
        if (prev.length !== data.length) {
          return data
        }
        // Check if last message changed
        if (prev.length > 0 && data.length > 0 && prev[prev.length - 1]?.id !== data[data.length - 1]?.id) {
          return data
        }
        // Check if any message content changed
        const hasChanges = prev.some((msg, idx) => msg.id !== data[idx]?.id || msg.message !== data[idx]?.message)
        return hasChanges ? data : prev
      })
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        sender_role: userRole,
        sender_id: userId,
        message: newMessage.trim(),
      })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message: ' + error.message)
      } else {
        setNewMessage('')
        setShouldAutoScroll(true) // Force scroll when sending
        await loadMessages()
        
        // Create activity entry
        await supabase.rpc('create_project_activity', {
          p_project_id: projectId,
          p_type: 'message_sent',
          p_description: `${userRole === 'owner' ? 'Owner' : 'Customer'} sent a message`,
          p_metadata: { sender_role: userRole },
          p_created_by: userId,
        })
      }

    setSending(false)
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading messages...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Messages</h3>
      
      {/* Messages List */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="border rounded-lg p-4 h-64 overflow-y-auto mb-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">💬</div>
            <p className="text-gray-600 font-medium mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_role === userRole ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_role === userRole
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {message.sender_role === 'owner' ? 'Owner' : 'Customer'} •{' '}
                    {new Date(message.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
