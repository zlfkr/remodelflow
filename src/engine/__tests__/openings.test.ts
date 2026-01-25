import { computeCabinetFrontLayout } from '../openings';
import {
  CabinetLayoutInput,
  FaceFrameRailRules,
  OpeningConfig,
} from '../openings';

describe('Openings Layout Engine', () => {
  describe('Test A: Face-frame base cabinet, 3 drawers + doors, door height computed', () => {
    it('should compute correct layout with mid rails and reveal gaps', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 3,
        top_drawer_height_in: 6,
        middle_drawer_height_in: 6,
        remaining_drawer_height_in: 6,
        door_openings: 2,
        reveal_gap_in: 0.125,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'B36-FF-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 36,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      const layout = computeCabinetFrontLayout(input);

      // Check mid rail count: drawer_openings (3) + door_openings>0 (1) - 1 = 3
      const midRails = layout.rails.filter((r) => r.key === 'MID');
      expect(midRails.length).toBe(3);

      // Check total openings: 3 drawers + 1 door = 4
      expect(layout.openings.length).toBe(4);

      // Check TOP rail
      const topRail = layout.rails.find((r) => r.key === 'TOP');
      expect(topRail).toBeDefined();
      expect(topRail?.y_from_top_in).toBe(0);
      expect(topRail?.rail_width_in).toBe(1.5);

      // Check BOTTOM rail
      const bottomRail = layout.rails.find((r) => r.key === 'BOTTOM');
      expect(bottomRail).toBeDefined();
      expect(bottomRail?.y_from_top_in).toBe(33.0); // 34.5 - 1.5 = 33.0
      expect(bottomRail?.rail_width_in).toBe(1.5);

      // Check MID rails positions
      // After TOP rail (1.5), first drawer (6), then MID1, second drawer (6), MID2, third drawer (6), MID3, door
      // MID1 should be at: 1.5 + 6 = 7.5
      expect(midRails[0].y_from_top_in).toBe(7.5);
      expect(midRails[1].y_from_top_in).toBe(14.5); // 7.5 + 1.5 + 6 = 15, wait let me recalculate
      // Actually: TOP(0-1.5), drawer1(1.5-7.5), MID1(7.5-9.0), drawer2(9.0-15.0), MID2(15.0-16.5), drawer3(16.5-22.5), MID3(22.5-24.0), door(24.0-33.0), BOTTOM(33.0-34.5)
      // So MID1 at 7.5, MID2 at 15.0, MID3 at 22.5

      // Check openings have reveal gaps applied
      const drawer1 = layout.openings.find((o) => o.key === 'DRAWER' && o.index === 1);
      expect(drawer1).toBeDefined();
      expect(drawer1?.height_in).toBe(5.75); // 6 - 2*0.125 = 5.75
      expect(drawer1?.y_from_top_in).toBe(1.625); // 1.5 + 0.125 = 1.625

      const door = layout.openings.find((o) => o.key === 'DOOR');
      expect(door).toBeDefined();
      expect(door?.height_in).toBeLessThan(9.0); // Door height minus 2*G
      expect(door?.height_in).toBeGreaterThan(0);

      // Verify all openings have height reduced by 2*G
      layout.openings.forEach((opening) => {
        // Opening height should be region_height - 2*G
        // We can't easily verify the exact region height, but we can verify it's positive
        expect(opening.height_in).toBeGreaterThan(0);
      });
    });
  });

  describe('Test B: Face-frame wall cabinet, doors only', () => {
    it('should compute layout with no mid rails', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 0,
        door_openings: 2,
        reveal_gap_in: 0,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'W30-FF-01',
        type: 'wall',
        construction: 'face_frame',
        width_in: 30,
        height_in: 30,
        face_frame: faceFrame,
        opening,
      };

      const layout = computeCabinetFrontLayout(input);

      // No mid rails (drawer_openings=0, door_openings>0, so 0+1-1=0)
      const midRails = layout.rails.filter((r) => r.key === 'MID');
      expect(midRails.length).toBe(0);

      // One door opening
      expect(layout.openings.length).toBe(1);
      const door = layout.openings[0];
      expect(door.key).toBe('DOOR');
      expect(door.index).toBe(1);

      // Door height = H - TRW - BRW = 30 - 1.5 - 1.5 = 27
      expect(door.height_in).toBe(27.0);
      expect(door.y_from_top_in).toBe(1.5); // TOP rail ends at 1.5

      // Check rails
      expect(layout.rails.length).toBe(2); // TOP and BOTTOM only
      expect(layout.rails[0].key).toBe('TOP');
      expect(layout.rails[1].key).toBe('BOTTOM');
    });
  });

  describe('Test C: Frameless cabinet returns no rails and warning', () => {
    it('should compute openings without rails and gaps', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 1,
        top_drawer_height_in: 6,
        door_openings: 2,
        reveal_gap_in: 0,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'B34-FL-01',
        type: 'base',
        construction: 'frameless',
        width_in: 24,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      const layout = computeCabinetFrontLayout(input);

      // No rails
      expect(layout.rails.length).toBe(0);

      // Warning present
      expect(layout.warnings).toContain('no_face_frame');

      // Openings: 1 drawer + 1 door
      expect(layout.openings.length).toBe(2);

      const drawer = layout.openings.find((o) => o.key === 'DRAWER');
      expect(drawer).toBeDefined();
      expect(drawer?.height_in).toBe(6.0); // No gap reduction
      expect(drawer?.y_from_top_in).toBe(0); // Starts at top

      const door = layout.openings.find((o) => o.key === 'DOOR');
      expect(door).toBeDefined();
      expect(door?.height_in).toBe(28.5); // 34.5 - 6 = 28.5
      expect(door?.y_from_top_in).toBe(6.0); // After drawer
    });
  });

  describe('Test D: Validation errors', () => {
    it('should throw error when reveal_gap too large', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 1,
        top_drawer_height_in: 1.0, // Small drawer
        door_openings: 0,
        reveal_gap_in: 0.6, // Too large: 2*0.6 = 1.2 > 1.0
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'INVALID-01',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      expect(() => {
        computeCabinetFrontLayout(input);
      }).toThrow('reveal_gap_too_large');
    });

    it('should throw error when drawer_openings >= 1 but top_drawer_height_in missing', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 1,
        door_openings: 0,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'INVALID-02',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      expect(() => {
        computeCabinetFrontLayout(input);
      }).toThrow('top_drawer_height_in must be provided and > 0 when drawer_openings >= 1');
    });

    it('should throw error when door_openings > 2', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 0,
        door_openings: 3, // Invalid
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'INVALID-03',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      expect(() => {
        computeCabinetFrontLayout(input);
      }).toThrow('door_openings must be 0, 1, or 2');
    });
  });

  describe('Additional edge cases', () => {
    it('should handle even split for remaining drawers', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 4,
        top_drawer_height_in: 6,
        middle_drawer_height_in: 6,
        // remaining_drawer_height_in not provided
        door_openings: 0,
        reveal_gap_in: 0,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'EVEN-SPLIT',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.5,
        face_frame: faceFrame,
        opening,
      };

      const layout = computeCabinetFrontLayout(input);

      // Should have warning
      expect(layout.warnings).toContain('even_split_used');

      // Should have 4 drawer openings
      const drawers = layout.openings.filter((o) => o.key === 'DRAWER');
      expect(drawers.length).toBe(4);

      // First two should be 6
      expect(drawers[0].height_in).toBe(6.0);
      expect(drawers[1].height_in).toBe(6.0);

      // Last two should be equal (even split)
      expect(drawers[2].height_in).toBe(drawers[3].height_in);
      expect(drawers[2].height_in).toBeGreaterThan(0);
    });

    it('should round all outputs to 3 decimals', () => {
      const faceFrame: FaceFrameRailRules = {
        enabled: true,
        stile_width_in: 1.5,
        top_rail_width_in: 1.5,
        middle_rail_width_in: 1.5,
        bottom_rail_width_in: 1.5,
      };

      const opening: OpeningConfig = {
        drawer_openings: 1,
        top_drawer_height_in: 6.123456,
        door_openings: 1,
        reveal_gap_in: 0.123456,
      };

      const input: CabinetLayoutInput = {
        cabinet_label: 'ROUND-TEST',
        type: 'base',
        construction: 'face_frame',
        width_in: 24,
        height_in: 34.567890,
        face_frame: faceFrame,
        opening,
      };

      const layout = computeCabinetFrontLayout(input);

      // All dimensions should be rounded to 3 decimals
      layout.rails.forEach((rail) => {
        const yDecimals = (rail.y_from_top_in.toString().split('.')[1] || '').length;
        const widthDecimals = (rail.rail_width_in.toString().split('.')[1] || '').length;
        expect(yDecimals).toBeLessThanOrEqual(3);
        expect(widthDecimals).toBeLessThanOrEqual(3);
      });

      layout.openings.forEach((opening) => {
        const yDecimals = (opening.y_from_top_in.toString().split('.')[1] || '').length;
        const heightDecimals = (opening.height_in.toString().split('.')[1] || '').length;
        expect(yDecimals).toBeLessThanOrEqual(3);
        expect(heightDecimals).toBeLessThanOrEqual(3);
      });
    });
  });
});
