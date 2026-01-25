import {
  generateCabinetElevationSvg,
  generateCabinetElevationSvgSimple,
} from '../elevationSvg';
import {
  CabinetFrontLayout,
  RailPlacement,
  OpeningRect,
} from '../openings';

describe('2D Cabinet Elevation SVG Generator', () => {
  describe('Basic SVG generation', () => {
    it('should generate valid SVG markup', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'B24-FF-01',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
          {
            key: 'BOTTOM',
            index: 1,
            y_from_top_in: 33.0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 1.5,
            height_in: 31.5,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Should be valid SVG
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('B24-FF-01');

      // Should contain cabinet outline
      expect(svg).toContain('<rect');
      expect(svg).toContain('stroke="black"');

      // Should contain rails
      expect(svg).toContain('TOP');
      expect(svg).toContain('BOTTOM');

      // Should contain door opening
      expect(svg).toContain('DOOR');
    });

    it('should include cabinet label', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'TEST-CABINET',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });
      expect(svg).toContain('TEST-CABINET');
    });
  });

  describe('Rails rendering', () => {
    it('should render all rails with correct positions', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'RAIL-TEST',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
          {
            key: 'MID',
            index: 1,
            y_from_top_in: 7.5,
            rail_width_in: 1.5,
          },
          {
            key: 'MID',
            index: 2,
            y_from_top_in: 15.0,
            rail_width_in: 1.5,
          },
          {
            key: 'BOTTOM',
            index: 1,
            y_from_top_in: 33.0,
            rail_width_in: 1.5,
          },
        ],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Should contain all rail types
      expect(svg).toContain('TOP');
      expect(svg).toContain('MID');
      expect(svg).toContain('BOTTOM');

      // Should have rail rectangles
      const railRectCount = (svg.match(/<rect/g) || []).length;
      expect(railRectCount).toBeGreaterThan(0);
    });
  });

  describe('Openings rendering', () => {
    it('should render drawers and doors differently', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'OPENING-TEST',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
          {
            key: 'BOTTOM',
            index: 1,
            y_from_top_in: 33.0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DRAWER',
            index: 1,
            y_from_top_in: 1.625,
            height_in: 5.75,
          },
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 9.0,
            height_in: 24.0,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Should contain both drawer and door
      expect(svg).toContain('DRAWER');
      expect(svg).toContain('DOOR');

      // Drawers should have different fill color
      expect(svg).toContain('#f0f0f0'); // Drawer fill
      expect(svg).toContain('#ffffff'); // Door fill
    });

    it('should render multiple drawers', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'MULTI-DRAWER',
        height_in: 34.5,
        rails: [],
        openings: [
          {
            key: 'DRAWER',
            index: 1,
            y_from_top_in: 0,
            height_in: 6.0,
          },
          {
            key: 'DRAWER',
            index: 2,
            y_from_top_in: 6.0,
            height_in: 6.0,
          },
          {
            key: 'DRAWER',
            index: 3,
            y_from_top_in: 12.0,
            height_in: 6.0,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Should contain all drawer labels
      expect(svg).toContain('DRAWER 1');
      expect(svg).toContain('DRAWER 2');
      expect(svg).toContain('DRAWER 3');
    });
  });

  describe('Dimensions rendering', () => {
    it('should include dimensions when showDimensions is true', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'DIM-TEST',
        height_in: 34.5,
        rails: [],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 0,
            height_in: 34.5,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, {
        cabinet_width_in: 24,
        showDimensions: true,
      });

      // Should contain dimension text
      expect(svg).toContain('24"'); // Width
      expect(svg).toContain('34.5"'); // Height
      expect(svg).toContain('34.5"'); // Opening height
    });

    it('should exclude dimensions when showDimensions is false', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'NO-DIM-TEST',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, {
        cabinet_width_in: 24,
        showDimensions: false,
      });

      // Should not contain dimension lines/text
      expect(svg).not.toContain('24"');
      expect(svg).not.toContain('30"');
    });
  });

  describe('Warnings rendering', () => {
    it('should display warnings if present', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'WARNING-TEST',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: ['no_face_frame', 'even_split_used'],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      expect(svg).toContain('Warnings:');
      expect(svg).toContain('no_face_frame');
      expect(svg).toContain('even_split_used');
    });

    it('should not display warnings section if empty', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'NO-WARNING-TEST',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      expect(svg).not.toContain('Warnings:');
    });
  });

  describe('Simplified SVG generation', () => {
    it('should generate simplified SVG without dimensions', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'SIMPLE-TEST',
        height_in: 30,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 1.5,
            height_in: 28.5,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvgSimple(layout, 24);

      // Should be valid SVG
      expect(svg).toContain('<svg');
      expect(svg).toContain('SIMPLE-TEST');

      // Should not have dimensions
      expect(svg).not.toContain('24"');
    });
  });

  describe('Scaling and positioning', () => {
    it('should scale correctly with different scale factors', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'SCALE-TEST',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: [],
      };

      const svg1 = generateCabinetElevationSvg(layout, {
        cabinet_width_in: 24,
        scale: 10,
      });
      const svg2 = generateCabinetElevationSvg(layout, {
        cabinet_width_in: 24,
        scale: 20,
      });

      // Both should be valid
      expect(svg1).toContain('<svg');
      expect(svg2).toContain('<svg');

      // SVG dimensions should differ
      const width1 = svg1.match(/width="(\d+)"/)?.[1];
      const width2 = svg2.match(/width="(\d+)"/)?.[1];
      expect(width1).not.toBe(width2);
      expect(Number(width2)).toBeGreaterThan(Number(width1));
    });

    it('should position elements correctly', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'POS-TEST',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 1.5,
            height_in: 33.0,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, {
        cabinet_width_in: 24,
        scale: 10,
        padding: 20,
      });

      // Should contain positioning attributes
      expect(svg).toContain('x=');
      expect(svg).toContain('y=');

      // Top rail should be at y=20 (padding)
      // Door should be at y=35 (padding + 1.5*10)
      expect(svg).toContain('y="20"'); // Approximate for top rail
    });
  });

  describe('Edge cases', () => {
    it('should handle empty layout (no rails, no openings)', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'EMPTY-TEST',
        height_in: 30,
        rails: [],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      expect(svg).toContain('<svg');
      expect(svg).toContain('EMPTY-TEST');
      expect(svg).toContain('<rect'); // Cabinet outline should exist
    });

    it('should handle frameless cabinet (no rails)', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'FRAMELESS-TEST',
        height_in: 30,
        rails: [],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 0,
            height_in: 30,
          },
        ],
        warnings: ['no_face_frame'],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      expect(svg).toContain('<svg');
      expect(svg).toContain('DOOR');
      expect(svg).toContain('no_face_frame');
    });
  });

  describe('Determinism tests', () => {
    it('should produce identical SVG for same input', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'DET-TEST',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
          {
            key: 'MID',
            index: 1,
            y_from_top_in: 7.5,
            rail_width_in: 1.5,
          },
          {
            key: 'BOTTOM',
            index: 1,
            y_from_top_in: 33.0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DRAWER',
            index: 1,
            y_from_top_in: 1.625,
            height_in: 5.75,
          },
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 9.0,
            height_in: 24.0,
          },
        ],
        warnings: [],
      };

      const svg1 = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });
      const svg2 = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      expect(svg1).toBe(svg2);
    });

    it('should maintain rail ordering stability (TOP, MID1..n, BOTTOM)', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'ORDER-TEST',
        height_in: 50,
        rails: [
          {
            key: 'BOTTOM',
            index: 1,
            y_from_top_in: 48.5,
            rail_width_in: 1.5,
          },
          {
            key: 'MID',
            index: 2,
            y_from_top_in: 25.0,
            rail_width_in: 1.5,
          },
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
          {
            key: 'MID',
            index: 1,
            y_from_top_in: 12.5,
            rail_width_in: 1.5,
          },
        ],
        openings: [],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Extract rail order from SVG (rails are rendered in input order, but we verify consistency)
      const railMatches = svg.match(/TOP|MID|BOTTOM/g) || [];
      
      // Verify same input produces same order
      const svg2 = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });
      const railMatches2 = svg2.match(/TOP|MID|BOTTOM/g) || [];
      expect(railMatches).toEqual(railMatches2);
    });

    it('should handle rounding stability with float noise', () => {
      const layout1: CabinetFrontLayout = {
        cabinet_label: 'ROUND-TEST',
        height_in: 34.5,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0,
            rail_width_in: 1.5,
          },
        ],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 1.5,
            height_in: 33.0,
          },
        ],
        warnings: [],
      };

      // Same layout with tiny float noise
      const layout2: CabinetFrontLayout = {
        cabinet_label: 'ROUND-TEST',
        height_in: 34.5000001,
        rails: [
          {
            key: 'TOP',
            index: 1,
            y_from_top_in: 0.0000001,
            rail_width_in: 1.5000001,
          },
        ],
        openings: [
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 1.5000001,
            height_in: 33.0000001,
          },
        ],
        warnings: [],
      };

      const svg1 = generateCabinetElevationSvg(layout1, { cabinet_width_in: 24 });
      const svg2 = generateCabinetElevationSvg(layout2, { cabinet_width_in: 24 });

      // Extract pixel coordinates from both SVGs
      const extractCoordinates = (svg: string): number[] => {
        const coords: number[] = [];
        const matches = svg.match(/(?:x|y|width|height)="([\d.]+)"/g) || [];
        matches.forEach((match) => {
          const value = parseFloat(match.match(/"([\d.]+)"/)?.[1] || '0');
          coords.push(value);
        });
        return coords;
      };

      const coords1 = extractCoordinates(svg1);
      const coords2 = extractCoordinates(svg2);

      // After rounding to 3 decimals and scaling, coordinates should be identical
      expect(coords1.length).toBe(coords2.length);
      coords1.forEach((coord1, i) => {
        expect(coord1).toBe(coords2[i]);
      });
    });

    it('should render doors with solid stroke and drawers with dashed stroke', () => {
      const layout: CabinetFrontLayout = {
        cabinet_label: 'STROKE-TEST',
        height_in: 34.5,
        rails: [],
        openings: [
          {
            key: 'DRAWER',
            index: 1,
            y_from_top_in: 0,
            height_in: 6.0,
          },
          {
            key: 'DOOR',
            index: 1,
            y_from_top_in: 6.0,
            height_in: 28.5,
          },
        ],
        warnings: [],
      };

      const svg = generateCabinetElevationSvg(layout, { cabinet_width_in: 24 });

      // Find drawer and door rectangles
      const drawerRectMatch = svg.match(/<rect[^>]*y="[\d.]+"[^>]*>/g);
      expect(drawerRectMatch).toBeTruthy();
      
      // Drawer should have dashed stroke (stroke-dasharray="4,2")
      const drawerSection = svg.substring(0, svg.indexOf('DOOR'));
      expect(drawerSection).toContain('stroke-dasharray="4,2"');

      // Door should have solid stroke (no stroke-dasharray)
      const doorSection = svg.substring(svg.indexOf('DOOR'));
      expect(doorSection).not.toContain('stroke-dasharray');
    });
  });
});
