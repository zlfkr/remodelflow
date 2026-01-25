export type CabinetType = "base" | "wall" | "tall";
export type Construction = "frameless" | "face_frame";

export interface ShopStandards {
  carcass_thickness_in: number;     // T, default 0.75
  back_thickness_in: number;        // Tb, default 0.25
  include_back: boolean;            // if false => no back part
  stretcher_width_in: number;       // Sw, default 4.0 (base/tall) or 3.0 (wall) provided by caller
  toe_kick_enabled: boolean;        // only relevant for base/tall
  toe_kick_height_in: number;       // Tk, default 4.5
}

export interface CabinetInput {
  cabinet_label: string;            // e.g., "B24-FF-01"
  type: CabinetType;
  construction: Construction;
  width_in: number;                 // W
  height_in: number;                // H
  depth_in: number;                 // D
  shelves: number;                  // may be 0
}

export type MaterialGroup = "plywood" | "solid";

export interface PartRow {
  part_code: string;                // stable unique code per cabinet + part + index
  cabinet_label: string;
  name: string;                     // "Side Panel", "Bottom Panel", ...
  material_group: MaterialGroup;    // carcass is plywood
  thickness_in: number;
  width_in: number;
  height_in: number;
  qty: number;
  notes?: string;
}
