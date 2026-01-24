'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [project, setProject] = useState<any>(null)

  useEffect(() => {
    if (token) {
      loadInvite()
    }
  }, [token])

  const loadInvite = async () => {
    const supabase = createClient()
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Please log in to accept this invite')
      setLoading(false)
      return
    }

    // Load invite
    const { data: inviteData, error: inviteError } = await supabase
      .from('project_invites')
      .select('*, projects(*)')
      .eq('token', token)
      .single()

    if (inviteError || !inviteData) {
      setError('Invalid or expired invite link')
      setLoading(false)
      return
    }

    // Check if expired
    if (new Date(inviteData.expires_at) < new Date()) {
      setError('This invite link has expired')
      setLoading(false)
      return
    }

    // Check if already used
    if (inviteData.used_at) {
      setError('This invite link has already been used')
      setLoading(false)
      return
    }

    // Verify email matches
    if (inviteData.email !== user.email) {
      setError(`This invite is for ${inviteData.email}, but you're logged in as ${user.email}`)
      setLoading(false)
      return
    }

    setInvite(inviteData)
    setProject(inviteData.projects)
    setLoading(false)
  }

  const handleAcceptInvite = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !invite) return

    try {
      // Mark invite as used
      const { error: updateError } = await supabase
        .from('project_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)

      if (updateError) {
        setError('Failed to accept invite: ' + updateError.message)
        return
      }

      // Show success message
      setSuccess(true)
      setError(null)
      
      // Redirect to customer portal where they can see their project
      setTimeout(() => {
        router.push('/customer')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError('An error occurred: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Invitation</h2>
          {success ? (
            <div>
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-semibold">Invite Accepted!</p>
                <p className="text-sm mt-1">Redirecting you to your projects...</p>
              </div>
              {project && (
                <p className="text-gray-600">
                  You now have access to: <strong>{project.name}</strong>
                </p>
              )}
            </div>
          ) : project ? (
            <>
              <p className="text-gray-600 mb-6">
                You've been invited to view the project: <strong>{project.name}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                After accepting, you'll be able to view project details, status, and communicate with your project manager.
              </p>
              <button
                onClick={handleAcceptInvite}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Accept Invite
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
