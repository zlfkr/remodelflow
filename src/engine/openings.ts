import { CabinetType, Construction } from './types';

/**
 * Rounds a number to 3 decimal places
 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Checks if two numbers are nearly equal within tolerance
 */
function nearlyEqual(a: number, b: number, tol: number = 0.01): boolean {
  return Math.abs(a - b) <= tol;
}

export interface FaceFrameRailRules {
  enabled: boolean;
  stile_width_in: number;           // SW (used only to compute inner width later; not needed for vertical)
  top_rail_width_in: number;        // TRW
  middle_rail_width_in: number;     // MRW (used for mid rails between openings)
  bottom_rail_width_in: number;     // BRW
}

export interface OpeningConfig {
  drawer_openings: number;          // 0..n (n drawers stacked from top to bottom, above the door opening region)
  top_drawer_height_in?: number;    // required if drawer_openings >= 1
  middle_drawer_height_in?: number; // required if drawer_openings >= 2
  remaining_drawer_height_in?: number; // optional; if not provided, remaining drawers split evenly

  door_openings: number;            // 0..2 (0 = none, 1 = single door region, 2 = double door region)
  door_region_height_in?: number;    // optional explicit door region height

  reveal_gap_in?: number;           // space between rails and openings (default 0)
}

export interface CabinetLayoutInput {
  cabinet_label: string;
  type: CabinetType;
  construction: Construction;
  width_in: number;                 // W (not used for vertical)
  height_in: number;                // H
  face_frame: FaceFrameRailRules;   // enabled/disabled
  opening: OpeningConfig;
}

export interface RailPlacement {
  key: "TOP" | "MID" | "BOTTOM";
  index: number;                    // MID rails indexed from 1..n, TOP/BOTTOM index = 1
  y_from_top_in: number;            // top edge position from top of cabinet front
  rail_width_in: number;            // TRW/MRW/BRW
}

export interface OpeningRect {
  key: "DRAWER" | "DOOR";
  index: number;                    // drawers 1..n from top; doors always 1
  y_from_top_in: number;            // top edge of opening region
  height_in: number;                // opening height (usable opening height, excluding rails and reveal gaps)
}

export interface CabinetFrontLayout {
  cabinet_label: string;
  height_in: number;                // H
  rails: RailPlacement[];           // empty if frameless or face_frame.enabled false
  openings: OpeningRect[];          // always computed from config, even if no rails
  warnings: string[];               // non-fatal notes (e.g., "even_split_used")
}

/**
 * Validates cabinet layout input
 * Throws Error with clear message if validation fails
 */
function validateLayoutInput(input: CabinetLayoutInput): void {
  const { height_in: H, face_frame, opening } = input;
  const {
    drawer_openings,
    top_drawer_height_in,
    middle_drawer_height_in,
    door_openings,
    reveal_gap_in: G,
  } = opening;
  const {
    enabled: frameEnabled,
    top_rail_width_in: TRW,
    middle_rail_width_in: MRW,
    bottom_rail_width_in: BRW,
  } = face_frame;

  // Height check
  if (H <= 0) {
    throw new Error('Height must be > 0');
  }

  // Drawer openings validation
  if (drawer_openings < 0) {
    throw new Error('drawer_openings must be >= 0');
  }

  if (drawer_openings >= 1) {
    if (top_drawer_height_in === undefined || top_drawer_height_in <= 0) {
      throw new Error('top_drawer_height_in must be provided and > 0 when drawer_openings >= 1');
    }
  }

  if (drawer_openings >= 2) {
    if (middle_drawer_height_in === undefined || middle_drawer_height_in <= 0) {
      throw new Error('middle_drawer_height_in must be provided and > 0 when drawer_openings >= 2');
    }
  }

  // Door openings validation
  if (door_openings < 0 || door_openings > 2) {
    throw new Error('door_openings must be 0, 1, or 2');
  }

  // Reveal gap validation
  const revealGap = G ?? 0;
  if (revealGap < 0 || revealGap >= 1) {
    throw new Error('reveal_gap_in must be >= 0 and < 1');
  }

  // Face frame validation
  if (frameEnabled) {
    if (TRW <= 0 || TRW >= 6) {
      throw new Error('top_rail_width_in must be > 0 and < 6 inches');
    }
    if (MRW <= 0 || MRW >= 6) {
      throw new Error('middle_rail_width_in must be > 0 and < 6 inches');
    }
    if (BRW <= 0 || BRW >= 6) {
      throw new Error('bottom_rail_width_in must be > 0 and < 6 inches');
    }
  }
}

/**
 * Computes the vertical layout of openings and face-frame rails for a cabinet front
 */
export function computeCabinetFrontLayout(
  input: CabinetLayoutInput
): CabinetFrontLayout {
  validateLayoutInput(input);

  const {
    cabinet_label,
    height_in: H,
    construction,
    face_frame,
    opening,
  } = input;

  const {
    enabled: frameEnabled,
    top_rail_width_in: TRW,
    middle_rail_width_in: MRW,
    bottom_rail_width_in: BRW,
  } = face_frame;

  const {
    drawer_openings,
    top_drawer_height_in,
    middle_drawer_height_in,
    remaining_drawer_height_in,
    door_openings,
    door_region_height_in,
    reveal_gap_in: G = 0,
  } = opening;

  const warnings: string[] = [];
  const rails: RailPlacement[] = [];
  const openings: OpeningRect[] = [];

  // Check if face frame is enabled
  const hasFaceFrame =
    construction === 'face_frame' && frameEnabled;

  if (!hasFaceFrame) {
    warnings.push('no_face_frame');
  }

  // Compute drawer heights
  const drawerHeights: number[] = [];
  if (drawer_openings >= 1) {
    drawerHeights.push(top_drawer_height_in!);
  }
  if (drawer_openings >= 2) {
    drawerHeights.push(middle_drawer_height_in!);
  }
  if (drawer_openings > 2) {
    if (remaining_drawer_height_in !== undefined) {
      // Use provided height for remaining drawers
      for (let i = 2; i < drawer_openings; i++) {
        drawerHeights.push(remaining_drawer_height_in);
      }
    } else {
      // Will compute after door height is determined
      // For now, mark that we'll need to split
      warnings.push('even_split_used');
    }
  }

  // Compute door region height
  let doorHeight: number;
  if (door_openings === 0) {
    doorHeight = 0;
  } else {
    if (door_region_height_in !== undefined) {
      doorHeight = door_region_height_in;
    } else {
      // Will compute after all rails and drawer heights are known
      doorHeight = 0; // Placeholder, will compute later
    }
  }

  // Compute mid rail count
  let midRailCount = 0;
  if (hasFaceFrame) {
    // mid_rail_count = (drawer_openings > 0 ? drawer_openings : 0) + (door_openings > 0 ? 1 : 0) - 1
    const drawerTerm = drawer_openings > 0 ? drawer_openings : 0;
    const doorTerm = door_openings > 0 ? 1 : 0;
    midRailCount = drawerTerm + doorTerm - 1;
    if (midRailCount < 0) {
      midRailCount = 0;
    }
  }

  // If we need to compute remaining drawer heights or door height, do it now
  if (hasFaceFrame) {
    // Total rail space: TOP + BOTTOM + mid rails
    const totalRailSpace = TRW + BRW + midRailCount * MRW;
    // Total gap space: 2*G per opening (top and bottom reveal)
    const totalGapSpace = (drawer_openings + (door_openings > 0 ? 1 : 0)) * 2 * G;
    // Available space for openings
    const availableForOpenings = H - totalRailSpace - totalGapSpace;

    // Sum of known drawer heights
    let knownDrawerSum = drawerHeights.reduce((sum, h) => sum + h, 0);

    if (drawer_openings > 2 && remaining_drawer_height_in === undefined) {
      // Need to compute remaining drawer heights
      // First, compute door height if not provided
      if (door_region_height_in === undefined && door_openings > 0) {
        // Door takes remaining space after known drawers
        doorHeight = availableForOpenings - knownDrawerSum;
      } else if (door_region_height_in !== undefined) {
        // Door height is known, compute remaining drawers
        const remainingForDrawers = availableForOpenings - doorHeight;
        const remainingDrawerCount = drawer_openings - 2;
        const remainingDrawerHeight = remainingForDrawers / remainingDrawerCount;
        for (let i = 2; i < drawer_openings; i++) {
          drawerHeights.push(remainingDrawerHeight);
        }
      }
    } else if (door_region_height_in === undefined && door_openings > 0) {
      // Door height not provided, compute it
      if (remaining_drawer_height_in !== undefined) {
        knownDrawerSum += remaining_drawer_height_in * (drawer_openings - 2);
      }
      doorHeight = availableForOpenings - knownDrawerSum;
    }

    // Validate reveal gaps don't make openings too small
    drawerHeights.forEach((height, idx) => {
      if (height - 2 * G <= 0) {
        throw new Error('reveal_gap_too_large');
      }
    });
    if (doorHeight > 0 && doorHeight - 2 * G <= 0) {
      throw new Error('reveal_gap_too_large');
    }
  } else {
    // Frameless: no rails, no gaps
    if (drawer_openings > 2 && remaining_drawer_height_in === undefined) {
      // Compute remaining drawer heights
      if (door_region_height_in !== undefined) {
        const remainingForDrawers = H - door_region_height_in - drawerHeights.reduce((sum, h) => sum + h, 0);
        const remainingDrawerCount = drawer_openings - 2;
        const remainingDrawerHeight = remainingForDrawers / remainingDrawerCount;
        for (let i = 2; i < drawer_openings; i++) {
          drawerHeights.push(remainingDrawerHeight);
        }
      } else {
        // Door takes remaining space
        const knownDrawerSum = drawerHeights.reduce((sum, h) => sum + h, 0);
        doorHeight = H - knownDrawerSum;
        // No remaining drawers to compute in this case
      }
    } else if (door_region_height_in === undefined && door_openings > 0) {
      // Compute door height
      const knownDrawerSum = drawerHeights.reduce((sum, h) => sum + h, 0);
      if (remaining_drawer_height_in !== undefined) {
        doorHeight = H - knownDrawerSum - remaining_drawer_height_in * (drawer_openings - 2);
      } else {
        doorHeight = H - knownDrawerSum;
      }
    }
  }

  // Round all heights
  drawerHeights.forEach((h, i) => {
    drawerHeights[i] = round3(h);
  });
  doorHeight = round3(doorHeight);

  // Position computation
  if (hasFaceFrame) {
    // Face frame enabled: compute rail and opening positions
    let cursor = 0;

    // 1) Place TOP rail
    rails.push({
      key: 'TOP',
      index: 1,
      y_from_top_in: round3(cursor),
      rail_width_in: round3(TRW),
    });
    cursor += TRW;

    // 2) Place openings with MID rails
    const allOpenings: Array<{ type: 'drawer' | 'door'; height: number; index: number }> = [];

    // Add drawers
    for (let i = 0; i < drawer_openings; i++) {
      allOpenings.push({
        type: 'drawer',
        height: drawerHeights[i],
        index: i + 1,
      });
    }

    // Add door if any
    if (door_openings > 0) {
      allOpenings.push({
        type: 'door',
        height: doorHeight,
        index: 1,
      });
    }

    // Place openings and mid rails
    for (let i = 0; i < allOpenings.length; i++) {
      const opening = allOpenings[i];

      // Place MID rail before this opening (except first)
      if (i > 0) {
        const midRailIndex = i; // MID rails numbered from 1
        rails.push({
          key: 'MID',
          index: midRailIndex,
          y_from_top_in: round3(cursor),
          rail_width_in: round3(MRW),
        });
        cursor += MRW;
      }

      // Place opening
      const openingTop = cursor;
      const openingY = openingTop + G;
      const openingHeight = opening.height - 2 * G;

      openings.push({
        key: opening.type === 'drawer' ? 'DRAWER' : 'DOOR',
        index: opening.index,
        y_from_top_in: round3(openingY),
        height_in: round3(openingHeight),
      });

      cursor += opening.height;
    }

    // 3) Validate cursor position
    const expectedBottom = H - BRW;
    if (!nearlyEqual(cursor, expectedBottom, 0.01)) {
      if (door_region_height_in === undefined && door_openings > 0) {
        // Adjust door height to fit
        const adjustment = expectedBottom - cursor;
        doorHeight = round3(doorHeight + adjustment);
        // Update door opening height
        const doorOpening = openings.find((o) => o.key === 'DOOR');
        if (doorOpening) {
          doorOpening.height_in = round3(doorHeight - 2 * G);
        }
        cursor = expectedBottom;
      } else {
        throw new Error('height_mismatch');
      }
    }

    // 4) Place BOTTOM rail
    rails.push({
      key: 'BOTTOM',
      index: 1,
      y_from_top_in: round3(H - BRW),
      rail_width_in: round3(BRW),
    });
  } else {
    // Frameless: no rails, no gaps, just stack openings
    let cursor = 0;

    // Place drawers
    for (let i = 0; i < drawer_openings; i++) {
      openings.push({
        key: 'DRAWER',
        index: i + 1,
        y_from_top_in: round3(cursor),
        height_in: round3(drawerHeights[i]),
      });
      cursor += drawerHeights[i];
    }

    // Place door if any
    if (door_openings > 0) {
      openings.push({
        key: 'DOOR',
        index: 1,
        y_from_top_in: round3(cursor),
        height_in: round3(doorHeight),
      });
      cursor += doorHeight;
    }

    // Validate
    if (!nearlyEqual(cursor, H, 0.01)) {
      if (door_region_height_in === undefined && door_openings > 0) {
        // Adjust door height
        const adjustment = H - cursor;
        doorHeight = round3(doorHeight + adjustment);
        const doorOpening = openings.find((o) => o.key === 'DOOR');
        if (doorOpening) {
          doorOpening.height_in = round3(doorHeight);
        }
      } else {
        throw new Error('height_mismatch');
      }
    }
  }

  return {
    cabinet_label,
    height_in: round3(H),
    rails,
    openings,
    warnings,
  };
}
