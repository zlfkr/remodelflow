/**
 * 2D Cabinet Layout persistence.
 * Load/save layout state for the layout designer tab.
 * Uses project_layouts or cabinet_layouts when available.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type LayoutState = Record<string, unknown>

export interface LoadLayoutResult {
  layout: LayoutState
  serverUpdatedAt: string
}

export async function loadLayout(
  supabase: SupabaseClient,
  projectId: string
): Promise<LoadLayoutResult | null> {
  try {
    const { data, error } = await supabase
      .from('project_layouts')
      .select('layout, updated_at')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) return null
      console.warn('[loadLayout]', error.message)
      return null
    }
    if (!data?.layout) return null

    return {
      layout: data.layout as LayoutState,
      serverUpdatedAt: data.updated_at ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function saveLayout(
  supabase: SupabaseClient,
  projectId: string,
  layout: LayoutState,
  _serverUpdatedAt?: string
): Promise<{ success: boolean; serverUpdatedAt?: string; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message ?? 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('project_layouts')
      .upsert(
        {
          project_id: projectId,
          owner_id: user.id,
          layout: layout as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
      .select('updated_at')
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }
    return {
      success: true,
      serverUpdatedAt: data?.updated_at,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save'
    return { success: false, error: message }
  }
}
