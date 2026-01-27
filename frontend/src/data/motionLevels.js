/*
 * Professional Motion Challenge Levels
 * Company-Grade Cognitive Assessment
 * 
 * CORE ENTITIES:
 * - Red Ball (1×1): Moves UP/DOWN/LEFT/RIGHT, must reach black hole
 * - Plastic Blocks: Rectangular sliders (vertical/horizontal orientation)
 * - Rocks (1×1): Immovable obstacles
 * 
 * DESIGN RULES:
 * - Ball CANNOT move for first 2-3 moves (blocked by plastic/rocks)
 * - 50%+ of solution involves moving blocks, not ball
 * - No direct path to hole initially
 * - Deceptive moves that create dead ends
 */

export const GRID_ROWS = 6;
export const GRID_COLS = 5;

export const BLOCK_TYPES = {
    BALL: 'ball',     // 1×1 red ball (hero)
    PLASTIC: 'plastic', // Rectangular sliders
    ROCK: 'rock'      // 1×1 immovable
};

export const MOTION_LEVELS = [
    // Level 1: Introduction - Solvable with 6-7 setup moves
    {
        id: 1,
        minMoves: 6,
        hole: { x: 4, y: 2 }, // Right side, middle row
        blocks: [
            // RED BALL (1×1) - boxed in top-left (3 sides blocked)
            { id: 'ball', type: 'ball', x: 0, y: 0, width: 1, height: 1 },

            // Vertical blocker RIGHT of ball (blocks direct path)
            { id: 'v1', type: 'plastic', x: 1, y: 0, width: 1, height: 2 },

            // Horizontal blocker BELOW ball
            { id: 'h1', type: 'plastic', x: 0, y: 1, width: 2, height: 1 },

            // Vertical piece middle (must move to clear path)
            { id: 'v2', type: 'plastic', x: 2, y: 1, width: 1, height: 2 },

            // Horizontal piece bottom (can move to unlock v2)
            { id: 'h2', type: 'plastic', x: 1, y: 3, width: 2, height: 1 },

            // Rock in corner (immovable obstacle)
            { id: 'r1', type: 'rock', x: 0, y: 5, width: 1, height: 1 }
        ]
    },

    // Level 2: Planning Required - Ball needs multiple block moves before path opens
    {
        id: 2,
        minMoves: 11,
        hole: { x: 4, y: 4 }, // Bottom-right corner
        blocks: [
            // Ball trapped in middle-left
            { id: 'ball', type: 'ball', x: 0, y: 2, width: 1, height: 1 },

            // Dense vertical wall on right side of ball
            { id: 'v1', type: 'plastic', x: 1, y: 1, width: 1, height: 3 },

            // Horizontal blockers creating layers
            { id: 'h1', type: 'plastic', x: 0, y: 1, width: 2, height: 1 },
            { id: 'h2', type: 'plastic', x: 2, y: 3, width: 2, height: 1 },

            // Vertical piece near hole
            { id: 'v2', type: 'plastic', x: 3, y: 2, width: 1, height: 3 },
            { id: 'v3', type: 'plastic', x: 4, y: 1, width: 1, height: 3 },

            // Strategic rocks blocking direct paths
            { id: 'r1', type: 'rock', x: 2, y: 0, width: 1, height: 1 },
            { id: 'r2', type: 'rock', x: 0, y: 5, width: 1, height: 1 },
            { id: 'r3', type: 'rock', x: 4, y: 0, width: 1, height: 1 }
        ]
    },

    // Level 3: Forced Reversals - Deceptive moves that create dead ends
    {
        id: 3,
        minMoves: 14,
        hole: { x: 2, y: 5 }, // Bottom-middle
        blocks: [
            // Ball in top-right area, far from hole
            { id: 'ball', type: 'ball', x: 4, y: 1, width: 1, height: 1 },

            // Complex vertical barriers
            { id: 'v1', type: 'plastic', x: 0, y: 0, width: 1, height: 3 },
            { id: 'v2', type: 'plastic', x: 2, y: 1, width: 1, height: 3 },
            { id: 'v3', type: 'plastic', x: 3, y: 0, width: 1, height: 2 },

            // Horizontal maze pieces
            { id: 'h1', type: 'plastic', x: 1, y: 3, width: 2, height: 1 },
            { id: 'h2', type: 'plastic', x: 3, y: 4, width: 2, height: 1 },
            { id: 'h3', type: 'plastic', x: 0, y: 5, width: 2, height: 1 },

            // Vertical piece blocking hole area
            { id: 'v4', type: 'plastic', x: 1, y: 4, width: 1, height: 2 },

            // Strategic rocks forcing long detours
            { id: 'r1', type: 'rock', x: 4, y: 0, width: 1, height: 1 },
            { id: 'r2', type: 'rock', x: 0, y: 4, width: 1, height: 1 },
            { id: 'r3', type: 'rock', x: 3, y: 5, width: 1, height: 1 }
        ]
    },

    // Level 4: Tight Constraints - Very few free cells, each move critical
    {
        id: 4,
        minMoves: 16,
        hole: { x: 1, y: 0 }, // Top area, opposite from ball
        blocks: [
            // Ball in bottom-right corner
            { id: 'ball', type: 'ball', x: 4, y: 5, width: 1, height: 1 },

            // Dense vertical barriers
            { id: 'v1', type: 'plastic', x: 0, y: 1, width: 1, height: 3 },
            { id: 'v2', type: 'plastic', x: 2, y: 0, width: 1, height: 3 },
            { id: 'v3', type: 'plastic', x: 3, y: 3, width: 1, height: 3 },
            { id: 'v4', type: 'plastic', x: 4, y: 0, width: 1, height: 2 },

            // Complex horizontal pieces
            { id: 'h1', type: 'plastic', x: 0, y: 0, width: 2, height: 1 },
            { id: 'h2', type: 'plastic', x: 1, y: 4, width: 2, height: 1 },
            { id: 'h3', type: 'plastic', x: 3, y: 2, width: 2, height: 1 },

            // Rocks creating narrow passages
            { id: 'r1', type: 'rock', x: 1, y: 1, width: 1, height: 1 },
            { id: 'r2', type: 'rock', x: 2, y: 5, width: 1, height: 1 },
            { id: 'r3', type: 'rock', x: 4, y: 2, width: 1, height: 1 }
        ]
    },

    // Level 5: Expert - Near-optimal solution required, punishes greedy ball moves
    {
        id: 5,
        minMoves: 19,
        hole: { x: 0, y: 3 }, // Middle-left, forces complex maneuvering
        blocks: [
            // Ball far from hole in top-right
            { id: 'ball', type: 'ball', x: 4, y: 0, width: 1, height: 1 },

            // Maximum vertical barriers creating maze
            { id: 'v1', type: 'plastic', x: 1, y: 0, width: 1, height: 3 },
            { id: 'v2', type: 'plastic', x: 2, y: 2, width: 1, height: 3 },
            { id: 'v3', type: 'plastic', x: 3, y: 1, width: 1, height: 3 },
            { id: 'v4', type: 'plastic', x: 0, y: 4, width: 1, height: 2 },

            // Intricate horizontal pieces
            { id: 'h1', type: 'plastic', x: 2, y: 0, width: 2, height: 1 },
            { id: 'h2', type: 'plastic', x: 0, y: 1, width: 2, height: 1 },
            { id: 'h3', type: 'plastic', x: 3, y: 4, width: 2, height: 1 },
            { id: 'h4', type: 'plastic', x: 1, y: 5, width: 3, height: 1 },

            // Strategic rock placement forcing backtracking
            { id: 'r1', type: 'rock', x: 0, y: 0, width: 1, height: 1 },
            { id: 'r2', type: 'rock', x: 4, y: 4, width: 1, height: 1 },
            { id: 'r3', type: 'rock', x: 2, y: 5, width: 1, height: 1 },
            { id: 'r4', type: 'rock', x: 4, y: 1, width: 1, height: 1 }
        ]
    }
];
