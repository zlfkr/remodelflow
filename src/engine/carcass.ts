import { CabinetInput, ShopStandards, PartRow } from './types';
import { validateCabinetAndStandards, round3 } from './validate';

/**
 * Generates carcass parts for a cabinet based on input and shop standards
 * Returns an array of PartRow objects in the specified order
 */
export function generateCarcassParts(
  cabinet: CabinetInput,
  standards: ShopStandards
): PartRow[] {
  // Validate inputs
  validateCabinetAndStandards(cabinet, standards);

  const parts: PartRow[] = [];
  const { cabinet_label, type, width_in: W, height_in: H, depth_in: D, shelves } = cabinet;
  const {
    carcass_thickness_in: T,
    back_thickness_in: Tb,
    include_back,
    stretcher_width_in: Sw,
    toe_kick_enabled,
    toe_kick_height_in: Tk,
  } = standards;

  // Calculate effective values
  const effectiveTb = include_back ? Tb : 0;
  const effectiveTk =
    toe_kick_enabled && (type === 'base' || type === 'tall') ? Tk : 0;

  // 1) Side Panels (qty 2)
  parts.push({
    part_code: `${cabinet_label}:SIDE:1`,
    cabinet_label,
    name: 'Side Panel',
    material_group: 'plywood',
    thickness_in: round3(T),
    width_in: round3(D),
    height_in: round3(H),
    qty: 1,
  });
  parts.push({
    part_code: `${cabinet_label}:SIDE:2`,
    cabinet_label,
    name: 'Side Panel',
    material_group: 'plywood',
    thickness_in: round3(T),
    width_in: round3(D),
    height_in: round3(H),
    qty: 1,
  });

  // 2) Top/Bottom Panels
  if (type === 'base') {
    // Bottom Panel (base only)
    parts.push({
      part_code: `${cabinet_label}:BOTTOM:1`,
      cabinet_label,
      name: 'Bottom Panel',
      material_group: 'plywood',
      thickness_in: round3(T),
      width_in: round3(W - 2 * T),
      height_in: round3(D - effectiveTb),
      qty: 1,
      notes: 'W-2T; D-effectiveTb',
    });
  } else {
    // Wall and Tall: Top then Bottom
    // Top Panel
    parts.push({
      part_code: `${cabinet_label}:TOP:1`,
      cabinet_label,
      name: 'Top Panel',
      material_group: 'plywood',
      thickness_in: round3(T),
      width_in: round3(W - 2 * T),
      height_in: round3(D - effectiveTb),
      qty: 1,
    });
    // Bottom Panel
    parts.push({
      part_code: `${cabinet_label}:BOTTOM:1`,
      cabinet_label,
      name: 'Bottom Panel',
      material_group: 'plywood',
      thickness_in: round3(T),
      width_in: round3(W - 2 * T),
      height_in: round3(D - effectiveTb),
      qty: 1,
    });
  }

  // 3) Back Panel (if include_back is true)
  if (include_back) {
    let backHeight: number;
    let notes: string | undefined;

    if (type === 'base' || type === 'tall') {
      backHeight = H - effectiveTk;
      notes = 'H-Tk';
    } else {
      // wall
      backHeight = H;
      notes = undefined;
    }

    parts.push({
      part_code: `${cabinet_label}:BACK:1`,
      cabinet_label,
      name: 'Back Panel',
      material_group: 'plywood',
      thickness_in: round3(Tb),
      width_in: round3(W - 2 * T),
      height_in: round3(backHeight),
      qty: 1,
      notes,
    });
  }

  // 4) Stretchers/Nailers (qty 2)
  parts.push({
    part_code: `${cabinet_label}:STRETCHER:1`,
    cabinet_label,
    name: 'Stretcher',
    material_group: 'plywood',
    thickness_in: round3(T),
    width_in: round3(W - 2 * T),
    height_in: round3(Sw),
    qty: 1,
    notes: 'top',
  });
  parts.push({
    part_code: `${cabinet_label}:STRETCHER:2`,
    cabinet_label,
    name: 'Stretcher',
    material_group: 'plywood',
    thickness_in: round3(T),
    width_in: round3(W - 2 * T),
    height_in: round3(Sw),
    qty: 1,
    notes: 'top',
  });

  // 5) Shelves (qty = cabinet.shelves)
  for (let i = 1; i <= shelves; i++) {
    parts.push({
      part_code: `${cabinet_label}:SHELF:${i}`,
      cabinet_label,
      name: 'Shelf',
      material_group: 'plywood',
      thickness_in: round3(T),
      width_in: round3(W - 2 * T),
      height_in: round3(D - effectiveTb),
      qty: 1,
      notes: 'adjustable',
    });
  }

  return parts;
}
