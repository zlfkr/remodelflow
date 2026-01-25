import {
  CabinetFrontLayout,
  RailPlacement,
  OpeningRect,
} from './openings';

/**
 * Rounds a number to 3 decimal places
 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Configuration for SVG rendering
 */
export interface SvgConfig {
  scale: number;                    // pixels per inch (default 10)
  cabinet_width_in: number;         // Cabinet width in inches
  strokeWidth: number;               // Line stroke width in pixels (default 1)
  padding: number;                   // Padding around drawing in pixels (default 20)
  showDimensions: boolean;           // Show dimension annotations (default true)
  showLabels: boolean;               // Show opening labels (default true)
}

const DEFAULT_CONFIG: SvgConfig = {
  scale: 10,
  cabinet_width_in: 24,
  strokeWidth: 1,
  padding: 20,
  showDimensions: true,
  showLabels: true,
};

/**
 * Converts inches to pixels using scale
 */
function inchesToPixels(inches: number, scale: number): number {
  return round3(inches * scale);
}

/**
 * Generates SVG markup for a cabinet front elevation
 */
export function generateCabinetElevationSvg(
  layout: CabinetFrontLayout,
  config: Partial<SvgConfig> = {}
): string {
  const cfg: SvgConfig = { ...DEFAULT_CONFIG, ...config };
  const { scale, cabinet_width_in, strokeWidth, padding, showDimensions, showLabels } = cfg;

  // Calculate SVG dimensions
  const cabinetWidthPx = inchesToPixels(cabinet_width_in, scale);
  const cabinetHeightPx = inchesToPixels(layout.height_in, scale);
  const svgWidth = cabinetWidthPx + 2 * padding;
  const svgHeight = cabinetHeightPx + 2 * padding + (showDimensions ? 40 : 0); // Extra space for dimensions

  // SVG elements array
  const elements: string[] = [];

  // SVG header
  elements.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`);

  // Background
  elements.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white"/>`);

  // Transform to account for padding and flip Y-axis (SVG Y increases downward)
  const offsetX = padding;
  const offsetY = padding;

  // Cabinet outline
  const outlineX = offsetX;
  const outlineY = offsetY;
  const outlineWidth = cabinetWidthPx;
  const outlineHeight = cabinetHeightPx;

  elements.push(
    `<rect x="${outlineX}" y="${outlineY}" width="${outlineWidth}" height="${outlineHeight}" ` +
    `fill="none" stroke="black" stroke-width="${strokeWidth}"/>`
  );

  // Cabinet label (top center)
  const labelX = offsetX + cabinetWidthPx / 2;
  const labelY = offsetY - 10;
  elements.push(
    `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Arial, sans-serif" ` +
    `font-size="12" font-weight="bold" fill="black">${layout.cabinet_label}</text>`
  );

  // Render rails
  layout.rails.forEach((rail) => {
    const railY = offsetY + inchesToPixels(rail.y_from_top_in, scale);
    const railHeight = inchesToPixels(rail.rail_width_in, scale);

    // Rail rectangle
    elements.push(
      `<rect x="${outlineX}" y="${railY}" width="${outlineWidth}" height="${railHeight}" ` +
      `fill="#e0e0e0" stroke="black" stroke-width="${strokeWidth}"/>`
    );

    // Rail label (optional)
    if (showLabels) {
      const railLabelY = railY + railHeight / 2;
      const railLabel = `${rail.key}${rail.index > 1 ? ` ${rail.index}` : ''}`;
      elements.push(
        `<text x="${outlineX + 5}" y="${railLabelY}" font-family="Arial, sans-serif" ` +
        `font-size="8" fill="black" dominant-baseline="middle">${railLabel}</text>`
      );
    }
  });

  // Render openings
  layout.openings.forEach((opening) => {
    const openingY = offsetY + inchesToPixels(opening.y_from_top_in, scale);
    const openingHeight = inchesToPixels(opening.height_in, scale);

    // Opening rectangle (with different fill and stroke style for drawers vs doors)
    const fillColor = opening.key === 'DRAWER' ? '#f0f0f0' : '#ffffff';
    const strokeColor = opening.key === 'DRAWER' ? '#666666' : '#000000';
    const strokeDashArray = opening.key === 'DRAWER' ? 'stroke-dasharray="4,2"' : '';

    elements.push(
      `<rect x="${outlineX}" y="${openingY}" width="${outlineWidth}" height="${openingHeight}" ` +
      `fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDashArray}/>`
    );

    // Opening label
    if (showLabels) {
      const labelCenterY = openingY + openingHeight / 2;
      const openingLabel = `${opening.key} ${opening.index}`;
      elements.push(
        `<text x="${outlineX + cabinetWidthPx / 2}" y="${labelCenterY}" ` +
        `text-anchor="middle" font-family="Arial, sans-serif" font-size="10" ` +
        `font-weight="bold" fill="black" dominant-baseline="middle">${openingLabel}</text>`
      );
    }

    // Opening dimensions (if enabled)
    if (showDimensions) {
      const dimY = openingY + openingHeight / 2;
      const dimText = `${round3(opening.height_in)}"`;
      elements.push(
        `<text x="${outlineX + cabinetWidthPx + 5}" y="${dimY}" ` +
        `font-family="Arial, sans-serif" font-size="8" fill="blue" ` +
        `dominant-baseline="middle">${dimText}</text>`
      );
    }
  });

  // Overall dimensions (if enabled)
  if (showDimensions) {
    // Width dimension
    const widthDimY = offsetY + cabinetHeightPx + 25;
    elements.push(
      `<line x1="${outlineX}" y1="${widthDimY}" x2="${outlineX + cabinetWidthPx}" y2="${widthDimY}" ` +
      `stroke="blue" stroke-width="0.5"/>`
    );
    elements.push(
      `<text x="${outlineX + cabinetWidthPx / 2}" y="${widthDimY + 12}" ` +
      `text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="blue">${round3(cabinet_width_in)}"</text>`
    );

    // Height dimension
    const heightDimX = outlineX + cabinetWidthPx + 15;
    elements.push(
      `<line x1="${heightDimX}" y1="${offsetY}" x2="${heightDimX}" y2="${offsetY + cabinetHeightPx}" ` +
      `stroke="blue" stroke-width="0.5"/>`
    );
    elements.push(
      `<text x="${heightDimX + 5}" y="${offsetY + cabinetHeightPx / 2}" ` +
      `font-family="Arial, sans-serif" font-size="9" fill="blue" dominant-baseline="middle">${round3(layout.height_in)}"</text>`
    );
  }

  // Warnings (if any)
  if (layout.warnings.length > 0) {
    const warningY = offsetY + cabinetHeightPx + (showDimensions ? 35 : 15);
    const warningText = `Warnings: ${layout.warnings.join(', ')}`;
    elements.push(
      `<text x="${offsetX}" y="${warningY}" font-family="Arial, sans-serif" ` +
      `font-size="9" fill="orange">${warningText}</text>`
    );
  }

  elements.push('</svg>');

  return elements.join('\n');
}

/**
 * Generates a simplified SVG (no dimensions, minimal labels) for quick preview
 */
export function generateCabinetElevationSvgSimple(
  layout: CabinetFrontLayout,
  cabinet_width_in: number = 24
): string {
  return generateCabinetElevationSvg(layout, {
    cabinet_width_in,
    showDimensions: false,
    showLabels: true,
    padding: 10,
  });
}
