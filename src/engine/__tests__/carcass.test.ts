import { generateCarcassParts } from '../carcass';
import { validateCabinetAndStandards } from '../validate';
import { CabinetInput, ShopStandards } from '../types';

describe('Carcass Parts Generator', () => {
  describe('Test A: Base face-frame with include_back true, toe_kick_enabled true', () => {
    it('should generate correct parts with exact dimensions', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'B24-FF-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        depth_in: 24,
        shelves: 1,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: true,
        toe_kick_height_in: 4.5,
      };

      const parts = generateCarcassParts(cabinet, standards);

      // Expected part count:
      // 2 side panels + 1 bottom + 1 back + 2 stretchers + 1 shelf = 7 parts
      expect(parts.length).toBe(7);

      // Check side panels
      const side1 = parts.find((p) => p.part_code === 'B24-FF-01:SIDE:1');
      expect(side1).toBeDefined();
      expect(side1?.thickness_in).toBe(0.75);
      expect(side1?.width_in).toBe(24.0);
      expect(side1?.height_in).toBe(34.5);

      const side2 = parts.find((p) => p.part_code === 'B24-FF-01:SIDE:2');
      expect(side2).toBeDefined();
      expect(side2?.thickness_in).toBe(0.75);
      expect(side2?.width_in).toBe(24.0);
      expect(side2?.height_in).toBe(34.5);

      // Check bottom panel
      const bottom = parts.find((p) => p.part_code === 'B24-FF-01:BOTTOM:1');
      expect(bottom).toBeDefined();
      expect(bottom?.thickness_in).toBe(0.75);
      expect(bottom?.width_in).toBe(22.5); // W - 2T = 24 - 1.5 = 22.5
      expect(bottom?.height_in).toBe(23.75); // D - effectiveTb = 24 - 0.25 = 23.75
      expect(bottom?.notes).toBe('W-2T; D-effectiveTb');

      // Check back panel
      const back = parts.find((p) => p.part_code === 'B24-FF-01:BACK:1');
      expect(back).toBeDefined();
      expect(back?.thickness_in).toBe(0.25);
      expect(back?.width_in).toBe(22.5); // W - 2T = 24 - 1.5 = 22.5
      expect(back?.height_in).toBe(30.0); // H - Tk = 34.5 - 4.5 = 30.0
      expect(back?.notes).toBe('H-Tk');

      // Check stretchers
      const stretcher1 = parts.find((p) => p.part_code === 'B24-FF-01:STRETCHER:1');
      expect(stretcher1).toBeDefined();
      expect(stretcher1?.thickness_in).toBe(0.75);
      expect(stretcher1?.width_in).toBe(22.5); // W - 2T = 24 - 1.5 = 22.5
      expect(stretcher1?.height_in).toBe(4.0); // Sw = 4.0
      expect(stretcher1?.notes).toBe('top');

      // Check shelf
      const shelf = parts.find((p) => p.part_code === 'B24-FF-01:SHELF:1');
      expect(shelf).toBeDefined();
      expect(shelf?.thickness_in).toBe(0.75);
      expect(shelf?.width_in).toBe(22.5); // W - 2T = 24 - 1.5 = 22.5
      expect(shelf?.height_in).toBe(23.75); // D - effectiveTb = 24 - 0.25 = 23.75
      expect(shelf?.notes).toBe('adjustable');

      // Verify ordering: side1, side2, bottom, back, stretcher1, stretcher2, shelf
      expect(parts[0].part_code).toBe('B24-FF-01:SIDE:1');
      expect(parts[1].part_code).toBe('B24-FF-01:SIDE:2');
      expect(parts[2].part_code).toBe('B24-FF-01:BOTTOM:1');
      expect(parts[3].part_code).toBe('B24-FF-01:BACK:1');
      expect(parts[4].part_code).toBe('B24-FF-01:STRETCHER:1');
      expect(parts[5].part_code).toBe('B24-FF-01:STRETCHER:2');
      expect(parts[6].part_code).toBe('B24-FF-01:SHELF:1');
    });
  });

  describe('Test B: Wall frameless with include_back false', () => {
    it('should generate parts without back panel and use effectiveTb=0', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'W30-FL-01',
        type: 'wall',
        construction: 'frameless',
        width_in: 30,
        height_in: 30,
        depth_in: 12,
        shelves: 2,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: false,
        stretcher_width_in: 3.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      const parts = generateCarcassParts(cabinet, standards);

      // Expected part count:
      // 2 side panels + 1 top + 1 bottom + 0 back + 2 stretchers + 2 shelves = 8 parts
      expect(parts.length).toBe(8);

      // Verify no back panel
      const back = parts.find((p) => p.part_code === 'W30-FL-01:BACK:1');
      expect(back).toBeUndefined();

      // Check top panel (should use effectiveTb=0, so D - 0 = D)
      const top = parts.find((p) => p.part_code === 'W30-FL-01:TOP:1');
      expect(top).toBeDefined();
      expect(top?.width_in).toBe(28.5); // W - 2T = 30 - 1.5 = 28.5
      expect(top?.height_in).toBe(12.0); // D - effectiveTb = 12 - 0 = 12.0

      // Check bottom panel
      const bottom = parts.find((p) => p.part_code === 'W30-FL-01:BOTTOM:1');
      expect(bottom).toBeDefined();
      expect(bottom?.width_in).toBe(28.5); // W - 2T = 30 - 1.5 = 28.5
      expect(bottom?.height_in).toBe(12.0); // D - effectiveTb = 12 - 0 = 12.0

      // Check shelves (should use effectiveTb=0)
      const shelf1 = parts.find((p) => p.part_code === 'W30-FL-01:SHELF:1');
      expect(shelf1).toBeDefined();
      expect(shelf1?.width_in).toBe(28.5); // W - 2T = 30 - 1.5 = 28.5
      expect(shelf1?.height_in).toBe(12.0); // D - effectiveTb = 12 - 0 = 12.0

      const shelf2 = parts.find((p) => p.part_code === 'W30-FL-01:SHELF:2');
      expect(shelf2).toBeDefined();
      expect(shelf2?.width_in).toBe(28.5);
      expect(shelf2?.height_in).toBe(12.0);

      // Check stretchers (wall uses Sw=3.0)
      const stretcher1 = parts.find((p) => p.part_code === 'W30-FL-01:STRETCHER:1');
      expect(stretcher1?.height_in).toBe(3.0); // Sw = 3.0

      // Verify ordering: side1, side2, top, bottom, stretcher1, stretcher2, shelf1, shelf2
      expect(parts[0].part_code).toBe('W30-FL-01:SIDE:1');
      expect(parts[1].part_code).toBe('W30-FL-01:SIDE:2');
      expect(parts[2].part_code).toBe('W30-FL-01:TOP:1');
      expect(parts[3].part_code).toBe('W30-FL-01:BOTTOM:1');
      expect(parts[4].part_code).toBe('W30-FL-01:STRETCHER:1');
      expect(parts[5].part_code).toBe('W30-FL-01:STRETCHER:2');
      expect(parts[6].part_code).toBe('W30-FL-01:SHELF:1');
      expect(parts[7].part_code).toBe('W30-FL-01:SHELF:2');
    });
  });

  describe('Test C: Validation failure', () => {
    it('should throw error when width < 9.0', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'INVALID-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 8.0, // Invalid: < 9.0
        height_in: 30,
        depth_in: 24,
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      expect(() => {
        validateCabinetAndStandards(cabinet, standards);
      }).toThrow('Width must be >= 9.0 inches for any cabinet');
    });

    it('should throw error when depth < 10.0 for base cabinet', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'INVALID-02',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 30,
        depth_in: 9.0, // Invalid: < 10.0 for base
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      expect(() => {
        validateCabinetAndStandards(cabinet, standards);
      }).toThrow('Depth must be >= 10.0 inches for base and tall cabinets');
    });

    it('should throw error when height < 24.0 for base cabinet', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'INVALID-03',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 23.0, // Invalid: < 24.0 for base
        depth_in: 24,
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      expect(() => {
        validateCabinetAndStandards(cabinet, standards);
      }).toThrow('Height must be >= 24.0 inches for base cabinets');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle tall cabinet with toe kick', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'T72-FF-01',
        type: 'tall',
        construction: 'face_frame',
        width_in: 24,
        height_in: 84,
        depth_in: 24,
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: true,
        toe_kick_height_in: 4.5,
      };

      const parts = generateCarcassParts(cabinet, standards);

      // Should have: 2 sides + 1 top + 1 bottom + 1 back + 2 stretchers = 7 parts
      expect(parts.length).toBe(7);

      const back = parts.find((p) => p.part_code === 'T72-FF-01:BACK:1');
      expect(back?.height_in).toBe(79.5); // H - Tk = 84 - 4.5 = 79.5
      expect(back?.notes).toBe('H-Tk');
    });

    it('should handle zero shelves', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'B24-NO-SHELVES',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        depth_in: 24,
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      const parts = generateCarcassParts(cabinet, standards);

      // Should have: 2 sides + 1 bottom + 1 back + 2 stretchers = 6 parts (no shelves)
      expect(parts.length).toBe(6);
      expect(parts.filter((p) => p.part_code.includes('SHELF')).length).toBe(0);
    });

    it('should round all dimensions to 3 decimals', () => {
      const cabinet: CabinetInput = {
        cabinet_label: 'ROUND-TEST',
        type: 'base',
        construction: 'face_frame',
        width_in: 24.123456,
        height_in: 34.567890,
        depth_in: 24.111111,
        shelves: 0,
      };

      const standards: ShopStandards = {
        carcass_thickness_in: 0.75,
        back_thickness_in: 0.25,
        include_back: true,
        stretcher_width_in: 4.0,
        toe_kick_enabled: false,
        toe_kick_height_in: 4.5,
      };

      const parts = generateCarcassParts(cabinet, standards);

      // All dimensions should be rounded to 3 decimals
      parts.forEach((part) => {
        const thicknessDecimals = (part.thickness_in.toString().split('.')[1] || '').length;
        const widthDecimals = (part.width_in.toString().split('.')[1] || '').length;
        const heightDecimals = (part.height_in.toString().split('.')[1] || '').length;

        expect(thicknessDecimals).toBeLessThanOrEqual(3);
        expect(widthDecimals).toBeLessThanOrEqual(3);
        expect(heightDecimals).toBeLessThanOrEqual(3);
      });
    });
  });
});
