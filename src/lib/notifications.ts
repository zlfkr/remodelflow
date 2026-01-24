// Helper functions for creating notifications
// These should be called from server actions or API routes in production

import { createClient } from '@/lib/supabase/client'

/**
 * Create a notification for a user
 * Note: This is a client-side helper. For production, move to server-side.
 */
export async function createNotification(
  userId: string,
  projectId: string,
  type: 'new_message' | 'design_uploaded' | 'design_approved',
  title: string,
  message: string
) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      project_id: projectId,
      type,
      title,
      message,
    })

  if (error) {
    console.error('Error creating notification:', error)
    return false
  }

  return true
}

/**
 * Get customer's profile ID from their email
 * TODO: This is a workaround. In production, link customers to profiles directly.
 */
export async function getCustomerProfileId(customerEmail: string): Promise<string | null> {
  const supabase = createClient()
  
  // Find customer record
  const { data: customer } = await supabase
    .from('customers')
    .select('email')
    .eq('email', customerEmail)
    .single()

  if (!customer) return null

  // Find profile by email (matching auth.users email)
  const { data: { user } } = await supabase.auth.getUser()
  // This is a limitation - we need to get the profile ID differently
  // For now, we'll need to pass the profile ID from the calling code
  
  return null // TODO: Implement proper lookup
}
