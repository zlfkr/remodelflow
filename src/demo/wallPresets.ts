import { WallCabinetPlacement } from '@/engine/wallElevation';

export interface WallPreset {
  id: string;
  name: string;
  description: string;
  placements: WallCabinetPlacement[];
  wallLabel: string;
}

/**
 * Preset 1: Kitchen Demo (Face Frame)
 * 3 base cabinets aligned, no overlap + 1 wall cabinet
 */
const KITCHEN_DEMO: WallPreset = {
  id: 'kitchen-demo',
  name: 'Kitchen Demo (Face Frame)',
  description: '3 base cabinets (24", 30", 18") + 1 wall cabinet (30")',
  wallLabel: 'Kitchen Wall',
  placements: [
    {
      id: 'cab1',
      cabinet_label: 'B24-FF-01',
      x_from_left_in: 0,
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
      cabinet_label: 'B30-FF-02',
      x_from_left_in: 24,
      cabinet_width_in: 30,
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
      id: 'cab3',
      cabinet_label: 'B18-FF-03',
      x_from_left_in: 54,
      cabinet_width_in: 18,
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
      id: 'cab4',
      cabinet_label: 'W30-FF-01',
      x_from_left_in: 24,
      cabinet_width_in: 30,
      cabinet_height_in: 30,
      cabinet_depth_in: 12,
      type: 'wall',
      construction: 'face_frame',
      shelves: 2,
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
  ],
};

/**
 * Preset 2: Drawer Stack Demo
 * One cabinet with 3 drawers + one cabinet with 2 doors
 */
const DRAWER_STACK_DEMO: WallPreset = {
  id: 'drawer-stack-demo',
  name: 'Drawer Stack Demo',
  description: '3-drawer cabinet + 2-door cabinet (shows drawer regions and mid rails)',
  wallLabel: 'Drawer Stack Wall',
  placements: [
    {
      id: 'cab1',
      cabinet_label: 'B24-FF-DR',
      x_from_left_in: 0,
      cabinet_width_in: 24,
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
        remaining_drawer_height_in: 6,
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
      cabinet_label: 'B24-FF-DO',
      x_from_left_in: 24,
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
  ],
};

/**
 * Preset 3: Modern Frameless Demo
 * Frameless base run + wall cabinet (shows no face-frame stiles/rails)
 */
const MODERN_FRAMELESS_DEMO: WallPreset = {
  id: 'modern-frameless-demo',
  name: 'Modern Frameless Demo',
  description: 'Frameless base run (36", 24") + wall cabinet (36")',
  wallLabel: 'Modern Frameless Wall',
  placements: [
    {
      id: 'cab1',
      cabinet_label: 'B36-FL-01',
      x_from_left_in: 0,
      cabinet_width_in: 36,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'frameless',
      shelves: 1,
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
    {
      id: 'cab2',
      cabinet_label: 'B24-FL-02',
      x_from_left_in: 36,
      cabinet_width_in: 24,
      cabinet_height_in: 34.5,
      cabinet_depth_in: 24,
      type: 'base',
      construction: 'frameless',
      shelves: 1,
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
    {
      id: 'cab3',
      cabinet_label: 'W36-FL-01',
      x_from_left_in: 0,
      cabinet_width_in: 36,
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
  ],
};

/**
 * All available wall presets
 */
export const WALL_PRESETS: WallPreset[] = [
  KITCHEN_DEMO,
  DRAWER_STACK_DEMO,
  MODERN_FRAMELESS_DEMO,
];

/**
 * Returns the default preset ID (first preset)
 */
export function getDefaultWallPresetId(): string {
  return WALL_PRESETS[0].id;
}
