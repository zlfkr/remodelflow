import { CabinetInput, ShopStandards } from './types';

/**
 * Rounds a number to 3 decimal places
 */
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Validates cabinet input and shop standards
 * Throws Error with clear message if validation fails
 */
export function validateCabinetAndStandards(
  cabinet: CabinetInput,
  standards: ShopStandards
): void {
  const { width_in: W, height_in: H, depth_in: D, type } = cabinet;
  const {
    carcass_thickness_in: T,
    back_thickness_in: Tb,
    include_back,
    toe_kick_enabled,
    toe_kick_height_in: Tk,
  } = standards;

  // Basic dimension checks
  if (W <= 0 || H <= 0 || D <= 0) {
    throw new Error('Width, height, and depth must be greater than 0');
  }

  // Width minimum
  if (W < 9.0) {
    throw new Error('Width must be >= 9.0 inches for any cabinet');
  }

  // Depth minimums
  if ((type === 'base' || type === 'tall') && D < 10.0) {
    throw new Error('Depth must be >= 10.0 inches for base and tall cabinets');
  }
  if (type === 'wall' && D < 8.0) {
    throw new Error('Depth must be >= 8.0 inches for wall cabinets');
  }

  // Height minimums
  if (type === 'wall' && H < 20.0) {
    throw new Error('Height must be >= 20.0 inches for wall cabinets');
  }
  if (type === 'base' && H < 24.0) {
    throw new Error('Height must be >= 24.0 inches for base cabinets');
  }
  if (type === 'tall' && H < 60.0) {
    throw new Error('Height must be >= 60.0 inches for tall cabinets');
  }

  // Carcass thickness (T)
  if (T <= 0 || T >= 2) {
    throw new Error('Carcass thickness must be > 0 and < 2 inches');
  }

  // Back thickness (Tb)
  if (Tb < 0 || Tb >= 1) {
    throw new Error('Back thickness must be >= 0 and < 1 inches');
  }

  // If include_back is true, Tb must be > 0
  if (include_back && Tb <= 0) {
    throw new Error('Back thickness must be > 0 when include_back is true');
  }

  // Toe kick validation
  if (toe_kick_enabled && (type === 'base' || type === 'tall')) {
    if (Tk <= 0) {
      throw new Error('Toe kick height must be > 0 when toe_kick_enabled is true');
    }
    if (Tk >= H) {
      throw new Error('Toe kick height must be < cabinet height');
    }
  }
}
