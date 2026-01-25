import { CabinetInput, ShopStandards, PartRow, CabinetType, Construction } from '../types';
import { computeCabinetFrontLayout, CabinetLayoutInput, FaceFrameRailRules, OpeningConfig } from '../openings';
import { generateCabinetElevationSvg, SvgConfig } from '../elevationSvg';
import { generateCarcassParts } from '../carcass';
import { generateFaceFrameParts, CabinetFaceFrameInput, FaceFrameRules, FaceFramePartRow } from '../faceframe';

type CutListRow = PartRow | FaceFramePartRow;

interface GoldenExportBundle {
  version: string;
  input: {
    cabinet: CabinetInput;
    shopStandards: ShopStandards;
    faceFrameRules: FaceFrameRules;
    layoutInput: CabinetLayoutInput;
  };
  outputs: {
    layout: ReturnType<typeof computeCabinetFrontLayout>;
    svg: string;
    carcassParts: PartRow[];
    faceFrameParts: FaceFramePartRow[];
    cutList: CutListRow[];
  };
}

describe('Golden Regression Tests', () => {
  // Golden fixture A: Base + face_frame + 2 doors
  const fixtureA = {
    cabinet: {
      cabinet_label: 'B24-FF-01',
      type: 'base' as const,
      construction: 'face_frame' as const,
      width_in: 24,
      height_in: 34.5,
      depth_in: 24,
      shelves: 1,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0.25,
    },
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  // Golden fixture B: Base + face_frame + 3 drawers
  const fixtureB = {
    cabinet: {
      cabinet_label: 'B24-FF-02',
      type: 'base' as const,
      construction: 'face_frame' as const,
      width_in: 24,
      height_in: 34.5,
      depth_in: 24,
      shelves: 0,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0,
    },
    opening: {
      drawer_openings: 3,
      top_drawer_height_in: 6,
      middle_drawer_height_in: 6,
      remaining_drawer_height_in: 6,
      door_openings: 0,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  // Golden fixture C: Wall + frameless + 2 doors
  const fixtureC = {
    cabinet: {
      cabinet_label: 'W30-FL-01',
      type: 'wall' as const,
      construction: 'frameless' as const,
      width_in: 30,
      height_in: 30,
      depth_in: 12,
      shelves: 2,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 3.0,
      toe_kick_enabled: false,
      toe_kick_height_in: 0,
    },
    faceFrameRules: {
      enabled: false,
      full_length_stiles: false,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0,
    },
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0,
    } as OpeningConfig,
  };

  // Golden fixture D: Tall + face_frame + doors
  const fixtureD = {
    cabinet: {
      cabinet_label: 'T24-FF-01',
      type: 'tall' as const,
      construction: 'face_frame' as const,
      width_in: 24,
      height_in: 84,
      depth_in: 24,
      shelves: 3,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0.25,
    },
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  // Golden fixture E: Small edge case (width 12)
  const fixtureE = {
    cabinet: {
      cabinet_label: 'B12-FF-01',
      type: 'base' as const,
      construction: 'face_frame' as const,
      width_in: 12,
      height_in: 30,
      depth_in: 12,
      shelves: 0,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0,
    },
    opening: {
      drawer_openings: 0,
      door_openings: 1,
      reveal_gap_in: 0,
    } as OpeningConfig,
  };

  // Golden fixture F: No shelves, include_back false (validate effectiveTb logic)
  const fixtureF = {
    cabinet: {
      cabinet_label: 'B24-FF-03',
      type: 'base' as const,
      construction: 'face_frame' as const,
      width_in: 24,
      height_in: 34.5,
      depth_in: 24,
      shelves: 0,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: false,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0,
    },
    opening: {
      drawer_openings: 0,
      door_openings: 2,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  // Golden fixture G: Base with drawers + doors combination
  const fixtureG = {
    cabinet: {
      cabinet_label: 'B36-FF-01',
      type: 'base' as const,
      construction: 'face_frame' as const,
      width_in: 36,
      height_in: 34.5,
      depth_in: 24,
      shelves: 1,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 4.0,
      toe_kick_enabled: true,
      toe_kick_height_in: 4.5,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0.25,
    },
    opening: {
      drawer_openings: 2,
      top_drawer_height_in: 6,
      middle_drawer_height_in: 6,
      door_openings: 2,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  // Golden fixture H: Wall with drawers
  const fixtureH = {
    cabinet: {
      cabinet_label: 'W30-FF-01',
      type: 'wall' as const,
      construction: 'face_frame' as const,
      width_in: 30,
      height_in: 30,
      depth_in: 12,
      shelves: 2,
    },
    shopStandards: {
      carcass_thickness_in: 0.75,
      back_thickness_in: 0.25,
      include_back: true,
      stretcher_width_in: 3.0,
      toe_kick_enabled: false,
      toe_kick_height_in: 0,
    },
    faceFrameRules: {
      enabled: true,
      full_length_stiles: true,
      stile_width_in: 1.5,
      top_rail_width_in: 1.5,
      middle_rail_width_in: 1.5,
      bottom_rail_width_in: 1.5,
      thickness_in: 0.75,
      scribe_length_in: 0,
    },
    opening: {
      drawer_openings: 1,
      top_drawer_height_in: 6,
      door_openings: 0,
      reveal_gap_in: 0.125,
    } as OpeningConfig,
  };

  const fixtures = [
    { name: 'Fixture A: Base + face_frame + 2 doors', data: fixtureA },
    { name: 'Fixture B: Base + face_frame + 3 drawers', data: fixtureB },
    { name: 'Fixture C: Wall + frameless + 2 doors', data: fixtureC },
    { name: 'Fixture D: Tall + face_frame + doors', data: fixtureD },
    { name: 'Fixture E: Small edge case (width 12)', data: fixtureE },
    { name: 'Fixture F: No shelves, include_back false', data: fixtureF },
    { name: 'Fixture G: Base with drawers + doors', data: fixtureG },
    { name: 'Fixture H: Wall with drawers', data: fixtureH },
  ];

  fixtures.forEach(({ name, data }) => {
    describe(name, () => {
      let bundle: GoldenExportBundle;

      beforeAll(() => {
        const { cabinet, shopStandards, faceFrameRules, opening } = data;

        // Build layout input
        const faceFrame: FaceFrameRailRules = {
          enabled: faceFrameRules.enabled,
          stile_width_in: faceFrameRules.stile_width_in,
          top_rail_width_in: faceFrameRules.top_rail_width_in,
          middle_rail_width_in: faceFrameRules.middle_rail_width_in,
          bottom_rail_width_in: faceFrameRules.bottom_rail_width_in,
        };

        const layoutInput: CabinetLayoutInput = {
          cabinet_label: cabinet.cabinet_label,
          type: cabinet.type,
          construction: cabinet.construction,
          width_in: cabinet.width_in,
          height_in: cabinet.height_in,
          face_frame: faceFrame,
          opening,
        };

        // Compute outputs
        const layout = computeCabinetFrontLayout(layoutInput);

        const svgConfig: Partial<SvgConfig> = {
          cabinet_width_in: cabinet.width_in,
          scale: 20,
          showDimensions: true,
          showLabels: true,
        };
        const svg = generateCabinetElevationSvg(layout, svgConfig);

        const carcassParts = generateCarcassParts(cabinet, shopStandards);

        const faceFrameInput: CabinetFaceFrameInput = {
          cabinet_label: cabinet.cabinet_label,
          type: cabinet.type,
          construction: cabinet.construction,
          width_in: cabinet.width_in,
          height_in: cabinet.height_in,
          door_openings: opening.door_openings,
          drawer_openings: opening.drawer_openings,
          drawer_front_style: 'none',
        };
        const faceFrameParts = generateFaceFrameParts(faceFrameInput, faceFrameRules);

        const cutList: CutListRow[] = [...carcassParts, ...faceFrameParts];

        bundle = {
          version: 'golden-v1',
          input: {
            cabinet,
            shopStandards,
            faceFrameRules,
            layoutInput,
          },
          outputs: {
            layout,
            svg,
            carcassParts,
            faceFrameParts,
            cutList,
          },
        };
      });

      it('should match golden snapshot for export bundle', () => {
        expect(bundle).toMatchSnapshot();
      });

      it('should match golden snapshot for SVG string', () => {
        expect(bundle.outputs.svg).toMatchSnapshot();
      });

      it('should have unique part codes in cut list', () => {
        const codes = bundle.outputs.cutList.map((p) => p.part_code);
        const uniqueCodes = new Set(codes);
        expect(uniqueCodes.size).toBe(codes.length);
      });

      it('should have deterministic output ordering', () => {
        // Verify carcass parts order (side panels first, then top/bottom, back, stretchers, shelves)
        const carcassCodes = bundle.outputs.carcassParts.map((p) => p.part_code);
        const sidePanels = carcassCodes.filter((c) => c.includes(':SIDE:'));
        const bottomPanels = carcassCodes.filter((c) => c.includes(':BOTTOM:'));
        const topPanels = carcassCodes.filter((c) => c.includes(':TOP:'));
        const backPanels = carcassCodes.filter((c) => c.includes(':BACK:'));
        const stretchers = carcassCodes.filter((c) => c.includes(':STRETCHER:'));
        const shelves = carcassCodes.filter((c) => c.includes(':SHELF:'));

        // Side panels should come first
        if (sidePanels.length > 0) {
          expect(carcassCodes.indexOf(sidePanels[0])).toBeLessThan(
            carcassCodes.indexOf(bottomPanels[0] || topPanels[0] || 'zzz')
          );
        }

        // Verify face frame parts order (stiles, top rail, mid rails, bottom rail)
        const faceFrameCodes = bundle.outputs.faceFrameParts.map((p) => p.part_code);
        const stiles = faceFrameCodes.filter((c) => c.includes(':STILE:'));
        const topRails = faceFrameCodes.filter((c) => c.includes(':RAIL_TOP:'));
        const midRails = faceFrameCodes.filter((c) => c.includes(':RAIL_MID:'));
        const bottomRails = faceFrameCodes.filter((c) => c.includes(':RAIL_BOTTOM:'));

        if (stiles.length > 0) {
          expect(faceFrameCodes.indexOf(stiles[0])).toBeLessThan(
            faceFrameCodes.indexOf(topRails[0] || 'zzz')
          );
        }
        if (topRails.length > 0 && midRails.length > 0) {
          expect(faceFrameCodes.indexOf(topRails[0])).toBeLessThan(
            faceFrameCodes.indexOf(midRails[0])
          );
        }
        if (midRails.length > 0 && bottomRails.length > 0) {
          expect(faceFrameCodes.indexOf(midRails[midRails.length - 1])).toBeLessThan(
            faceFrameCodes.indexOf(bottomRails[0])
          );
        }
      });

      it('should have consistent dimensions (rounded to 3 decimals)', () => {
        bundle.outputs.cutList.forEach((part) => {
          // All dimensions should be properly rounded (no more than 3 decimal places)
          const thickness = part.thickness_in.toString();
          const width = part.width_in.toString();
          const height = part.height_in.toString();

          [thickness, width, height].forEach((dim) => {
            const decimalPlaces = dim.includes('.') ? dim.split('.')[1].length : 0;
            expect(decimalPlaces).toBeLessThanOrEqual(3);
          });
        });
      });
    });
  });
});
