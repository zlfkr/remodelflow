/**
 * Wall elevation layout persistence per project.
 * Uses table `wall_elevation_layouts` (project_id, owner_id, payload jsonb, updated_at).
 * If the table does not exist yet, getProjectLayout returns null and upsertProjectLayout returns { success: false, error }.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type WallElevationPayload = {
  placements: unknown[]
  wallLabel: string
  scale: number
  showDimensions: boolean
  showLabels: boolean
}

export type ProjectLayoutResult = WallElevationPayload & {
  updated_at?: string
}

export async function getProjectLayout(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectLayoutResult | null> {
  try {
    const { data, error } = await supabase
      .from('wall_elevation_layouts')
      .select('payload, updated_at')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) return null
      console.warn('[getProjectLayout]', error.message)
      return null
    }
    if (!data?.payload || typeof data.payload !== 'object') return null

    const p = data.payload as Record<string, unknown>
    return {
      placements: Array.isArray(p.placements) ? p.placements : [],
      wallLabel: typeof p.wallLabel === 'string' ? p.wallLabel : 'Kitchen Wall',
      scale: typeof p.scale === 'number' && p.scale > 0 ? p.scale : 10,
      showDimensions: typeof p.showDimensions === 'boolean' ? p.showDimensions : true,
      showLabels: typeof p.showLabels === 'boolean' ? p.showLabels : true,
      updated_at: data.updated_at ?? undefined,
    }
  } catch {
    return null
  }
}

export async function upsertProjectLayout(
  supabase: SupabaseClient,
  projectId: string,
  payload: WallElevationPayload
): Promise<{ success: boolean; updated_at?: string; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: authError?.message ?? 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('wall_elevation_layouts')
      .upsert(
        {
          project_id: projectId,
          owner_id: user.id,
          payload: {
            placements: payload.placements,
            wallLabel: payload.wallLabel,
            scale: payload.scale,
            showDimensions: payload.showDimensions,
            showLabels: payload.showLabels,
          },
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
      updated_at: data?.updated_at,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to save'
    return { success: false, error: message }
  }
}
