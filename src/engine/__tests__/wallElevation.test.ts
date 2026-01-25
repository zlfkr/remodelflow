import {
  generateWallElevation,
  WallCabinetPlacement,
  WallElevationInput,
} from '../wallElevation';

describe('Wall Elevation Engine', () => {
  const createBaseCabinet = (
    id: string,
    label: string,
    x: number,
    width: number = 24,
    height: number = 34.5
  ): WallCabinetPlacement => ({
    id,
    cabinet_label: label,
    x_from_left_in: x,
    cabinet_width_in: width,
    cabinet_height_in: height,
    cabinet_depth_in: 24,
    type: 'base',
    construction: 'face_frame',
    shelves: 1,
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0.125,
    },
    face_frame: {
      enabled: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
    },
  });

  const createWallCabinet = (
    id: string,
    label: string,
    x: number,
    width: number = 30,
    height: number = 30
  ): WallCabinetPlacement => ({
    id,
    cabinet_label: label,
    x_from_left_in: x,
    cabinet_width_in: width,
    cabinet_height_in: height,
    cabinet_depth_in: 12,
    type: 'wall',
    construction: 'frameless',
    shelves: 2,
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0,
    },
    face_frame: {
      enabled: false,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
    },
  });

  describe('Basic composition', () => {
    it('should generate combined SVG with 2 cabinets', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0),
          createBaseCabinet('cab2', 'B30-FF-02', 24),
        ],
        scale_px_per_in: 20,
        padding_in: 2,
        show_dimensions: true,
        show_labels: true,
      };

      const result = generateWallElevation(input);

      // Should have exactly one outer <svg> tag
      const svgMatches = result.svg.match(/<svg[^>]*>/g);
      expect(svgMatches).toHaveLength(1);

      // Should contain both cabinet labels
      expect(result.svg).toContain('B24-FF-01');
      expect(result.svg).toContain('B30-FF-02');

      // Should have correct dimensions
      expect(result.width_px).toBeGreaterThan(0);
      expect(result.height_px).toBeGreaterThan(0);

      // Should have 2 cabinet frames
      expect(result.cabinetFrames).toHaveLength(2);
      expect(result.cabinetFrames[0].cabinet_label).toBe('B24-FF-01');
      expect(result.cabinetFrames[1].cabinet_label).toBe('B30-FF-02');
    });

    it('should include wall dimension label when show_dimensions is true', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [createBaseCabinet('cab1', 'B24-FF-01', 0)],
        show_dimensions: true,
      };

      const result = generateWallElevation(input);

      // Should contain wall dimension text
      expect(result.svg).toMatch(/Wall:\s*\d+\.?\d*"/);
    });

    it('should not include wall dimension label when show_dimensions is false', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [createBaseCabinet('cab1', 'B24-FF-01', 0)],
        show_dimensions: false,
      };

      const result = generateWallElevation(input);

      // Should not contain wall dimension text
      expect(result.svg).not.toMatch(/Wall:\s*\d+\.?\d*"/);
    });
  });

  describe('Determinism', () => {
    it('should produce identical SVG for same input called twice', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0),
          createBaseCabinet('cab2', 'B30-FF-02', 24),
          createWallCabinet('cab3', 'W30-FL-01', 60),
        ],
        scale_px_per_in: 20,
        padding_in: 2,
      };

      const result1 = generateWallElevation(input);
      const result2 = generateWallElevation(input);

      expect(result1.svg).toBe(result2.svg);
      expect(result1.width_px).toBe(result2.width_px);
      expect(result1.height_px).toBe(result2.height_px);
    });

        it('should maintain cabinet order from placements array', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab3', 'Cabinet-C', 60),
          createBaseCabinet('cab1', 'Cabinet-A', 0),
          createBaseCabinet('cab2', 'Cabinet-B', 24),
        ],
        show_labels: true,
      };

      const result = generateWallElevation(input);

      // Cabinets should appear in the order they were provided, not sorted by x position
      // Verify cabinetFrames array maintains order (most reliable check)
      expect(result.cabinetFrames.map(f => f.cabinet_label)).toEqual([
        'Cabinet-C',
        'Cabinet-A',
        'Cabinet-B',
      ]);
      
      // Verify x positions confirm order (C at 60, A at 0, B at 24)
      expect(result.cabinetFrames[0].x_px).toBeGreaterThan(result.cabinetFrames[1].x_px); // C > A
      expect(result.cabinetFrames[0].x_px).toBeGreaterThan(result.cabinetFrames[2].x_px); // C > B
      expect(result.cabinetFrames[2].x_px).toBeGreaterThan(result.cabinetFrames[1].x_px); // B > A
    });
  });

  describe('Overlap detection', () => {
    it('should throw error when two cabinets overlap', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 20, 30), // Overlaps with cab1
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/cabinet_overlap/);
    });

    it('should throw error with specific cabinet IDs in overlap message', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 20, 30),
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/cabinet_overlap:cab1:cab2/);
    });

    it('should allow cabinets that touch but do not overlap', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 24, 30), // Touches but doesn't overlap
        ],
      };

      expect(() => generateWallElevation(input)).not.toThrow();
    });
  });

  describe('No nested SVG', () => {
    it('should not contain nested <svg> tags', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0),
          createBaseCabinet('cab2', 'B30-FF-02', 24),
        ],
      };

      const result = generateWallElevation(input);

      // Count <svg> tags - should be exactly 1 (the outer one)
      const svgTagMatches = result.svg.match(/<svg[^>]*>/g);
      expect(svgTagMatches).toHaveLength(1);

      // Should not contain nested <svg> in the inner content
      // After the first <svg>, there should be no more <svg> tags
      const firstSvgEnd = result.svg.indexOf('>', result.svg.indexOf('<svg'));
      const afterFirstSvg = result.svg.substring(firstSvgEnd + 1);
      expect(afterFirstSvg).not.toContain('<svg');
    });
  });

  describe('Baseline alignment', () => {
    it('should align cabinet bottoms when align_bottoms is true', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24, 34.5),
          createBaseCabinet('cab2', 'B30-FF-02', 24, 30, 30), // Shorter cabinet
        ],
        align_bottoms: true,
      };

      const result = generateWallElevation(input);

      // Both cabinets should have their bottoms aligned
      // The taller cabinet should be positioned higher
      const frame1 = result.cabinetFrames.find((f) => f.id === 'cab1');
      const frame2 = result.cabinetFrames.find((f) => f.id === 'cab2');

      expect(frame1).toBeDefined();
      expect(frame2).toBeDefined();

      // Frame 1 (taller) should have a smaller y_px (higher on screen)
      // Frame 2 (shorter) should have a larger y_px (lower on screen)
      // But their bottoms should align: frame1.y + frame1.height === frame2.y + frame2.height
      const bottom1 = frame1!.y_px + frame1!.height_px;
      const bottom2 = frame2!.y_px + frame2!.height_px;

      // Allow small rounding differences
      expect(Math.abs(bottom1 - bottom2)).toBeLessThan(2);
    });

    it('should use y_from_top_in when align_bottoms is false', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            y_from_top_in: 5,
          },
        ],
        align_bottoms: false,
      };

      const result = generateWallElevation(input);

      const frame1 = result.cabinetFrames.find((f) => f.id === 'cab1');
      expect(frame1).toBeDefined();

      // y_px should account for padding + y_from_top_in
      const expectedY = Math.round((2 + 5) * 20); // padding_in + y_from_top_in * scale
      expect(Math.abs(frame1!.y_px - expectedY)).toBeLessThan(2);
    });
  });

  describe('Validation', () => {
    it('should throw error when placements array is empty', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [],
      };

      expect(() => generateWallElevation(input)).toThrow(/At least one cabinet/);
    });

    it('should throw error when x_from_left_in is negative', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            x_from_left_in: -5,
          },
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/x_from_left_in must be >= 0/);
    });

    it('should throw error when cabinet_width_in is zero or negative', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            cabinet_width_in: 0,
          },
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/cabinet_width_in must be > 0/);
    });

    it('should throw error when cabinet_height_in is zero or negative', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            cabinet_height_in: -10,
          },
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/cabinet_height_in must be > 0/);
    });

    it('should handle invalid opening configurations gracefully', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            opening: {
              drawer_openings: 1,
              door_openings: 0,
              // Missing top_drawer_height_in - should be caught by layout engine
            },
          },
        ],
      };

      // Should not throw at wall level, but should have warnings
      const result = generateWallElevation(input);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate out-of-range values', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0),
            x_from_left_in: -0.1, // Negative
          },
        ],
      };

      expect(() => generateWallElevation(input)).toThrow(/x_from_left_in must be >= 0/);
    });
  });

  describe('Canvas sizing', () => {
    it('should calculate canvas width based on rightmost cabinet', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 24, 30),
          createBaseCabinet('cab3', 'B36-FF-03', 60, 36),
        ],
        scale_px_per_in: 20,
        padding_in: 2,
      };

      const result = generateWallElevation(input);

      // Content width should be max(x + width) = 60 + 36 = 96
      // Total width = 96 + 2*2 = 100 inches
      // Width in px = 100 * 20 = 2000
      const expectedWidthPx = (96 + 2 * 2) * 20;
      expect(result.width_px).toBe(expectedWidthPx);
    });

    it('should calculate canvas height based on tallest cabinet', () => {
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24, 30),
          createBaseCabinet('cab2', 'B30-FF-02', 24, 30, 40), // Tallest
          createBaseCabinet('cab3', 'B36-FF-03', 60, 36, 35),
        ],
        scale_px_per_in: 20,
        padding_in: 2,
      };

      const result = generateWallElevation(input);

      // Content height should be max(height) = 40
      // Total height = 40 + 2*2 = 44 inches
      // Height in px = 44 * 20 = 880
      const expectedHeightPx = (40 + 2 * 2) * 20;
      expect(result.height_px).toBe(expectedHeightPx);
    });
  });

  describe('Golden snapshot tests', () => {
    it('should match golden snapshot for default 3-cabinet wall', () => {
      const input: WallElevationInput = {
        wall_label: 'Kitchen Wall',
        placements: [
          {
            id: 'cab1',
            cabinet_label: 'B24-FF-01',
            x_from_left_in: 0,
            cabinet_width_in: 24,
            cabinet_height_in: 34.5,
            cabinet_depth_in: 24,
            type: 'base',
            construction: 'face_frame',
            shelves: 1,
            opening: {
              drawer_openings: 0,
              door_openings: 2,
              reveal_gap_in: 0.125,
            },
            face_frame: {
              enabled: true,
              stile_width_in: 1.5,
              top_rail_width_in: 1.5,
              middle_rail_width_in: 1.5,
              bottom_rail_width_in: 1.5,
            },
          },
          {
            id: 'cab2',
            cabinet_label: 'B30-FF-01',
            x_from_left_in: 24,
            cabinet_width_in: 30,
            cabinet_height_in: 34.5,
            cabinet_depth_in: 24,
            type: 'base',
            construction: 'face_frame',
            shelves: 0,
            opening: {
              drawer_openings: 3,
              door_openings: 0,
              top_drawer_height_in: 6,
              middle_drawer_height_in: 6,
              remaining_drawer_height_in: 6,
              reveal_gap_in: 0.125,
            },
            face_frame: {
              enabled: true,
              stile_width_in: 1.5,
              top_rail_width_in: 1.5,
              middle_rail_width_in: 1.5,
              bottom_rail_width_in: 1.5,
            },
          },
          {
            id: 'cab3',
            cabinet_label: 'W30-FL-01',
            x_from_left_in: 60,
            cabinet_width_in: 30,
            cabinet_height_in: 30,
            cabinet_depth_in: 12,
            type: 'wall',
            construction: 'frameless',
            shelves: 2,
            opening: {
              drawer_openings: 0,
              door_openings: 2,
              reveal_gap_in: 0,
            },
            face_frame: {
              enabled: false,
              stile_width_in: 1.5,
              top_rail_width_in: 1.5,
              middle_rail_width_in: 1.5,
              bottom_rail_width_in: 1.5,
            },
          },
        ],
        scale_px_per_in: 20,
        padding_in: 2,
        show_dimensions: true,
        show_labels: true,
        align_bottoms: true,
      };

      const result = generateWallElevation(input);

      // Verify exactly one <svg> tag
      const svgMatches = result.svg.match(/<svg[^>]*>/g);
      expect(svgMatches).toHaveLength(1);

      // Snapshot tests
      expect(result).toMatchSnapshot();
      expect(result.svg).toMatchSnapshot();
    });

    it('should match golden snapshot for cabinets touching edges', () => {
      const input: WallElevationInput = {
        wall_label: 'Touching Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 24, 30), // Touches cab1
          createBaseCabinet('cab3', 'B36-FF-03', 54, 36), // Touches cab2
        ],
        scale_px_per_in: 20,
        padding_in: 2,
      };

      const result = generateWallElevation(input);

      // Verify exactly one <svg> tag
      const svgMatches = result.svg.match(/<svg[^>]*>/g);
      expect(svgMatches).toHaveLength(1);

      // Snapshot tests
      expect(result).toMatchSnapshot();
      expect(result.svg).toMatchSnapshot();
    });

    it('should match golden snapshot for mixed heights baseline aligned', () => {
      const input: WallElevationInput = {
        wall_label: 'Mixed Heights Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24, 34.5), // Taller
          createWallCabinet('cab2', 'W30-FL-01', 24, 30, 30), // Shorter
          createBaseCabinet('cab3', 'B36-FF-02', 54, 36, 34.5), // Taller
        ],
        scale_px_per_in: 20,
        padding_in: 2,
        align_bottoms: true,
      };

      const result = generateWallElevation(input);

      // Verify exactly one <svg> tag
      const svgMatches = result.svg.match(/<svg[^>]*>/g);
      expect(svgMatches).toHaveLength(1);

      // Verify baseline alignment
      const frame1 = result.cabinetFrames.find((f) => f.id === 'cab1');
      const frame2 = result.cabinetFrames.find((f) => f.id === 'cab2');
      const bottom1 = frame1!.y_px + frame1!.height_px;
      const bottom2 = frame2!.y_px + frame2!.height_px;
      expect(Math.abs(bottom1 - bottom2)).toBeLessThan(2);

      // Snapshot tests
      expect(result).toMatchSnapshot();
      expect(result.svg).toMatchSnapshot();
    });
  });

  describe('Float stability', () => {
    it('should produce identical SVG despite tiny float noise', () => {
      const baseInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
          createBaseCabinet('cab2', 'B30-FF-02', 30, 30), // Start at 30 to avoid overlap issues
        ],
        scale_px_per_in: 20,
      };

      const noisyInput: WallElevationInput = {
        ...baseInput,
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
            // Add noise to height (doesn't affect overlap detection or pixel rounding at scale 20)
            cabinet_height_in: 34.5 + 0.0001, // Tiny float noise, rounds to same pixels
          },
          {
            ...createBaseCabinet('cab2', 'B30-FF-02', 30, 30),
            // Add noise to x position (30.0001 still far enough from first cabinet's end at 24)
            x_from_left_in: 30 + 0.0001, // Tiny float noise, rounds to same pixels
          },
        ],
      };

      const baseResult = generateWallElevation(baseInput);
      const noisyResult = generateWallElevation(noisyInput);

      // Should be identical due to rounding in pixel calculations
      // At scale 20px/in, 0.0001 inches = 0.002 pixels, which rounds to 0
      expect(baseResult.svg).toBe(noisyResult.svg);
      expect(baseResult.width_px).toBe(noisyResult.width_px);
      expect(baseResult.height_px).toBe(noisyResult.height_px);
    });
  });

  describe('CRLF stability', () => {
    it('should normalize CRLF line endings in inner SVG extraction', () => {
      // Test through generateWallElevation which uses extractInnerSvg
      const input: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 0, 24),
        ],
        scale_px_per_in: 20,
      };

      const result1 = generateWallElevation(input);
      
      // Generate again - should be identical
      const result2 = generateWallElevation(input);

      // Should be identical (no CRLF churn)
      expect(result1.svg).toBe(result2.svg);
      
      // Verify no CRLF in output
      expect(result1.svg).not.toContain('\r\n');
      expect(result1.svg).not.toContain('\r');
    });
  });
});
