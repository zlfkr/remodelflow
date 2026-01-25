import { PartRow } from './types';
import { FaceFramePartRow } from './faceframe';
import { round3 } from './validate';
import { WallCabinetPlacement, WallElevationInput } from './wallElevation';
import { ShopStandards, CabinetInput } from './types';
import { CabinetFaceFrameInput, FaceFrameRules } from './faceframe';
import { generateCarcassParts } from './carcass';
import { generateFaceFrameParts } from './faceframe';

/**
 * Unified part type (carcass or face frame)
 */
export type UnifiedPartRow = PartRow | FaceFramePartRow;

/**
 * Source reference for traceability
 */
export interface SourceRef {
  cabinetLabel: string;
  partCode: string;
  qty: number;
}

/**
 * Aggregated cut list row
 */
export interface AggregatedCutRow {
  group_code: string; // Stable identifier derived from grouping key
  name: string;
  material_group: 'plywood' | 'solid';
  thickness_in: number; // Normalized
  width_in: number; // Normalized
  height_in: number; // Normalized
  qty_total: number;
  sources: SourceRef[]; // Stable-sorted by cabinetLabel then partCode
  notes?: string; // Merged notes (deterministic ordering)
}

/**
 * Normalizes a dimension to 3 decimal places for grouping
 * This ensures parts with tiny float differences (e.g., 22.5 vs 22.5000001) group together
 */
function normalizeDimension(n: number): number {
  return round3(n);
}

/**
 * Creates a deterministic grouping key for a part
 * Used to identify identical parts across cabinets
 */
function createGroupKey(part: UnifiedPartRow): string {
  const material = part.material_group;
  const thickness = normalizeDimension(part.thickness_in);
  const width = normalizeDimension(part.width_in);
  const height = normalizeDimension(part.height_in);
  const name = part.name;
  
  // Stable key format: material|thickness|width|height|name
  // Using | separator to avoid collisions
  return `${material}|${thickness}|${width}|${height}|${name}`;
}

/**
 * Creates a stable group code from a grouping key
 * Uses a simple hash-like approach for readability
 */
function createGroupCode(key: string): string {
  // Simple deterministic code: take first 3 chars of each component
  // Format: MAT-T-W-H-N (abbreviated)
  const parts = key.split('|');
  if (parts.length !== 5) {
    throw new Error(`Invalid group key format: ${key}`);
  }
  
  const [material, thickness, width, height, name] = parts;
  
  // Abbreviate material: plywood -> PLY, solid -> SOL
  const matAbbr = material === 'plywood' ? 'PLY' : 'SOL';
  
  // Use normalized values (already strings from key)
  // Create readable code: PLY-0.75-24-34.5-SidePanel
  // Replace spaces in name with underscores
  const nameClean = name.replace(/\s+/g, '_');
  
  return `${matAbbr}-${thickness}-${width}-${height}-${nameClean}`;
}

/**
 * Merges notes from multiple parts deterministically
 * Returns undefined if no notes, or a merged string with deterministic ordering
 */
function mergeNotes(notesArray: (string | undefined)[]): string | undefined {
  const uniqueNotes = Array.from(
    new Set(notesArray.filter((n): n is string => n !== undefined && n !== ''))
  );
  
  if (uniqueNotes.length === 0) {
    return undefined;
  }
  
  // Stable sort for deterministic output
  uniqueNotes.sort();
  
  // Join with semicolon for readability
  return uniqueNotes.join('; ');
}

/**
 * Aggregates cut list parts from multiple cabinets
 * Groups identical parts and sums quantities while preserving traceability
 */
export function aggregateCutLists(
  parts: UnifiedPartRow[]
): AggregatedCutRow[] {
  // Group parts by their grouping key
  const groups = new Map<string, UnifiedPartRow[]>();
  
  for (const part of parts) {
    const key = createGroupKey(part);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(part);
  }
  
  // Convert groups to aggregated rows
  const aggregatedRows: AggregatedCutRow[] = [];
  
  for (const [key, groupParts] of groups.entries()) {
    // All parts in a group have identical normalized dimensions and name
    const firstPart = groupParts[0];
    
    // Sum quantities
    const qty_total = groupParts.reduce((sum, p) => sum + p.qty, 0);
    
    // Collect sources (stable-sorted)
    const sources: SourceRef[] = groupParts.map(p => ({
      cabinetLabel: p.cabinet_label,
      partCode: p.part_code,
      qty: p.qty,
    }));
    
    // Stable sort sources by cabinetLabel then partCode
    sources.sort((a, b) => {
      const labelCmp = a.cabinetLabel.localeCompare(b.cabinetLabel);
      if (labelCmp !== 0) return labelCmp;
      return a.partCode.localeCompare(b.partCode);
    });
    
    // Merge notes
    const notes = mergeNotes(groupParts.map(p => p.notes));
    
    aggregatedRows.push({
      group_code: createGroupCode(key),
      name: firstPart.name,
      material_group: firstPart.material_group,
      thickness_in: normalizeDimension(firstPart.thickness_in),
      width_in: normalizeDimension(firstPart.width_in),
      height_in: normalizeDimension(firstPart.height_in),
      qty_total,
      sources,
      notes,
    });
  }
  
  // Stable sort final rows: by material, thickness, name, width, height
  aggregatedRows.sort((a, b) => {
    // 1. Material (plywood before solid)
    const materialCmp = a.material_group.localeCompare(b.material_group);
    if (materialCmp !== 0) return materialCmp;
    
    // 2. Thickness
    const thicknessCmp = a.thickness_in - b.thickness_in;
    if (thicknessCmp !== 0) return thicknessCmp;
    
    // 3. Name
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    
    // 4. Width
    const widthCmp = a.width_in - b.width_in;
    if (widthCmp !== 0) return widthCmp;
    
    // 5. Height
    return a.height_in - b.height_in;
  });
  
  return aggregatedRows;
}

/**
 * Default shop standards for cut list generation
 * Can be overridden per project if needed
 */
const DEFAULT_SHOP_STANDARDS: ShopStandards = {
  carcass_thickness_in: 0.75,
  back_thickness_in: 0.25,
  include_back: true,
  stretcher_width_in: 4.0, // Will be adjusted per cabinet type
  toe_kick_enabled: true,
  toe_kick_height_in: 4.5,
};

/**
 * Converts a wall cabinet placement to cabinet inputs for cut list generation
 */
function placementToCabinetInputs(
  placement: WallCabinetPlacement,
  standards: ShopStandards
): {
  cabinetInput: CabinetInput;
  faceFrameInput: CabinetFaceFrameInput;
  faceFrameRules: FaceFrameRules;
  standards: ShopStandards;
} {
  // Adjust stretcher width based on cabinet type
  const adjustedStandards: ShopStandards = {
    ...standards,
    stretcher_width_in: placement.type === 'wall' ? 3.0 : 4.0,
  };
  
  const cabinetInput: CabinetInput = {
    cabinet_label: placement.cabinet_label,
    type: placement.type,
    construction: placement.construction,
    width_in: placement.cabinet_width_in,
    height_in: placement.cabinet_height_in,
    depth_in: placement.cabinet_depth_in,
    shelves: placement.shelves,
  };
  
  const faceFrameInput: CabinetFaceFrameInput = {
    cabinet_label: placement.cabinet_label,
    type: placement.type,
    construction: placement.construction,
    width_in: placement.cabinet_width_in,
    height_in: placement.cabinet_height_in,
    door_openings: placement.opening.door_openings,
    drawer_openings: placement.opening.drawer_openings,
    drawer_front_style: 'none', // Default, can be extended later
    top_drawer_height_in: placement.opening.top_drawer_height_in,
    middle_drawer_height_in: placement.opening.middle_drawer_height_in,
  };
  
  const faceFrameRules: FaceFrameRules = {
    enabled: placement.face_frame.enabled,
    full_length_stiles: true,
    stile_width_in: placement.face_frame.stile_width_in,
    top_rail_width_in: placement.face_frame.top_rail_width_in,
    middle_rail_width_in: placement.face_frame.middle_rail_width_in,
    bottom_rail_width_in: placement.face_frame.bottom_rail_width_in,
    thickness_in: 0.75, // Standard face frame thickness
    scribe_length_in: 0.25, // Default scribe
  };
  
  return {
    cabinetInput,
    faceFrameInput,
    faceFrameRules,
    standards: adjustedStandards,
  };
}

/**
 * Builds aggregated project cut list from a wall elevation configuration
 */
export function buildWallProjectCutList(
  wallInput: WallElevationInput,
  standards: ShopStandards = DEFAULT_SHOP_STANDARDS
): {
  rows: AggregatedCutRow[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const allParts: UnifiedPartRow[] = [];
  
  // Process each cabinet in the wall
  for (const placement of wallInput.placements) {
    try {
      const {
        cabinetInput,
        faceFrameInput,
        faceFrameRules,
        standards: adjustedStandards,
      } = placementToCabinetInputs(placement, standards);
      
      // Generate carcass parts
      const carcassParts = generateCarcassParts(cabinetInput, adjustedStandards);
      allParts.push(...carcassParts);
      
      // Generate face frame parts (if enabled)
      if (faceFrameRules.enabled && placement.construction === 'face_frame') {
        const faceFrameParts = generateFaceFrameParts(
          faceFrameInput,
          faceFrameRules
        );
        allParts.push(...faceFrameParts);
      }
    } catch (error: any) {
      const errorMsg = `${placement.cabinet_label}: ${error.message}`;
      warnings.push(errorMsg);
      // Continue with other cabinets even if one fails
    }
  }
  
  // Aggregate all parts
  const aggregatedRows = aggregateCutLists(allParts);
  
  return {
    rows: aggregatedRows,
    warnings,
  };
}
