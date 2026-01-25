# Cabinet Builder UI Verification Guide

## Route Verification

The page is located at: `src/app/cabinet-builder/page.tsx`

**Expected URL:** `http://localhost:3001/cabinet-builder`

**Note:** This project uses `src/app/` structure (not root `app/`), which is valid if:
- Other pages in `src/app/` work (e.g., `/login`, `/owner`)
- `tsconfig.json` has `"paths": { "@/*": ["./src/*"] }` ✅ (confirmed)

If you get a 404, check:
1. Dev server is running: `npm run dev`
2. Other pages work (confirm `src/app/` structure is valid)
3. No build errors in console

## Import Verification

✅ `tsconfig.json` has correct path alias:
```json
"paths": { "@/*": ["./src/*"] }
```

✅ All imports use `@/engine/...` and `@/components/...` which should resolve correctly.

## Core Functionality Tests

### Test 1: Frameless Toggle
**Steps:**
1. Set `construction = "frameless"`
2. Check Debug Panel: `Rails Count` should be `0`
3. Check Cut List: Should have NO face-frame parts (STILE, RAIL_TOP, RAIL_MID, RAIL_BOTTOM)
4. Check SVG: Should show no rails/stiles

**Expected Results:**
- Face-frame parts array: `[]`
- Rails count: `0`
- Cut list only shows carcass parts

### Test 2: include_back Toggle
**Steps:**
1. Set `include_back = false`
2. Check Cut List: Should have NO "Back Panel" part
3. Check shelf dimensions: `height_in` should increase (because `effectiveTb = 0`)

**Expected Results:**
- No back panel in cut list
- Shelf depth = `D` (not `D - Tb`) when `include_back = false`

### Test 3: drawer_openings = 3
**Steps:**
1. Set:
   - `drawer_openings = 3`
   - `top_drawer_height_in = 6`
   - `middle_drawer_height_in = 6`
   - `remaining_drawer_height_in = 6`
   - `door_openings = 2`
   - `reveal_gap_in = 0.125`
2. Check Debug Panel:
   - `Rails Count` should be `5` (TOP + 3 MID + BOTTOM)
   - `Openings Count` should be `4` (3 drawers + 1 door)
3. Check Cut List: Should have 3 "Mid Rail" parts
4. Check SVG: Should show 3 drawers and 1 door region

**Expected Results:**
- Layout: 3 MID rails
- Face-frame: 3 mid rails in cut list
- SVG: 4 openings visible

## New Features Added

### 1. Export Bundle (JSON) Button
- Location: Above Cut List table
- Downloads: `cabinet-bundle-{label}-{timestamp}.json`
- Contains: inputs, layout, svg, cutList, timestamp

### 2. Enhanced Warnings Display
- Warnings now shown in yellow highlighted box in Debug Panel
- More prominent visual styling

## Troubleshooting

**If frameless still shows rails:**
- Check that `face_frame.enabled` is correctly set to `false` when `construction === 'frameless'`
- Verify `generateFaceFrameParts()` returns `[]` when `enabled = false`

**If include_back doesn't affect shelf depth:**
- Check that `effectiveTb` logic in carcass engine uses `include_back ? Tb : 0`
- Verify shelf `height_in` formula: `D - effectiveTb`

**If drawer count doesn't match:**
- Layout engine mid_rail_count = `drawer_openings + (door_openings > 0 ? 1 : 0) - 1`
- Face-frame engine mid_rail_count = `drawer_openings` (one per drawer)
- These should match for consistency
