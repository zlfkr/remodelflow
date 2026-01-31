'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProjectLayout, upsertProjectLayout } from '@/lib/layouts/projectLayouts'
import WallEditor from '@/components/wall/WallEditor'
import WallSvgPreview from '@/components/wall/WallSvgPreview'
import DesignStatusBar from '@/components/wall/DesignStatusBar'
import AdvancedPanel from '@/components/wall/AdvancedPanel'
import { WallCabinetPlacement, WallElevationInput } from '@/engine/wallElevation'
import { generateWallElevation } from '@/engine/wallElevation'
import { WALL_PRESETS } from '@/demo/wallPresets'
import { getDimensionsLocked, setDimensionsLocked } from '@/lib/manufacturing/approval'
import Navbar from '@/components/Navbar'
import Breadcrumbs from '@/components/ui/Breadcrumbs'

/** Left margin from wall edge (inches). Base/wall cabinets pack left → right from here. */
const WALL_EDGE_MARGIN_IN = 3
/** Gap between cabinets when packing left → right (inches) */
const GAP_IN = 0.125

// Default wall state: base/wall pack left → right with consistent margin (captured for reset)
const DEFAULT_WALL_PLACEMENTS: WallCabinetPlacement[] = [
    {
      id: 'cab1',
      cabinet_label: 'B24-FF-01',
      x_from_left_in: WALL_EDGE_MARGIN_IN,
      cabinet_width_in: 24,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'face_frame',
      shelves: 1,
      opening: {
        drawer_openings: 0,
        door_openings: 2,
        reveal_gap_in: 0.125,
      },
      face_frame: {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
    {
      id: 'cab2',
      cabinet_label: 'B30-FF-01',
      x_from_left_in: WALL_EDGE_MARGIN_IN + 24 + GAP_IN,
      cabinet_width_in: 30,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'face_frame',
      shelves: 0,
      opening: {
        drawer_openings: 3,
        door_openings: 0,
        top_drawer_height_in: 6,
        middle_drawer_height_in: 6,
        // Remove remaining_drawer_height_in to let engine compute it automatically
        reveal_gap_in: 0.125,
      },
      face_frame: {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
    {
      id: 'cab3',
      cabinet_label: 'W30-FL-01',
      x_from_left_in: WALL_EDGE_MARGIN_IN + 24 + GAP_IN + 30 + GAP_IN,
      cabinet_width_in: 30,
      cabinet_height_in: 30,
      cabinet_depth_in: 12,
      type: 'wall',
      construction: 'frameless',
      shelves: 2,
      opening: {
        drawer_openings: 0,
        door_openings: 2,
        reveal_gap_in: 0,
      },
      face_frame: {
        enabled: false,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      },
    },
]

const DEFAULT_WALL_LABEL = 'Kitchen Wall'

/** SessionStorage key used by Cabinet Builder when user clicks "Add to Wall" */
const ADD_TO_WALL_STORAGE_KEY = 'remodelflow_add_to_wall'

/** localStorage key for demo-mode layout (survives refresh when no project selected) */
const DEMO_LAYOUT_KEY = 'remodelflow_wall_demo_layout'

type CabinetFromBuilderPayload = {
  cabinet_label: string
  type: 'base' | 'wall' | 'tall'
  construction: 'face_frame' | 'frameless'
  width_in: number
  height_in: number
  depth_in: number
  shelves: number
  opening: {
    drawer_openings: number
    door_openings: 0 | 1 | 2
    top_drawer_height_in?: number
    middle_drawer_height_in?: number
    remaining_drawer_height_in?: number
    door_region_height_in?: number
    reveal_gap_in: number
  }
  face_frame: {
    enabled: boolean
    stile_width_in: number
    top_rail_width_in: number
    middle_rail_width_in: number
    bottom_rail_width_in: number
  }
}

type WallElevationPageProps = {
  mode?: 'layout' | 'elevation'
}

function WallElevationContent({ mode = 'elevation' }: WallElevationPageProps) {
  const isLayoutMode = mode === 'layout'
  const searchParams = useSearchParams()

  // When arriving from Cabinet Builder "Add to Wall", id of the newly added placement (for message + auto-expand)
  const [addedFromCabinetId, setAddedFromCabinetId] = useState<string | null>(null)

  // Dimension lock after approval (session-scoped; gates Wall Editor width/height/X)
  const [dimensionsLocked, setDimensionsLockedState] = useState(false)
  useEffect(() => {
    setDimensionsLockedState(getDimensionsLocked())
  }, [])

  // Temporary: log current user id for RLS / project_layouts debugging (remove after copying UUID)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      console.log('USER_ID:', data.user?.id)
    })
  }, [])

  // Persistence state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const demoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoadRef = useRef(true)
  const lastSavedLayoutRef = useRef<string | null>(null)

  // Phase 1 layout canvas items (local-only, no persistence)
  const [layoutItems, setLayoutItems] = useState<Array<{
    id: string
    type: 'Base' | 'Wall' | 'Tall'
  }>>([])

  // Wall elevation state
  const [placements, setPlacements] = useState<WallCabinetPlacement[]>(DEFAULT_WALL_PLACEMENTS)
  const [wallLabel, setWallLabel] = useState(DEFAULT_WALL_LABEL)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [scale, setScale] = useState(10) // Default scale: 10 px per inch (smaller initial view)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastGoodSvg, setLastGoodSvg] = useState<string | null>(null)
  const [lastGoodMeta, setLastGoodMeta] = useState<{
    width_px: number
    height_px: number
    cabinetFrames: Array<{
      id: string
      cabinet_label: string
      x_px: number
      y_px: number
      width_px: number
      height_px: number
    }>
    warnings: string[]
  } | null>(null)
  // Single source of truth for which cabinet is selected (canvas + list both use this). Never two.
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null)

  // Reorder cabinet stack (recompute x_from_left_in left-to-right with wall margin)
  const reorderPlacements = (fromIndex: number, toIndex: number): WallCabinetPlacement[] => {
    const copy = [...placements]
    const [removed] = copy.splice(fromIndex, 1)
    copy.splice(toIndex, 0, removed)
    let x = WALL_EDGE_MARGIN_IN
    return copy.map((p) => {
      const next = { ...p, x_from_left_in: x }
      x += p.cabinet_width_in + GAP_IN
      return next
    })
  }
  const handleMoveUp = (id: string) => {
    const i = placements.findIndex((p) => p.id === id)
    if (i <= 0) return
    setPlacements(reorderPlacements(i, i - 1))
  }
  const handleMoveDown = (id: string) => {
    const i = placements.findIndex((p) => p.id === id)
    if (i < 0 || i >= placements.length - 1) return
    setPlacements(reorderPlacements(i, i + 1))
  }

  // Apply cabinet from Cabinet Builder when user arrives via "Add to Wall"
  useEffect(() => {
    if (searchParams.get('fromCabinet') !== '1') return
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(ADD_TO_WALL_STORAGE_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as CabinetFromBuilderPayload
      const id = `cab-from-builder-${Date.now()}`
      sessionStorage.removeItem(ADD_TO_WALL_STORAGE_KEY)
      setPlacements((prev) => {
        const rightEdge =
          prev.length > 0
            ? Math.max(...prev.map((pl) => pl.x_from_left_in + pl.cabinet_width_in))
            : WALL_EDGE_MARGIN_IN - GAP_IN
        const newPlacement: WallCabinetPlacement = {
          id,
          cabinet_label: p.cabinet_label,
          x_from_left_in: rightEdge + GAP_IN,
          cabinet_width_in: p.width_in,
          cabinet_height_in: p.height_in,
          cabinet_depth_in: p.depth_in,
          type: p.type,
          construction: p.construction,
          shelves: p.shelves,
          opening: {
            drawer_openings: p.opening.drawer_openings,
            door_openings: p.opening.door_openings,
            top_drawer_height_in: p.opening.top_drawer_height_in,
            middle_drawer_height_in: p.opening.middle_drawer_height_in,
            remaining_drawer_height_in: p.opening.remaining_drawer_height_in,
            door_region_height_in: p.opening.door_region_height_in,
            reveal_gap_in: p.opening.reveal_gap_in,
          },
          face_frame: {
            enabled: p.face_frame.enabled,
            stile_width_in: p.face_frame.stile_width_in,
            top_rail_width_in: p.face_frame.top_rail_width_in,
            middle_rail_width_in: p.face_frame.middle_rail_width_in,
            bottom_rail_width_in: p.face_frame.bottom_rail_width_in,
          },
        }
        return [...prev, newPlacement]
      })
      setAddedFromCabinetId(id)
      setSelectedPlacementId(id)
    } catch {
      if (raw != null) {
        try {
          sessionStorage.removeItem(ADD_TO_WALL_STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
    }
  }, [searchParams])

  // Auto-dismiss cabinet-added banner after ~2s
  useEffect(() => {
    if (!addedFromCabinetId) return
    const t = setTimeout(() => setAddedFromCabinetId(null), 2000)
    return () => clearTimeout(t)
  }, [addedFromCabinetId])

  // Sync projectId from URL into selected project (e.g. from "Open Wall Elevation" on project page)
  useEffect(() => {
    const pid = searchParams.get('projectId')
    if (pid && pid.trim()) setSelectedProjectId(pid.trim())
  }, [searchParams])

  // Load projects for logged-in owners
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          return // Demo mode - no projects to load
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'owner') {
          setLoadingProjects(true)
          const { data: projectsData } = await supabase
            .from('projects')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

          if (projectsData) {
            setProjects(projectsData)
          }
        }
      } catch (error) {
        console.error('[WallElevationPage] Error loading projects:', error)
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [])

  // Load demo layout from localStorage when in demo mode (survives refresh)
  useEffect(() => {
    if (selectedProjectId !== null) return
    if (searchParams.get('fromCabinet') === '1') return
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DEMO_LAYOUT_KEY) : null
      if (!raw) return
      const data = JSON.parse(raw) as {
        placements?: WallCabinetPlacement[]
        wallLabel?: string
        scale?: number
        showDimensions?: boolean
        showLabels?: boolean
      }
      if (data.placements && Array.isArray(data.placements) && data.placements.length > 0) {
        setPlacements(data.placements)
      }
      if (data.wallLabel != null) setWallLabel(String(data.wallLabel))
      if (typeof data.scale === 'number' && data.scale > 0) setScale(data.scale)
      if (typeof data.showDimensions === 'boolean') setShowDimensions(data.showDimensions)
      if (typeof data.showLabels === 'boolean') setShowLabels(data.showLabels)
    } catch {
      // ignore invalid or old data
    }
  }, [selectedProjectId, searchParams])

  // Persist demo layout to localStorage when in demo mode (debounced)
  useEffect(() => {
    if (selectedProjectId !== null) return
    if (demoSaveTimeoutRef.current) clearTimeout(demoSaveTimeoutRef.current)
    demoSaveTimeoutRef.current = setTimeout(() => {
      try {
        if (typeof window === 'undefined') return
        const payload = {
          placements,
          wallLabel,
          scale,
          showDimensions,
          showLabels,
        }
        localStorage.setItem(DEMO_LAYOUT_KEY, JSON.stringify(payload))
      } catch {
        // ignore
      }
      demoSaveTimeoutRef.current = null
    }, 500)
    return () => {
      if (demoSaveTimeoutRef.current) clearTimeout(demoSaveTimeoutRef.current)
    }
  }, [selectedProjectId, placements, wallLabel, scale, showDimensions, showLabels])

  // Load saved layout when project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      return // Demo mode - no project selected
    }

    const loadSavedLayout = async () => {
      try {
        const supabase = createClient()
        const savedLayout = await getProjectLayout(supabase, selectedProjectId)

        if (savedLayout) {
          // Restore saved state; single selection: no auto-select on load
          setPlacements(savedLayout.placements || DEFAULT_WALL_PLACEMENTS)
          setWallLabel(savedLayout.wallLabel || DEFAULT_WALL_LABEL)
          setScale(savedLayout.scale || 10)
          setShowDimensions(savedLayout.showDimensions !== undefined ? savedLayout.showDimensions : true)
          setShowLabels(savedLayout.showLabels !== undefined ? savedLayout.showLabels : true)
          setSelectedPlacementId(null)
          isInitialLoadRef.current = true // Mark as initial load to prevent immediate save
        }
      } catch (error) {
        console.error('[WallElevationPage] Error loading saved layout:', error)
      }
    }

    loadSavedLayout()
  }, [selectedProjectId])

  // Auto-save with debounce (1500ms)
  useEffect(() => {
    // Skip save on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return
    }

    // Skip save if no project selected (demo mode)
    if (!selectedProjectId) {
      return
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Create current layout snapshot for comparison
    const currentLayout = JSON.stringify({
      placements,
      wallLabel,
      scale,
      showDimensions,
      showLabels,
    })

    // Skip save if nothing changed
    if (currentLayout === lastSavedLayoutRef.current) {
      return
    }

    // Set saving status
    setSaveStatus('saving')
    setSaveError(null)

    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        const result = await upsertProjectLayout(supabase, selectedProjectId, {
          placements,
          wallLabel,
          scale,
          showDimensions,
          showLabels,
        })

        if (result.success) {
          setSaveStatus('saved')
          setLastSavedAt(result.updated_at || new Date().toISOString())
          lastSavedLayoutRef.current = currentLayout
        } else {
          setSaveStatus('error')
          setSaveError(result.error || 'Failed to save layout')
        }
      } catch (error: any) {
        setSaveStatus('error')
        setSaveError(error.message || 'Failed to save layout')
      }
    }, 1500)

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [placements, wallLabel, scale, showDimensions, showLabels, selectedProjectId])

  // Retry save function
  const handleRetrySave = async () => {
    if (!selectedProjectId) return

    setSaveStatus('saving')
    setSaveError(null)

    try {
      const supabase = createClient()
      const result = await upsertProjectLayout(supabase, selectedProjectId, {
        placements,
        wallLabel,
        scale,
        showDimensions,
        showLabels,
      })

      if (result.success) {
        setSaveStatus('saved')
        setLastSavedAt(result.updated_at || new Date().toISOString())
        lastSavedLayoutRef.current = JSON.stringify({
          placements,
          wallLabel,
          scale,
          showDimensions,
          showLabels,
        })
      } else {
        setSaveStatus('error')
        setSaveError(result.error || 'Failed to save layout')
      }
    } catch (error: any) {
      setSaveStatus('error')
      setSaveError(error.message || 'Failed to save layout')
    }
  }

  // Deep copy helper for placements (avoid mutation)
  const deepCopyPlacements = (placements: WallCabinetPlacement[]): WallCabinetPlacement[] => {
    return placements.map(p => ({
      ...p,
      opening: { ...p.opening },
      face_frame: { ...p.face_frame },
    }))
  }

  // Load demo preset
  const handleLoadDemo = () => {
    const preset = WALL_PRESETS.find(p => p.id === selectedPresetId)
    if (preset) {
      setPlacements(deepCopyPlacements(preset.placements))
      setWallLabel(preset.wallLabel)
    }
  }

  // Reset to default wall state
  const handleReset = () => {
    setPlacements(deepCopyPlacements(DEFAULT_WALL_PLACEMENTS))
    setWallLabel(DEFAULT_WALL_LABEL)
    setSelectedPresetId('')
  }

  // Phase 1: add a simple item to the layout canvas
  const handleAddLayoutItem = (type: 'Base' | 'Wall' | 'Tall') => {
    setLayoutItems((prev) => [
      ...prev,
      { id: `${type}-${Date.now()}`, type },
    ])
  }

  // Parse error message for user-friendly display
  const parseError = (errorMessage: string): { message: string; hint?: string } => {
    if (errorMessage.startsWith('cabinet_overlap:')) {
      const parts = errorMessage.split(':')
      if (parts.length >= 3) {
        const id1 = parts[1]
        const id2 = parts[2]
        return {
          message: errorMessage,
          hint: `Cabinets overlap: ${id1} and ${id2}. Adjust X positions or widths.`,
        }
      }
    }
    return { message: errorMessage }
  }

  // Compute wall elevation with last-good fallback
  const wallResult = useMemo(() => {
    try {
      setLastError(null)
      
      // Validate inputs
      if (!placements || placements.length === 0) {
        return null
      }
      
      // Ensure scale is valid
      const validScale = scale && scale > 0 ? scale : 10
      
      const input: WallElevationInput = {
        wall_label: wallLabel || 'Wall',
        placements,
        scale_px_per_in: validScale,
        show_dimensions: showDimensions,
        show_labels: showLabels,
        align_bottoms: true,
        selected_placement_id: selectedPlacementId ?? undefined,
      }
      const result = generateWallElevation(input)
      
      // Validate result
      if (!result || !result.svg || !result.width_px || !result.height_px) {
        throw new Error('Invalid result from wall elevation generator')
      }
      
      // Update last-good state on success
      setLastGoodSvg(result.svg)
      setLastGoodMeta({
        width_px: result.width_px,
        height_px: result.height_px,
        cabinetFrames: result.cabinetFrames || [],
        warnings: result.warnings || [],
      })
      return result
    } catch (error: any) {
      console.error('Wall elevation error:', error)
      const errorInfo = parseError(error.message || 'Failed to generate wall elevation')
      setLastError(errorInfo.message)
      // Return null to trigger fallback to last-good render
      return null
    }
  }, [placements, wallLabel, scale, showDimensions, showLabels, selectedPlacementId])

  const WORKFLOW_STEPS = [
    { label: 'Cabinet Builder', href: '/cabinet-builder' },
    { label: 'Wall Elevation', href: '/wall-elevation', current: true },
    { label: 'Design Preview', href: '/design-preview' },
  ]

  const hasBlockingError = !!lastError
  const canContinue = placements.length > 0 && !hasBlockingError
  // When a project is selected, require a successful save before Continue (avoids preview "not found")
  const canContinueToPreview = canContinue && (!selectedProjectId || saveStatus === 'saved')

  const scrollToChooseProject = () => {
    document.getElementById('save-to-project')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => document.getElementById('wall-save-project')?.focus(), 400)
  }

  const projectName = selectedProjectId ? (projects.find((p) => p.id === selectedProjectId)?.name ?? selectedProjectId) : null
  const breadcrumbItems = selectedProjectId
    ? [
        { label: 'Owner', href: '/owner' },
        { label: 'Projects', href: '/owner/projects' },
        { label: projectName ?? 'Project', href: `/owner/projects/${selectedProjectId}` },
        { label: 'Wall Elevation' },
      ]
    : [{ label: 'Wall Elevation' }]

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-28">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        {selectedProjectId && (
          <p className="mb-4 text-sm text-gray-600">
            <Link href={`/owner/projects/${selectedProjectId}`} className="font-medium text-gray-700 hover:text-gray-900">
              ← Back to project
            </Link>
          </p>
        )}
        {/* Breadcrumb: Cabinet Builder → Wall Elevation → Design Preview */}
        <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600" aria-label="Breadcrumb">
          {WORKFLOW_STEPS.map((step, i) => (
            <span key={step.href} className="flex items-center gap-x-2">
              {i > 0 && <span className="text-gray-400">/</span>}
              {'current' in step && step.current ? (
                <span className="font-medium text-gray-900">{step.label}</span>
              ) : (
                <Link href={step.href} className="hover:text-gray-900">
                  {step.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <header className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isLayoutMode ? 'Cabinet Layout Designer' : 'Wall Elevation'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {!isLayoutMode
              ? 'Confirm layout and proportions before client presentation.'
              : 'Layout planning view. Elevation tools reused for accuracy and consistency.'}
          </p>
        </header>

        {/* Demo mode banner: not saved — choose project */}
        {!selectedProjectId && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3" role="status">
            <p className="text-sm font-medium text-amber-900 mb-2">
              Not saved — Choose a project to save this wall layout.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={scrollToChooseProject}
                className="rounded-md border border-amber-600 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                Choose Project
              </button>
              <span
                className="rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-500 cursor-not-allowed"
                title="Choose a project first"
              >
                Save Wall
              </span>
            </div>
          </div>
        )}

        {/* Design Status (read-only readiness) */}
        <div className="mb-4">
          <DesignStatusBar
            placementsCount={placements.length}
            lastError={lastError}
            wallLabel={wallLabel}
            dimensionsLocked={dimensionsLocked}
          />
        </div>

        {/* Save to project — always visible so workflow is obvious */}
        <section id="save-to-project" className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3" aria-label="Save to project">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="wall-save-project" className="text-sm font-medium text-gray-700 shrink-0">
                Save to project
              </label>
              <select
                id="wall-save-project"
                value={selectedProjectId || ''}
                onChange={(e) => {
                  const projectId = e.target.value || null
                  setSelectedProjectId(projectId)
                  isInitialLoadRef.current = true
                  lastSavedLayoutRef.current = null
                }}
                disabled={loadingProjects}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[200px]"
              >
                <option value="">Demo mode (not saved)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              {loadingProjects && (
                <span className="text-sm text-gray-500">Loading projects…</span>
              )}
            </div>
            {selectedProjectId && (
              <div className="flex items-center gap-2 text-sm">
                {saveStatus === 'saving' && <span className="text-gray-600">Saving…</span>}
                {saveStatus === 'saved' && lastSavedAt && (
                  <span className="text-green-600">Saved ✓ {new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                )}
                {saveStatus === 'idle' && (
                  <span className="text-amber-600">Not saved ●</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-red-600">{saveError || 'Failed to save'}</span>
                )}
              </div>
            )}
          </div>
        </section>

        {addedFromCabinetId && (() => {
          const label = placements.find((p) => p.id === addedFromCabinetId)?.cabinet_label
          return (
            <div className="mb-4 py-2 px-4 rounded-md border border-gray-200 bg-white text-sm text-gray-700 transition-opacity duration-300" role="status">
              {label ? `Last added: ${label}` : 'Cabinet added to wall.'}
            </div>
          )
        })()}

        {/* Hero: Elevation Canvas — selected cabinet highlighted on canvas; “Selected:” label for clarity */}
        <section className="mb-6 bg-white rounded-lg border border-gray-200 p-4 sm:p-6" aria-label="Elevation">
          <div className="mb-2 text-sm text-gray-600">
            {selectedPlacementId ? (
              <>Selected: {placements.find((p) => p.id === selectedPlacementId)?.cabinet_label ?? selectedPlacementId}</>
            ) : (
              <>Selected: None</>
            )}
          </div>
          {wallResult ? (
            <WallSvgPreview
              svg={wallResult.svg}
              width={wallResult.width_px}
              height={wallResult.height_px}
              selectedPlacementId={selectedPlacementId}
              cabinetFrames={wallResult.cabinetFrames}
            />
          ) : lastGoodSvg && lastGoodMeta ? (
            <WallSvgPreview
              svg={lastGoodSvg}
              width={lastGoodMeta.width_px}
              height={lastGoodMeta.height_px}
              selectedPlacementId={selectedPlacementId}
              cabinetFrames={lastGoodMeta.cabinetFrames}
            />
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
              {lastError ? 'Fix overlaps or add cabinets to see elevation.' : 'Loading…'}
            </div>
          )}
        </section>

        {/* Wall Configuration (simplified) + Cabinet List (reorderable stack) */}
        <section className="mb-6 bg-white rounded-lg shadow p-4 sm:p-6" aria-label="Wall configuration and cabinet list">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Wall &amp; cabinets</h2>
          {!isLayoutMode && placements.length > 0 && !selectedPlacementId && (
            <p className="text-sm text-gray-500 mb-3">Click a cabinet to inspect or adjust placement.</p>
          )}
          <WallEditor
            placements={placements}
            onPlacementsChange={setPlacements}
            wallLabel={wallLabel}
            onWallLabelChange={setWallLabel}
            scale={scale}
            onScaleChange={setScale}
            showDimensions={showDimensions}
            onShowDimensionsChange={setShowDimensions}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            addedPlacementIdToExpand={addedFromCabinetId}
            dimensionsLocked={dimensionsLocked}
            compact={!isLayoutMode}
            summaryOnly={!isLayoutMode}
            addButtonLabel="Add from Cabinet Builder"
            addButtonHref="/cabinet-builder"
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            selectedPlacementId={selectedPlacementId}
            onSelectPlacement={setSelectedPlacementId}
          />
        </section>

        {/* Advanced (collapsed by default): project/save, demo presets, lock, manufacturing, layout mode, canvas px/count */}
        <section className="mb-6" aria-label="Advanced options">
          <AdvancedPanel title="Advanced" defaultOpen={false}>
            {isLayoutMode && (
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Layout Mode (Phase 1)</h3>
                <p className="text-xs text-gray-500 mb-3">No drag/drop yet — click to add items.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleAddLayoutItem('Base')} className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100">
                    Base Cabinet
                  </button>
                  <button type="button" onClick={() => handleAddLayoutItem('Wall')} className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100">
                    Wall Cabinet
                  </button>
                  <button type="button" onClick={() => handleAddLayoutItem('Tall')} className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100">
                    Tall Cabinet
                  </button>
                </div>
                {layoutItems.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {layoutItems.map((item) => (
                      <span key={item.id} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-sm text-gray-700">
                        {item.type} Cabinet
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Demo presets</h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Select a preset…</option>
                  {WALL_PRESETS?.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name} – {preset.description}</option>
                  )) ?? null}
                </select>
                <button type="button" onClick={handleLoadDemo} disabled={!selectedPresetId} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Load Demo
                </button>
                <button type="button" onClick={handleReset} className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">
                  Reset
                </button>
              </div>
            </div>
            {!isLayoutMode && placements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Production</h3>
                {!dimensionsLocked ? (
                  <button
                    type="button"
                    onClick={() => { setDimensionsLocked(true); setDimensionsLockedState(true) }}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Lock dimensions
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">Dimensions locked</span>
                )}
                <p className="text-xs text-gray-500">Manufacturing-ready when elevation is valid; cut lists come from Cabinet Builder.</p>
              </div>
            )}
            {(() => {
              const m = wallResult ?? lastGoodMeta
              if (!m) return null
              return (
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  Canvas: {m.width_px} × {m.height_px} px · {m.cabinetFrames?.length ?? 0} cabinets
                </div>
              )
            })()}
          </AdvancedPanel>
        </section>
      </div>

      {/* Sticky Save bar: Status + Save Wall + Continue to Design Preview */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/cabinet-builder" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
              Add from Cabinet Builder
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            {selectedProjectId ? (
              <Link href={`/owner/projects/${selectedProjectId}`} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Back to project
              </Link>
            ) : (
              <Link href="/owner" className="text-sm text-gray-500 hover:text-gray-700">
                Back to dashboard
              </Link>
            )}
            <span className="text-gray-400 hidden sm:inline">|</span>
            <span className="text-sm text-gray-600" aria-live="polite">
              {!selectedProjectId && 'Demo mode (not saved)'}
              {selectedProjectId && saveStatus === 'idle' && 'Not saved ●'}
              {selectedProjectId && saveStatus === 'saving' && 'Saving…'}
              {selectedProjectId && saveStatus === 'saved' && lastSavedAt && (
                <>Saved ✓ {new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</>
              )}
              {selectedProjectId && saveStatus === 'error' && (
                <>
                  <span className="text-red-600">Error</span>
                  <button type="button" onClick={handleRetrySave} className="ml-2 text-sm font-medium text-blue-600 hover:underline">Retry</button>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selectedProjectId && (
              <button
                type="button"
                onClick={handleRetrySave}
                disabled={saveStatus === 'saving'}
                className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save Wall'}
              </button>
            )}
            {canContinueToPreview ? (
              <Link
                href={selectedProjectId ? `/design-preview?projectId=${encodeURIComponent(selectedProjectId)}` : '/design-preview'}
                className="rounded-md border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Continue to Design Preview →
              </Link>
            ) : (
              <span
                className="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
                title={
                  !canContinue
                    ? placements.length === 0
                      ? 'Add cabinets to continue'
                      : 'Fix overlaps to continue'
                    : selectedProjectId && saveStatus !== 'saved'
                      ? 'Save Wall to continue'
                      : undefined
                }
              >
                Continue to Design Preview →
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function WallElevationPage(props: WallElevationPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <WallElevationContent {...props} />
    </Suspense>
  )
}
