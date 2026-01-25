import { CabinetType, Construction } from './types';
import {
  computeCabinetFrontLayout,
  CabinetLayoutInput,
  FaceFrameRailRules,
  OpeningConfig,
} from './openings';
import {
  generateCabinetElevationSvg,
  SvgConfig,
} from './elevationSvg';

/**
 * Rounds a number to 3 decimal places
 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Converts inches to pixels using scale
 * Always rounds AFTER scaling for consistency
 */
function inchesToPixels(inches: number, scale: number): number {
  return Math.round(inches * scale);
}

/**
 * Helper to convert inches to pixels with consistent rounding
 * Use this for all pixel calculations to ensure determinism
 */
function px(inches: number, scale: number): number {
  return Math.round(inches * scale);
}

export interface WallCabinetPlacement {
  id: string; // stable unique ID (no random)
  cabinet_label: string; // e.g. "B24-FF-01"
  x_from_left_in: number; // left offset position on wall
  y_from_top_in?: number; // optional; default aligns bottoms
  cabinet_width_in: number; // W
  cabinet_height_in: number; // H
  cabinet_depth_in: number; // D (not used for elevation)
  type: 'base' | 'wall' | 'tall';
  construction: 'frameless' | 'face_frame';
  shelves: number;

  // opening config for layout engine
  opening: {
    drawer_openings: number;
    door_openings: 0 | 1 | 2;
    top_drawer_height_in?: number;
    middle_drawer_height_in?: number;
    remaining_drawer_height_in?: number;
    door_region_height_in?: number;
    reveal_gap_in?: number;
  };

  // face-frame visual and parts rules for layout/svg
  face_frame: {
    enabled: boolean;
    stile_width_in: number;
    top_rail_width_in: number;
    middle_rail_width_in: number;
    bottom_rail_width_in: number;
  };
}

export interface WallElevationInput {
  wall_label: string;
  placements: WallCabinetPlacement[];
  scale_px_per_in?: number; // default 20
  padding_in?: number; // default 2 (inches around wall canvas)
  show_dimensions?: boolean; // default true
  show_labels?: boolean; // default true
  align_bottoms?: boolean; // default true (align cabinet bottoms on same baseline)
}

export interface WallElevationResult {
  svg: string;
  width_px: number;
  height_px: number;
  cabinetFrames: Array<{
    id: string;
    cabinet_label: string;
    x_px: number;
    y_px: number;
    width_px: number;
    height_px: number;
  }>;
  warnings: string[];
}

/**
 * Extracts inner SVG content from a full SVG string
 * Returns the content between <svg> tags (without the outer tags)
 * Handles:
 * - <svg> tags with newlines/attributes
 * - Leading XML headers
 * - CRLF line endings (normalizes to LF)
 * - Nested defs/markers (preserved as-is)
 */
function extractInnerSvg(svgString: string): {
  inner: string;
  viewWidthPx: number;
  viewHeightPx: number;
} {
  // Normalize line endings to LF to avoid snapshot churn
  let normalized = svgString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Find the opening <svg> tag (may span multiple lines or have many attributes)
  const svgStartMatch = normalized.match(/<svg[\s\S]*?>/);
  if (!svgStartMatch) {
    throw new Error('Invalid SVG: missing opening <svg> tag');
  }

  // Extract width and height from viewBox or attributes
  const svgTag = svgStartMatch[0];
  const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']([^"']*)["']/);
  let viewWidthPx = 0;
  let viewHeightPx = 0;

  if (viewBoxMatch) {
    const [, viewBox] = viewBoxMatch;
    const parts = viewBox.trim().split(/\s+/);
    if (parts.length >= 4) {
      viewWidthPx = Number(parts[2]);
      viewHeightPx = Number(parts[3]);
    }
  } else {
    // Try width/height attributes (may have whitespace)
    const widthMatch = svgTag.match(/width\s*=\s*["']([^"']*)["']/);
    const heightMatch = svgTag.match(/height\s*=\s*["']([^"']*)["']/);
    if (widthMatch) viewWidthPx = Number(widthMatch[1]);
    if (heightMatch) viewHeightPx = Number(heightMatch[1]);
  }

  // Find the closing </svg> tag (use lastIndexOf to get the outermost closing tag)
  const svgEndIndex = normalized.lastIndexOf('</svg>');
  if (svgEndIndex === -1) {
    throw new Error('Invalid SVG: missing closing </svg> tag');
  }

  // Extract content between tags
  const innerStart = svgStartMatch.index! + svgStartMatch[0].length;
  let inner = normalized.substring(innerStart, svgEndIndex);

  // Trim leading/trailing whitespace but preserve internal structure
  inner = inner.replace(/^\s+/, '').replace(/\s+$/, '');

  return { inner, viewWidthPx, viewHeightPx };
}

/**
 * Validates wall cabinet placements
 * Throws Error if validation fails
 */
function validatePlacements(placements: WallCabinetPlacement[]): void {
  if (placements.length === 0) {
    throw new Error('At least one cabinet placement is required');
  }

  // Validate individual placements
  for (const placement of placements) {
    if (placement.x_from_left_in < 0) {
      throw new Error(`Placement ${placement.id}: x_from_left_in must be >= 0`);
    }
    if (placement.cabinet_width_in <= 0) {
      throw new Error(`Placement ${placement.id}: cabinet_width_in must be > 0`);
    }
    if (placement.cabinet_height_in <= 0) {
      throw new Error(`Placement ${placement.id}: cabinet_height_in must be > 0`);
    }
  }

  // Check for overlaps (sort a copy for validation, don't mutate original)
  // Use stable sort to ensure deterministic error messages
  const sorted = [...placements].sort((a, b) => {
    const xDiff = a.x_from_left_in - b.x_from_left_in;
    // If x positions are equal, sort by id for stability
    return xDiff !== 0 ? xDiff : a.id.localeCompare(b.id);
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    // Overlap check: [x, x+W) ranges intersect if aRight > bLeft
    // Touching cabinets (aRight === bLeft) are NOT considered overlap
    const aRight = a.x_from_left_in + a.cabinet_width_in;
    const bLeft = b.x_from_left_in;

    if (aRight > bLeft) {
      // Error format must be exactly: "cabinet_overlap:<id1>:<id2>"
      throw new Error(`cabinet_overlap:${a.id}:${b.id}`);
    }
  }
}

/**
 * Generates a combined wall elevation SVG from multiple cabinet placements
 */
export function generateWallElevation(
  input: WallElevationInput
): WallElevationResult {
  const {
    wall_label,
    placements,
    scale_px_per_in = 20,
    padding_in = 2,
    show_dimensions = true,
    show_labels = true,
    align_bottoms = true,
  } = input;

  const warnings: string[] = [];

  // Validate placements
  try {
    validatePlacements(placements);
  } catch (error: any) {
    throw error;
  }

  // Calculate canvas dimensions
  const contentWidth = Math.max(
    ...placements.map((p) => p.x_from_left_in + p.cabinet_width_in)
  );
  const contentHeight = Math.max(...placements.map((p) => p.cabinet_height_in));

  const totalWidth = contentWidth + 2 * padding_in;
  const totalHeight = contentHeight + 2 * padding_in;

  // Use px() helper for consistent rounding AFTER scaling
  const widthPx = px(totalWidth, scale_px_per_in);
  const heightPx = px(totalHeight, scale_px_per_in);

  // Calculate baseline for alignment (in inches first, then convert to px)
  const baselineY = padding_in + contentHeight;

  // Build SVG
  const elements: string[] = [];

  // SVG header
  elements.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">`
  );

  // Background
  elements.push(`<rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="white"/>`);

  // Wall boundary rectangle (use px() helper consistently)
  const wallX = px(padding_in, scale_px_per_in);
  const wallY = px(padding_in, scale_px_per_in);
  const wallWidthPx = px(contentWidth, scale_px_per_in);
  const wallHeightPx = px(contentHeight, scale_px_per_in);

  elements.push(
    `<rect x="${wallX}" y="${wallY}" width="${wallWidthPx}" height="${wallHeightPx}" ` +
    `fill="none" stroke="black" stroke-width="1" stroke-dasharray="4,2"/>`
  );

  // Overall wall dimension label (if enabled)
  // Use deterministic placement: center x, fixed offset y
  if (show_dimensions) {
    const dimText = `Wall: ${round3(contentWidth)}"`;
    const dimX = widthPx / 2; // Center of canvas
    const dimY = px(padding_in, scale_px_per_in) - 10; // Fixed 10px above padding
    elements.push(
      `<text x="${dimX}" y="${dimY}" text-anchor="middle" font-family="Arial, sans-serif" ` +
      `font-size="12" font-weight="bold" fill="black">${dimText}</text>`
    );
  }

  // Track cabinet frames for return value
  const cabinetFrames: WallElevationResult['cabinetFrames'] = [];

  // Render each cabinet (in original order, not sorted)
  for (const placement of placements) {
    try {
      // Compute cabinet layout
      const layoutInput: CabinetLayoutInput = {
        cabinet_label: placement.cabinet_label,
        type: placement.type,
        construction: placement.construction,
        width_in: placement.cabinet_width_in,
        height_in: placement.cabinet_height_in,
        face_frame: {
          enabled: placement.face_frame.enabled,
          stile_width_in: placement.face_frame.stile_width_in,
          top_rail_width_in: placement.face_frame.top_rail_width_in,
          middle_rail_width_in: placement.face_frame.middle_rail_width_in,
          bottom_rail_width_in: placement.face_frame.bottom_rail_width_in,
        },
        opening: placement.opening as OpeningConfig,
      };

      const layout = computeCabinetFrontLayout(layoutInput);

      // Generate cabinet SVG (without dimensions/labels to avoid clutter)
      const cabinetSvgConfig: Partial<SvgConfig> = {
        cabinet_width_in: placement.cabinet_width_in,
        scale: scale_px_per_in,
        showDimensions: false,
        showLabels: false,
        padding: 0, // No padding, we'll position it ourselves
        strokeWidth: 1,
      };

      const cabinetSvg = generateCabinetElevationSvg(layout, cabinetSvgConfig);

      // Extract inner SVG content
      const { inner: innerSvg } = extractInnerSvg(cabinetSvg);

      // Calculate cabinet position (in inches first, then convert to px)
      const cabinetTopY = align_bottoms
        ? baselineY - placement.cabinet_height_in
        : padding_in + (placement.y_from_top_in || 0);

      // Use px() helper for consistent rounding AFTER scaling
      const translateX = px(padding_in + placement.x_from_left_in, scale_px_per_in);
      const translateY = px(cabinetTopY, scale_px_per_in);

      // Create group for this cabinet
      elements.push(`<g transform="translate(${translateX}, ${translateY})">`);
      elements.push(innerSvg);
      elements.push('</g>');

      // Add cabinet label above (if enabled)
      // Deterministic placement: cabinet center x, fixed 10px above top
      if (show_labels) {
        const cabinetCenterX = padding_in + placement.x_from_left_in + placement.cabinet_width_in / 2;
        const labelX = px(cabinetCenterX, scale_px_per_in);
        const labelY = translateY - 10; // Fixed 10px above cabinet top
        elements.push(
          `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Arial, sans-serif" ` +
          `font-size="10" font-weight="bold" fill="black">${placement.cabinet_label}</text>`
        );
      }

      // Track frame (use px() helper consistently)
      cabinetFrames.push({
        id: placement.id,
        cabinet_label: placement.cabinet_label,
        x_px: translateX,
        y_px: translateY,
        width_px: px(placement.cabinet_width_in, scale_px_per_in),
        height_px: px(placement.cabinet_height_in, scale_px_per_in),
      });

      // Collect warnings from layout
      if (layout.warnings.length > 0) {
        warnings.push(`${placement.cabinet_label}: ${layout.warnings.join(', ')}`);
      }
    } catch (error: any) {
      warnings.push(`${placement.cabinet_label}: ${error.message}`);
      // Continue with other cabinets even if one fails
    }
  }

  elements.push('</svg>');

  return {
    svg: elements.join('\n'),
    width_px: widthPx,
    height_px: heightPx,
    cabinetFrames,
    warnings,
  };
}
