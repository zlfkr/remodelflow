/**
 * Helper functions for creating project activity entries
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type ActivityType = 
  | 'design_uploaded' 
  | 'design_approved' 
  | 'status_changed' 
  | 'message_sent' 
  | 'project_created'
  | 'estimate_item_added'
  | 'estimate_item_updated'
  | 'estimate_item_removed'
  | 'estimate_settings_updated'

/**
 * Add a project activity entry
 * @param supabase - Supabase client instance
 * @param projectId - Project ID
 * @param type - Activity type
 * @param description - Human-readable description
 * @param createdBy - User ID who created the activity (optional)
 * @param metadata - Additional metadata (optional)
 */
export async function addProjectActivity(
  supabase: SupabaseClient,
  projectId: string,
  type: ActivityType,
  description: string,
  createdBy?: string | null,
  metadata?: Record<string, any> | null
): Promise<void> {
  try {
    // Try RPC first (if available)
    const { error: rpcError } = await supabase.rpc('create_project_activity', {
      p_project_id: projectId,
      p_type: type,
      p_description: description,
      p_metadata: metadata,
      p_created_by: createdBy || null,
    })

    if (rpcError) {
      // Fallback to direct INSERT
      const { error: insertError } = await supabase
        .from('project_activity')
        .insert({
          project_id: projectId,
          type: type as any, // Type assertion needed due to CHECK constraint
          description,
          metadata: metadata || null,
          created_by: createdBy || null,
        })

      if (insertError) {
        console.error('Error creating activity:', insertError)
        // Don't throw - activity creation failure shouldn't break the main flow
      }
    }
  } catch (error) {
    console.error('Unexpected error creating activity:', error)
    // Don't throw - activity creation failure shouldn't break the main flow
  }
}

/**
 * Format currency for activity descriptions
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format unit type for activity descriptions
 */
export function formatUnitType(type: string): string {
  const map: Record<string, string> = {
    'each': 'Each',
    'sqft': 'Sq Ft',
    'linear_ft': 'Linear Ft',
    'hour': 'Hour',
    'flat': 'Flat',
  }
  return map[type] || type
}
