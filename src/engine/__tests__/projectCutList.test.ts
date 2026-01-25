import {
  aggregateCutLists,
  buildWallProjectCutList,
  UnifiedPartRow,
  AggregatedCutRow,
} from '../projectCutList';
import { WallElevationInput } from '../wallElevation';
import { PartRow } from '../types';
import { FaceFramePartRow } from '../faceframe';

describe('Project Cut List Aggregation', () => {
  describe('aggregateCutLists', () => {
    it('should group identical parts across 2 cabinets and sum qty', () => {
      const parts: UnifiedPartRow[] = [
        // Cabinet 1: Side Panel
        {
          part_code: 'B24-FF-01:SIDE:1',
          cabinet_label: 'B24-FF-01',
          name: 'Side Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        // Cabinet 2: Same Side Panel (should group)
        {
          part_code: 'B30-FF-01:SIDE:1',
          cabinet_label: 'B30-FF-01',
          name: 'Side Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        // Cabinet 1: Different part (should not group)
        {
          part_code: 'B24-FF-01:BOTTOM:1',
          cabinet_label: 'B24-FF-01',
          name: 'Bottom Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 22.5,
          height_in: 24,
          qty: 1,
        },
      ];
      
      const result = aggregateCutLists(parts);
      
      // Should have 2 aggregated rows (2 groups)
      expect(result).toHaveLength(2);
      
      // Find the Side Panel group
      const sidePanelGroup = result.find(r => r.name === 'Side Panel');
      expect(sidePanelGroup).toBeDefined();
      expect(sidePanelGroup!.qty_total).toBe(2);
      expect(sidePanelGroup!.sources).toHaveLength(2);
      expect(sidePanelGroup!.sources[0].cabinetLabel).toBe('B24-FF-01');
      expect(sidePanelGroup!.sources[1].cabinetLabel).toBe('B30-FF-01');
      
      // Find the Bottom Panel group
      const bottomPanelGroup = result.find(r => r.name === 'Bottom Panel');
      expect(bottomPanelGroup).toBeDefined();
      expect(bottomPanelGroup!.qty_total).toBe(1);
      expect(bottomPanelGroup!.sources).toHaveLength(1);
    });
    
    it('should handle float normalization and group parts with tiny float differences', () => {
      const parts: UnifiedPartRow[] = [
        {
          part_code: 'CAB1:SIDE:1',
          cabinet_label: 'CAB1',
          name: 'Side Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24.0,
          height_in: 34.5,
          qty: 1,
        },
        // Same part with tiny float noise (should group)
        {
          part_code: 'CAB2:SIDE:1',
          cabinet_label: 'CAB2',
          name: 'Side Panel',
          material_group: 'plywood',
          thickness_in: 0.7500001,
          width_in: 24.0000001,
          height_in: 34.5000001,
          qty: 1,
        },
        // Different part (should not group)
        {
          part_code: 'CAB1:TOP:1',
          cabinet_label: 'CAB1',
          name: 'Top Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24.0,
          height_in: 34.5,
          qty: 1,
        },
      ];
      
      const result = aggregateCutLists(parts);
      
      // Should have 2 groups (Side Panel grouped, Top Panel separate)
      expect(result).toHaveLength(2);
      
      const sidePanelGroup = result.find(r => r.name === 'Side Panel');
      expect(sidePanelGroup).toBeDefined();
      expect(sidePanelGroup!.qty_total).toBe(2);
      expect(sidePanelGroup!.thickness_in).toBe(0.75);
      expect(sidePanelGroup!.width_in).toBe(24);
      expect(sidePanelGroup!.height_in).toBe(34.5);
    });
    
    it('should produce deterministic ordering (same output order every run)', () => {
      const parts: UnifiedPartRow[] = [
        {
          part_code: 'CAB3:PART:1',
          cabinet_label: 'CAB3',
          name: 'Zebra Panel',
          material_group: 'solid',
          thickness_in: 0.75,
          width_in: 12,
          height_in: 30,
          qty: 1,
        },
        {
          part_code: 'CAB1:PART:1',
          cabinet_label: 'CAB1',
          name: 'Alpha Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        {
          part_code: 'CAB2:PART:1',
          cabinet_label: 'CAB2',
          name: 'Beta Panel',
          material_group: 'plywood',
          thickness_in: 0.5,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
      ];
      
      const result1 = aggregateCutLists(parts);
      const result2 = aggregateCutLists(parts);
      
      // Should be identical
      expect(result1).toEqual(result2);
      
      // Should be sorted: material (plywood before solid), then thickness, then name
      expect(result1[0].material_group).toBe('plywood');
      expect(result1[0].thickness_in).toBe(0.5); // Thinner first
      expect(result1[1].thickness_in).toBe(0.75);
      expect(result1[2].material_group).toBe('solid');
    });
    
    it('should merge notes deterministically', () => {
      const parts: UnifiedPartRow[] = [
        {
          part_code: 'CAB1:PART:1',
          cabinet_label: 'CAB1',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
          notes: 'Note A',
        },
        {
          part_code: 'CAB2:PART:1',
          cabinet_label: 'CAB2',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
          notes: 'Note B',
        },
        {
          part_code: 'CAB3:PART:1',
          cabinet_label: 'CAB3',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
          notes: 'Note A', // Duplicate
        },
      ];
      
      const result = aggregateCutLists(parts);
      
      expect(result).toHaveLength(1);
      expect(result[0].notes).toBe('Note A; Note B'); // Sorted alphabetically
    });
    
    it('should stable-sort sources by cabinetLabel then partCode', () => {
      const parts: UnifiedPartRow[] = [
        {
          part_code: 'CAB3:PART:2',
          cabinet_label: 'CAB3',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        {
          part_code: 'CAB1:PART:1',
          cabinet_label: 'CAB1',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        {
          part_code: 'CAB1:PART:2',
          cabinet_label: 'CAB1',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
        {
          part_code: 'CAB2:PART:1',
          cabinet_label: 'CAB2',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
      ];
      
      const result = aggregateCutLists(parts);
      
      expect(result).toHaveLength(1);
      const sources = result[0].sources;
      
      // Should be sorted: CAB1:PART:1, CAB1:PART:2, CAB2:PART:1, CAB3:PART:2
      expect(sources[0].cabinetLabel).toBe('CAB1');
      expect(sources[0].partCode).toBe('CAB1:PART:1');
      expect(sources[1].cabinetLabel).toBe('CAB1');
      expect(sources[1].partCode).toBe('CAB1:PART:2');
      expect(sources[2].cabinetLabel).toBe('CAB2');
      expect(sources[3].cabinetLabel).toBe('CAB3');
    });
    
    it('should handle empty parts array', () => {
      const result = aggregateCutLists([]);
      expect(result).toEqual([]);
    });
    
    it('should handle parts with no notes', () => {
      const parts: UnifiedPartRow[] = [
        {
          part_code: 'CAB1:PART:1',
          cabinet_label: 'CAB1',
          name: 'Test Panel',
          material_group: 'plywood',
          thickness_in: 0.75,
          width_in: 24,
          height_in: 34.5,
          qty: 1,
        },
      ];
      
      const result = aggregateCutLists(parts);
      expect(result[0].notes).toBeUndefined();
    });
  });
  
  describe('buildWallProjectCutList', () => {
    const createBaseCabinet = (
      id: string,
      label: string,
      width: number = 24,
      height: number = 34.5
    ) => ({
      id,
      cabinet_label: label,
      x_from_left_in: 0,
      cabinet_width_in: width,
      cabinet_height_in: height,
      cabinet_depth_in: 24,
      type: 'base' as const,
      construction: 'face_frame' as const,
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
    
    it('should generate aggregated cut list from wall with 2 identical cabinets', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 24, 34.5),
          createBaseCabinet('cab2', 'B24-FF-02', 24, 34.5), // Same size
        ],
      };
      
      const result = buildWallProjectCutList(wallInput);
      
      expect(result.warnings).toEqual([]);
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Should have grouped parts (e.g., Side Panels should be grouped)
      const sidePanels = result.rows.filter(r => r.name === 'Side Panel');
      expect(sidePanels.length).toBeGreaterThan(0);
      
      // Check that identical parts are grouped
      const groupedPart = sidePanels.find(p => p.width_in === 24 && p.height_in === 34.5);
      if (groupedPart) {
        expect(groupedPart.qty_total).toBeGreaterThanOrEqual(2); // At least 2 (one per cabinet)
        expect(groupedPart.sources.length).toBeGreaterThanOrEqual(2);
      }
    });
    
    it('should generate aggregated cut list from wall with different sized cabinets', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 24, 34.5),
          {
            ...createBaseCabinet('cab2', 'B30-FF-01', 30, 34.5),
            cabinet_depth_in: 30, // Different depth (affects side panel width_in)
            cabinet_height_in: 36, // Different height (affects side panel height_in)
          },
        ],
      };
      
      const result = buildWallProjectCutList(wallInput);
      
      expect(result.warnings).toEqual([]);
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Should have separate groups for different sizes
      const sidePanels = result.rows.filter(r => r.name === 'Side Panel');
      // Side panels: width_in = depth, height_in = cabinet height
      // Cabinet 1: depth=24, height=34.5 -> width_in=24, height_in=34.5
      // Cabinet 2: depth=30, height=36 -> width_in=30, height_in=36
      const depth24Panels = sidePanels.filter(p => p.width_in === 24 && p.height_in === 34.5);
      const depth30Panels = sidePanels.filter(p => p.width_in === 30 && p.height_in === 36);
      
      // Both should exist and be separate groups
      expect(depth24Panels.length).toBeGreaterThan(0);
      expect(depth30Panels.length).toBeGreaterThan(0);
    });
    
    it('should handle face frame parts', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 24, 34.5),
        ],
      };
      
      const result = buildWallProjectCutList(wallInput);
      
      // Should have face frame parts (Stiles, Rails)
      const stiles = result.rows.filter(r => r.name === 'Stile');
      const rails = result.rows.filter(r => r.name.includes('Rail'));
      
      expect(stiles.length).toBeGreaterThan(0);
      expect(rails.length).toBeGreaterThan(0);
      
      // Face frame parts should have material_group 'solid'
      stiles.forEach(s => {
        expect(s.material_group).toBe('solid');
      });
    });
    
    it('should handle frameless cabinets (no face frame parts)', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          {
            ...createBaseCabinet('cab1', 'B24-FL-01', 24, 34.5),
            construction: 'frameless',
            face_frame: {
              enabled: false,
              stile_width_in: 1.5,
              top_rail_width_in: 1.5,
              middle_rail_width_in: 1.5,
              bottom_rail_width_in: 1.5,
            },
          },
        ],
      };
      
      const result = buildWallProjectCutList(wallInput);
      
      // Should not have face frame parts
      const stiles = result.rows.filter(r => r.name === 'Stile');
      expect(stiles.length).toBe(0);
      
      // Should still have carcass parts
      expect(result.rows.length).toBeGreaterThan(0);
    });
    
    it('should collect warnings for invalid cabinets', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 24, 34.5),
          {
            ...createBaseCabinet('cab2', 'B24-FF-02', 24, 34.5),
            cabinet_width_in: -5, // Invalid
          },
        ],
      };
      
      const result = buildWallProjectCutList(wallInput);
      
      // Should have warnings for invalid cabinet
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('B24-FF-02'))).toBe(true);
      
      // Should still process valid cabinets
      expect(result.rows.length).toBeGreaterThan(0);
    });
    
    it('should produce deterministic output for same input', () => {
      const wallInput: WallElevationInput = {
        wall_label: 'Test Wall',
        placements: [
          createBaseCabinet('cab1', 'B24-FF-01', 24, 34.5),
          createBaseCabinet('cab2', 'B30-FF-01', 30, 34.5),
        ],
      };
      
      const result1 = buildWallProjectCutList(wallInput);
      const result2 = buildWallProjectCutList(wallInput);
      
      // Should be identical
      expect(result1.rows).toEqual(result2.rows);
      expect(result1.warnings).toEqual(result2.warnings);
    });
  });
});
