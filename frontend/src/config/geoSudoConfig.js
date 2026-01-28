// GeoSudo Challenge Configuration - STABLE VERSION

export const DEFAULT_DURATION_SECONDS = 600; // 10 minutes (fallback only)
export const TOTAL_LEVELS = 32;
export const MAX_CONSECUTIVE_FAILURES = 3;
export const TIME_WARNING_THRESHOLD = 60; // Show warning at 1 minute

// Shape definitions
export const SHAPES = {
    CIRCLE: 'circle',
    PLUS: 'plus',
    TRIANGLE: 'triangle',
    SQUARE: 'square'
};

// Visual properties
export const SHAPE_COLORS = {
    circle: '#10B981',    // Green
    plus: '#3B82F6',      // Blue
    triangle: '#F59E0B',  // Amber  
    square: '#EF4444'     // Red
};

export const SHAPE_LABELS = {
    circle: '●',
    plus: '✚',
    triangle: '▲',
    square: '■'
};

// Score multipliers based on speed
export const SCORE_MULTIPLIERS = {
    FAST: 1.5,    // < 5 seconds
    MEDIUM: 1.2,  // < 10 seconds
    NORMAL: 1.0   // >= 10 seconds
};

/**
 * Difficulty Tiers (Logical Constraint Depth)
 * Levels 1-5 (Entry): 2-3 empty, No row/col with 3 knowns, Min Depth 1
 * Levels 6-15 (Medium): 3-5 empty, Max 1 anchor (full row/col), Min Depth 2
 * Levels 16-32 (Hard): 5-7 empty, 0 anchors, Min Depth 3
 */
export const DIFFICULTY_TIERS = {
    ENTRY: {
        minLevel: 1,
        maxLevel: 5,
        emptyCount: [2, 3],
        minDepth: 1,
        maxKnownsPerConstraint: 2 // Level 1-5: No row/col can have 3 shapes
    },
    MEDIUM: {
        minLevel: 6,
        maxLevel: 15,
        emptyCount: [3, 4, 5],
        minDepth: 2,
        maxAnchors: 1 // Max 1 row/col fully filled
    },
    HARD: {
        minLevel: 16,
        maxLevel: 32,
        emptyCount: [5, 6, 7],
        minDepth: 3,
        maxAnchors: 0 // No row/col fully filled
    }
};

/**
 * Get the tier configuration for a given level
 */
export function getTier(level) {
    if (level <= DIFFICULTY_TIERS.ENTRY.maxLevel) return DIFFICULTY_TIERS.ENTRY;
    if (level <= DIFFICULTY_TIERS.MEDIUM.maxLevel) return DIFFICULTY_TIERS.MEDIUM;
    return DIFFICULTY_TIERS.HARD;
}

/**
 * Get the number of cells to remove for a given level
 */
export function getEmptyCountForLevel(level, random) {
    const tier = getTier(level);
    const options = tier.emptyCount;
    return options[random.nextInt(options.length)];
}

/**
 * Get available shapes for a grid size
 * Fixed 4x4 grid for stability
 */
export function getShapesForGrid(gridSize) {
    const allShapes = [
        SHAPES.CIRCLE,
        SHAPES.PLUS,
        SHAPES.TRIANGLE,
        SHAPES.SQUARE
    ];

    return allShapes.slice(0, gridSize);
}
