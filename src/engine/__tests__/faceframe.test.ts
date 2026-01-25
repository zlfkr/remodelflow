import { generateFaceFrameParts } from '../faceframe';
import {
  CabinetFaceFrameInput,
  FaceFrameRules,
} from '../faceframe';

describe('Face-Frame Parts Generator', () => {
  describe('Test A: Face-frame base cabinet with no drawers', () => {
    it('should generate correct parts with exact dimensions', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'B24-FF-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        door_openings: 1,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0.25,
      };

      const parts = generateFaceFrameParts(cabinet, rules);

      // Expected: 2 stiles + 1 top rail + 1 bottom rail = 4 parts
      expect(parts.length).toBe(4);

      // Check stiles
      const stile1 = parts.find((p) => p.part_code === 'B24-FF-01:STILE:1');
      expect(stile1).toBeDefined();
      expect(stile1?.thickness_in).toBe(0.75);
      expect(stile1?.width_in).toBe(1.5);
      expect(stile1?.height_in).toBe(34.75); // H + Scribe = 34.5 + 0.25 = 34.75
      expect(stile1?.notes).toBe('includes scribe');
      expect(stile1?.material_group).toBe('solid');

      const stile2 = parts.find((p) => p.part_code === 'B24-FF-01:STILE:2');
      expect(stile2).toBeDefined();
      expect(stile2?.thickness_in).toBe(0.75);
      expect(stile2?.width_in).toBe(1.5);
      expect(stile2?.height_in).toBe(34.75);
      expect(stile2?.notes).toBe('includes scribe');

      // Check top rail
      const topRail = parts.find((p) => p.part_code === 'B24-FF-01:RAIL_TOP:1');
      expect(topRail).toBeDefined();
      expect(topRail?.thickness_in).toBe(0.75);
      expect(topRail?.width_in).toBe(1.5); // TRW = 1.5
      expect(topRail?.height_in).toBe(21.0); // W - 2*SW = 24 - 3.0 = 21.0
      expect(topRail?.name).toBe('Top Rail');

      // Check bottom rail
      const bottomRail = parts.find(
        (p) => p.part_code === 'B24-FF-01:RAIL_BOTTOM:1'
      );
      expect(bottomRail).toBeDefined();
      expect(bottomRail?.thickness_in).toBe(0.75);
      expect(bottomRail?.width_in).toBe(1.5); // BRW = 1.5
      expect(bottomRail?.height_in).toBe(21.0); // W - 2*SW = 24 - 3.0 = 21.0
      expect(bottomRail?.name).toBe('Bottom Rail');

      // Verify ordering: stile1, stile2, top rail, bottom rail
      expect(parts[0].part_code).toBe('B24-FF-01:STILE:1');
      expect(parts[1].part_code).toBe('B24-FF-01:STILE:2');
      expect(parts[2].part_code).toBe('B24-FF-01:RAIL_TOP:1');
      expect(parts[3].part_code).toBe('B24-FF-01:RAIL_BOTTOM:1');
    });
  });

  describe('Test B: Face-frame cabinet with 3 drawer openings', () => {
    it('should generate 2 stiles + top rail + 3 mid rails + bottom rail', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'B36-FF-02',
        type: 'base',
        construction: 'face_frame',
        width_in: 36,
        height_in: 34.5,
        door_openings: 0,
        drawer_openings: 3,
        drawer_front_style: 'slab',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      const parts = generateFaceFrameParts(cabinet, rules);

      // Expected: 2 stiles + 1 top rail + 3 mid rails + 1 bottom rail = 7 parts
      expect(parts.length).toBe(7);

      // Check rail length for all rails
      const expectedRailLength = 36 - 3.0; // W - 2*SW = 36 - 3.0 = 33.0

      // Check top rail
      const topRail = parts.find((p) => p.part_code === 'B36-FF-02:RAIL_TOP:1');
      expect(topRail?.height_in).toBe(33.0);

      // Check mid rails
      const midRail1 = parts.find((p) => p.part_code === 'B36-FF-02:RAIL_MID:1');
      expect(midRail1).toBeDefined();
      expect(midRail1?.height_in).toBe(33.0);
      expect(midRail1?.width_in).toBe(1.5);
      expect(midRail1?.notes).toBe('drawer separator');
      expect(midRail1?.name).toBe('Mid Rail');

      const midRail2 = parts.find((p) => p.part_code === 'B36-FF-02:RAIL_MID:2');
      expect(midRail2).toBeDefined();
      expect(midRail2?.height_in).toBe(33.0);

      const midRail3 = parts.find((p) => p.part_code === 'B36-FF-02:RAIL_MID:3');
      expect(midRail3).toBeDefined();
      expect(midRail3?.height_in).toBe(33.0);

      // Check bottom rail
      const bottomRail = parts.find(
        (p) => p.part_code === 'B36-FF-02:RAIL_BOTTOM:1'
      );
      expect(bottomRail?.height_in).toBe(33.0);

      // Verify ordering: stile1, stile2, top rail, mid rail 1, 2, 3, bottom rail
      expect(parts[0].part_code).toBe('B36-FF-02:STILE:1');
      expect(parts[1].part_code).toBe('B36-FF-02:STILE:2');
      expect(parts[2].part_code).toBe('B36-FF-02:RAIL_TOP:1');
      expect(parts[3].part_code).toBe('B36-FF-02:RAIL_MID:1');
      expect(parts[4].part_code).toBe('B36-FF-02:RAIL_MID:2');
      expect(parts[5].part_code).toBe('B36-FF-02:RAIL_MID:3');
      expect(parts[6].part_code).toBe('B36-FF-02:RAIL_BOTTOM:1');
    });
  });

  describe('Test C: Frameless cabinet returns []', () => {
    it('should return empty array for frameless construction without throwing', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'B24-FL-01',
        type: 'base',
        construction: 'frameless',
        width_in: 24,
        height_in: 34.5,
        door_openings: 1,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      const parts = generateFaceFrameParts(cabinet, rules);
      expect(parts).toEqual([]);
    });

    it('should return empty array when rules.enabled is false', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'B24-FF-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        door_openings: 1,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: false,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      const parts = generateFaceFrameParts(cabinet, rules);
      expect(parts).toEqual([]);
    });
  });

  describe('Test D: Validation errors', () => {
    it('should throw error when W <= 2*SW', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'INVALID-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 3.0, // Invalid: 3.0 <= 2*1.5 = 3.0
        height_in: 30,
        door_openings: 0,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      expect(() => {
        generateFaceFrameParts(cabinet, rules);
      }).toThrow('Stile width * 2 (3) must be less than cabinet width (3)');
    });

    it('should throw error when width <= 0', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'INVALID-02',
        type: 'base',
        construction: 'face_frame',
        width_in: 0,
        height_in: 30,
        door_openings: 0,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      expect(() => {
        generateFaceFrameParts(cabinet, rules);
      }).toThrow('Width and height must be greater than 0');
    });

    it('should throw error when thickness >= 2', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'INVALID-03',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 30,
        door_openings: 0,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 2.0, // Invalid: >= 2
        scribe_length_in: 0,
      };

      expect(() => {
        generateFaceFrameParts(cabinet, rules);
      }).toThrow('Thickness must be > 0 and < 2 inches');
    });

    it('should throw error when drawer_openings > 0 but MRW <= 0', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'INVALID-04',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 30,
        door_openings: 0,
        drawer_openings: 2,
        drawer_front_style: 'slab',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 0, // Invalid: <= 0 when drawer_openings > 0
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      expect(() => {
        generateFaceFrameParts(cabinet, rules);
      }).toThrow('Middle rail width must be > 0 when drawer_openings > 0');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle zero scribe length', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'NO-SCRIBE',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        door_openings: 0,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      const parts = generateFaceFrameParts(cabinet, rules);
      const stile1 = parts.find((p) => p.part_code === 'NO-SCRIBE:STILE:1');
      expect(stile1?.height_in).toBe(34.5); // H + 0 = 34.5
      expect(stile1?.notes).toBeUndefined(); // No notes when scribe = 0
    });

    it('should validate optional drawer heights', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'INVALID-DRAWER',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 30,
        door_openings: 0,
        drawer_openings: 2,
        drawer_front_style: 'slab',
        top_drawer_height_in: 15,
        middle_drawer_height_in: 16, // Sum = 31 > H = 30
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0,
      };

      expect(() => {
        generateFaceFrameParts(cabinet, rules);
      }).toThrow('Sum of top and middle drawer heights (31) must be < cabinet height (30)');
    });

    it('should round all dimensions to 3 decimals', () => {
      const cabinet: CabinetFaceFrameInput = {
        cabinet_label: 'ROUND-TEST',
        type: 'base',
        construction: 'face_frame',
        width_in: 24.123456,
        height_in: 34.567890,
        door_openings: 0,
        drawer_openings: 0,
        drawer_front_style: 'none',
      };

      const rules: FaceFrameRules = {
        enabled: true,
        full_length_stiles: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
        thickness_in: 0.75,
        scribe_length_in: 0.123456,
      };

      const parts = generateFaceFrameParts(cabinet, rules);

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
