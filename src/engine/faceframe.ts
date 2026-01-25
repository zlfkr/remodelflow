import { CabinetType, Construction } from './types';
import { round3 } from './validate';

export type DrawerFrontStyle = "none" | "slab" | "five_piece";

export interface FaceFrameRules {
  enabled: boolean;                // if false => return []
  full_length_stiles: boolean;     // if true stiles run full cabinet height
  stile_width_in: number;          // default 1.5
  top_rail_width_in: number;       // default 1.5
  middle_rail_width_in: number;    // default 1.5
  bottom_rail_width_in: number;    // default 1.5
  thickness_in: number;            // default 0.75 (solid wood)
  scribe_length_in: number;        // optional; if >0 extends stile height
}

export interface CabinetFaceFrameInput {
  cabinet_label: string;           // e.g., "B36-FF-01"
  type: CabinetType;
  construction: Construction;      // must be "face_frame" to generate parts
  width_in: number;                // W
  height_in: number;               // H
  door_openings: number;           // number of door openings (0..n). For lite: treat as metadata only.
  drawer_openings: number;         // number of drawer openings (0..n). If >0, generate mid-rails.
  drawer_front_style: DrawerFrontStyle;  // metadata only for now
  top_drawer_height_in?: number;   // optional, used for rail placement validation only
  middle_drawer_height_in?: number;// optional, used for rail placement validation only
}

export type MaterialGroup = "plywood" | "solid";

export interface FaceFramePartRow {
  part_code: string;               // stable unique code per cabinet + part + index
  cabinet_label: string;
  name: string;                    // "Stile", "Top Rail", "Mid Rail", "Bottom Rail"
  material_group: "solid";
  thickness_in: number;
  width_in: number;                // dimension along rail/stile width (board width)
  height_in: number;               // length of piece (rail length or stile length)
  qty: number;
  notes?: string;
}

/**
 * Validates face frame input and rules
 * Throws Error with clear message if validation fails
 */
function validateFaceFrameInput(
  cabinet: CabinetFaceFrameInput,
  rules: FaceFrameRules
): void {
  const { width_in: W, height_in: H, drawer_openings } = cabinet;
  const {
    stile_width_in: SW,
    top_rail_width_in: TRW,
    middle_rail_width_in: MRW,
    bottom_rail_width_in: BRW,
    thickness_in: T,
    scribe_length_in: Scribe,
  } = rules;

  // Basic dimension checks
  if (W <= 0 || H <= 0) {
    throw new Error('Width and height must be greater than 0');
  }

  // Thickness validation
  if (T <= 0 || T >= 2) {
    throw new Error('Thickness must be > 0 and < 2 inches');
  }

  // Rail/stile width validation
  if (SW <= 0 || SW >= 6) {
    throw new Error('Stile width must be > 0 and < 6 inches');
  }
  if (TRW <= 0 || TRW >= 6) {
    throw new Error('Top rail width must be > 0 and < 6 inches');
  }
  if (MRW <= 0 || MRW >= 6) {
    throw new Error('Middle rail width must be > 0 and < 6 inches');
  }
  if (BRW <= 0 || BRW >= 6) {
    throw new Error('Bottom rail width must be > 0 and < 6 inches');
  }

  // Stile width constraint: 2*SW must be < W
  if (SW * 2 >= W) {
    throw new Error(`Stile width * 2 (${SW * 2}) must be less than cabinet width (${W})`);
  }

  // Scribe length validation
  if (Scribe < 0 || Scribe >= 12) {
    throw new Error('Scribe length must be >= 0 and < 12 inches');
  }

  // If drawer_openings > 0, middle_rail_width must be > 0
  if (drawer_openings > 0 && MRW <= 0) {
    throw new Error('Middle rail width must be > 0 when drawer_openings > 0');
  }

  // Optional drawer height validation
  if (cabinet.top_drawer_height_in !== undefined) {
    if (cabinet.top_drawer_height_in <= 0) {
      throw new Error('Top drawer height must be > 0 if provided');
    }
  }
  if (cabinet.middle_drawer_height_in !== undefined) {
    if (cabinet.middle_drawer_height_in <= 0) {
      throw new Error('Middle drawer height must be > 0 if provided');
    }
  }
  if (
    cabinet.top_drawer_height_in !== undefined &&
    cabinet.middle_drawer_height_in !== undefined
  ) {
    const sum = cabinet.top_drawer_height_in + cabinet.middle_drawer_height_in;
    if (sum >= H) {
      throw new Error(
        `Sum of top and middle drawer heights (${sum}) must be < cabinet height (${H})`
      );
    }
  }
}

/**
 * Generates face-frame parts for a cabinet based on input and rules
 * Returns an array of FaceFramePartRow objects in the specified order
 * Returns empty array if construction is not "face_frame" or rules.enabled is false
 */
export function generateFaceFrameParts(
  cabinet: CabinetFaceFrameInput,
  rules: FaceFrameRules
): FaceFramePartRow[] {
  // Return empty array if not face_frame construction
  if (cabinet.construction !== 'face_frame') {
    return [];
  }

  // Return empty array if rules not enabled
  if (!rules.enabled) {
    return [];
  }

  // Validate inputs
  validateFaceFrameInput(cabinet, rules);

  const parts: FaceFramePartRow[] = [];
  const {
    cabinet_label,
    width_in: W,
    height_in: H,
    drawer_openings,
  } = cabinet;
  const {
    stile_width_in: SW,
    top_rail_width_in: TRW,
    middle_rail_width_in: MRW,
    bottom_rail_width_in: BRW,
    thickness_in: T,
    scribe_length_in: Scribe,
  } = rules;

  // Common rail length
  const railLength = W - 2 * SW;

  // 1) Stiles (qty 2)
  const stileHeight = H + Scribe;
  const stileNotes = Scribe > 0 ? 'includes scribe' : undefined;

  parts.push({
    part_code: `${cabinet_label}:STILE:1`,
    cabinet_label,
    name: 'Stile',
    material_group: 'solid',
    thickness_in: round3(T),
    width_in: round3(SW),
    height_in: round3(stileHeight),
    qty: 1,
    notes: stileNotes,
  });

  parts.push({
    part_code: `${cabinet_label}:STILE:2`,
    cabinet_label,
    name: 'Stile',
    material_group: 'solid',
    thickness_in: round3(T),
    width_in: round3(SW),
    height_in: round3(stileHeight),
    qty: 1,
    notes: stileNotes,
  });

  // 2) Top Rail (qty 1)
  parts.push({
    part_code: `${cabinet_label}:RAIL_TOP:1`,
    cabinet_label,
    name: 'Top Rail',
    material_group: 'solid',
    thickness_in: round3(T),
    width_in: round3(TRW),
    height_in: round3(railLength),
    qty: 1,
  });

  // 3) Mid Rails for drawers (if drawer_openings > 0)
  if (drawer_openings > 0) {
    for (let i = 1; i <= drawer_openings; i++) {
      parts.push({
        part_code: `${cabinet_label}:RAIL_MID:${i}`,
        cabinet_label,
        name: 'Mid Rail',
        material_group: 'solid',
        thickness_in: round3(T),
        width_in: round3(MRW),
        height_in: round3(railLength),
        qty: 1,
        notes: 'drawer separator',
      });
    }
  }

  // 4) Bottom Rail (qty 1)
  parts.push({
    part_code: `${cabinet_label}:RAIL_BOTTOM:1`,
    cabinet_label,
    name: 'Bottom Rail',
    material_group: 'solid',
    thickness_in: round3(T),
    width_in: round3(BRW),
    height_in: round3(railLength),
    qty: 1,
  });

  return parts;
}
