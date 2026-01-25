# Golden Regression Tests

## Overview

Golden snapshot tests have been implemented to lock in expected outputs for a fixed set of cabinet inputs. Any unintended changes to the engine will cause tests to fail in CI.

## Files Created/Modified

### 1. Test File
- **`src/engine/__tests__/goldenRegression.test.ts`**
  - Contains 8 golden cabinet fixtures covering:
    - Base + face_frame + 2 doors
    - Base + face_frame + 3 drawers
    - Wall + frameless + 2 doors
    - Tall + face_frame + doors
    - Small edge case (width 12)
    - No shelves, include_back false (validates effectiveTb logic)
    - Base with drawers + doors combination
    - Wall with drawers

### 2. Jest Configuration
- **`jest.config.js`**
  - Added `moduleNameMapper` to support `@/` path aliases
  - Ensures tests can import from `@/engine/...`

### 3. CI Workflow
- **`.github/workflows/ci.yml`**
  - Added `npm test` step to run all tests including golden regression tests

## Test Coverage

Each golden fixture tests:
1. **Export Bundle Snapshot**: Full bundle (inputs + outputs) is snapshotted
2. **SVG Snapshot**: SVG string is separately snapshotted for easier diffing
3. **Part Code Uniqueness**: Ensures no duplicate part codes in cut list
4. **Deterministic Ordering**: Verifies parts are in expected order
5. **Dimension Rounding**: Ensures all dimensions are rounded to 3 decimals

## Running Tests

### Run all tests:
```bash
npm test
```

### Run only golden regression tests:
```bash
npm test -- goldenRegression.test.ts
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Update snapshots (when intentionally changing logic):
```bash
npm test -- goldenRegression.test.ts -u
```

**⚠️ Important**: Only update snapshots when you've intentionally changed the engine logic and verified the new outputs are correct.

## Snapshot Files

After first run, Jest will create snapshot files:
- `src/engine/__tests__/__snapshots__/goldenRegression.test.ts.snap`

These files contain the locked-in expected outputs. Commit them to version control.

## CI Integration

The CI workflow (`.github/workflows/ci.yml`) now runs:
1. `npm ci` - Install dependencies
2. `npm run lint` - Lint code
3. `npm run typecheck` - Type check
4. `npm test` - Run all tests (including golden regression tests)

Any test failure will fail the CI build, preventing unintended changes from being merged.

## Test Philosophy

- **Deterministic**: Same inputs always produce same outputs
- **Strict**: Any change in dimensions, ordering, or SVG output fails
- **No Sorting**: Engine order is preserved (no sorting in tests)
- **No Normalization**: Timestamps/IDs are not included in export bundles
- **Rounding**: Uses engine's existing 3-decimal rounding (no additional rounding)

## Maintenance

When intentionally changing engine logic:
1. Make the change
2. Run tests: `npm test -- goldenRegression.test.ts`
3. Review the diff carefully
4. If changes are expected and correct: `npm test -- goldenRegression.test.ts -u`
5. Commit both code changes and updated snapshots
