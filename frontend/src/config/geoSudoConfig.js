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
 * Difficulty Tiers (Aligned with Platform Assessment Standards)
 * Levels 1-5: 2-3 missing cells
 * Levels 6-15: 3-5 missing cells
 * Levels 16-32: 5-7 missing cells
 */
export const DIFFICULTY_TIERS = {
    ENTRY: { minLevel: 1, maxLevel: 5, emptyCount: [2, 3] },
    MEDIUM: { minLevel: 6, maxLevel: 15, emptyCount: [3, 4, 5] },
    HARD: { minLevel: 16, maxLevel: 32, emptyCount: [5, 6, 7] }
};

/**
 * Get the number of cells to remove for a given level
 */
export function getEmptyCountForLevel(level, random) {
    let options;
    if (level <= DIFFICULTY_TIERS.ENTRY.maxLevel) {
        options = DIFFICULTY_TIERS.ENTRY.emptyCount;
    } else if (level <= DIFFICULTY_TIERS.MEDIUM.maxLevel) {
        options = DIFFICULTY_TIERS.MEDIUM.emptyCount;
    } else {
        options = DIFFICULTY_TIERS.HARD.emptyCount;
    }

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
