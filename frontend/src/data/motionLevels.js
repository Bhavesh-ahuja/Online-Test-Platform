// Motion Challenge Level Definitions
// Grid: 6 rows × 5 columns (company-standard)
// Exit: Right edge at column 4

const GRID_ROWS = 6;
const GRID_COLS = 5;

/**
 * Level Data Structure:
 * - id: Level number
 * - minMoves: Precomputed optimal solution length (source of truth for scoring)
 * - exit: {x, y} position where hero rightmost cell must align
 * - blocks: Array of block objects
 *   - id: Unique identifier
 *   - x, y: Top-left position (0-indexed)
 *   - width, height: Block dimensions
 *   - type: 'hero' | 'plastic' | 'rock'
 *   - orientation: 'horizontal' | 'vertical' | null (for rocks)
 */

export const MOTION_LEVELS = [
    // Level 1: Beginner - Simple path clearing
    {
        id: 1,
        minMoves: 12,
        exit: { x: 4, y: 2 },
        blocks: [
            // Hero block (red, must reach exit)
            { id: 'hero', x: 0, y: 2, width: 2, height: 1, type: 'hero', orientation: 'horizontal' },

            // Vertical blockers
            { id: 'v1', x: 2, y: 1, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v2', x: 3, y: 0, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },

            // Horizontal blockers
            { id: 'h1', x: 1, y: 3, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },

            // Rocks (immovable)
            { id: 'r1', x: 0, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r2', x: 4, y: 5, width: 1, height: 1, type: 'rock', orientation: null },
        ]
    },

    // Level 2: Intermediate - Multiple dependencies
    {
        id: 2,
        minMoves: 18,
        exit: { x: 4, y: 3 },
        blocks: [
            { id: 'hero', x: 0, y: 3, width: 2, height: 1, type: 'hero', orientation: 'horizontal' },

            { id: 'v1', x: 2, y: 2, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v2', x: 3, y: 1, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },
            { id: 'v3', x: 4, y: 0, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },

            { id: 'h1', x: 0, y: 1, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h2', x: 1, y: 4, width: 3, height: 1, type: 'plastic', orientation: 'horizontal' },

            { id: 'r1', x: 0, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r2', x: 1, y: 5, width: 1, height: 1, type: 'rock', orientation: null },
        ]
    },

    // Level 3: Advanced - Deceptive moves required
    {
        id: 3,
        minMoves: 24,
        exit: { x: 4, y: 2 },
        blocks: [
            { id: 'hero', x: 1, y: 2, width: 2, height: 1, type: 'hero', orientation: 'horizontal' },

            { id: 'v1', x: 0, y: 1, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v2', x: 2, y: 0, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v3', x: 3, y: 3, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },
            { id: 'v4', x: 4, y: 0, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },

            { id: 'h1', x: 1, y: 3, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h2', x: 0, y: 4, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },

            { id: 'r1', x: 0, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r2', x: 2, y: 5, width: 1, height: 1, type: 'rock', orientation: null },
        ]
    },

    // Level 4: Expert - High dependency chain
    {
        id: 4,
        minMoves: 28,
        exit: { x: 4, y: 1 },
        blocks: [
            { id: 'hero', x: 0, y: 1, width: 2, height: 1, type: 'hero', orientation: 'horizontal' },

            { id: 'v1', x: 1, y: 2, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },
            { id: 'v2', x: 2, y: 0, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v3', x: 3, y: 2, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },
            { id: 'v4', x: 4, y: 3, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },

            { id: 'h1', x: 2, y: 2, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h2', x: 0, y: 3, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h3', x: 0, y: 5, width: 3, height: 1, type: 'plastic', orientation: 'horizontal' },

            { id: 'r1', x: 0, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r2', x: 4, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
        ]
    },

    // Level 5: Master - Maximum complexity
    {
        id: 5,
        minMoves: 35,
        exit: { x: 4, y: 3 },
        blocks: [
            { id: 'hero', x: 0, y: 3, width: 2, height: 1, type: 'hero', orientation: 'horizontal' },

            { id: 'v1', x: 0, y: 1, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v2', x: 1, y: 4, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v3', x: 2, y: 0, width: 1, height: 3, type: 'plastic', orientation: 'vertical' },
            { id: 'v4', x: 3, y: 1, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },
            { id: 'v5', x: 4, y: 4, width: 1, height: 2, type: 'plastic', orientation: 'vertical' },

            { id: 'h1', x: 1, y: 0, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h2', x: 0, y: 4, width: 2, height: 1, type: 'plastic', orientation: 'horizontal' },
            { id: 'h3', x: 2, y: 5, width: 3, height: 1, type: 'plastic', orientation: 'horizontal' },

            { id: 'r1', x: 0, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r2', x: 3, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
            { id: 'r3', x: 4, y: 0, width: 1, height: 1, type: 'rock', orientation: null },
        ]
    }
];

export { GRID_ROWS, GRID_COLS };
