// GeoSudo Challenge Configuration
//  Production-grade Geometric Sudoku configuration

export const DEFAULT_DURATION_SECONDS = 600; // 10 minutes
export const TOTAL_LEVELS = 20;
export const MAX_CONSECUTIVE_FAILURES = 3;
export const TIME_WARNING_THRESHOLD = 60; // Show warning at 1 minute

// Shape definitions
export const SHAPES = {
    CIRCLE: 'circle',
    PLUS: 'plus',
    TRIANGLE: 'triangle',
    SQUARE: 'square',
    STAR: 'star' // For 5×5 grids in advanced levels
};

// Visual properties
export const SHAPE_COLORS = {
    circle: '#10B981',    // Green
    plus: '#3B82F6',      // Blue
    triangle: '#3B82F6',  // Blue  
    square: '#EF4444',    // Red
    star: '#F59E0B'       // Amber (for 5×5)
};

export const SHAPE_LABELS = {
    circle: '●',
    plus: '✚',
    triangle: '▲',
    square: '■',
    star: '★'
};

// Score multipliers based on speed
export const SCORE_MULTIPLIERS = {
    FAST: 1.5,    // < 5 seconds
    MEDIUM: 1.2,  // < 10 seconds
    NORMAL: 1.0   // >= 10 seconds
};

// Level configuration
export const LEVEL_CONFIG = {
    // Levels 1-5: BASIC (3×3, 3 shapes)
    BASIC: { levels: [1, 2, 3, 4, 5], gridSize: 3, shapeCount: 3 },

    // Levels 6-10: INTERMEDIATE (4×4, 4 shapes)
    INTERMEDIATE: { levels: [6, 7, 8, 9, 10], gridSize: 4, shapeCount: 4 },

    // Levels 11-15: ADVANCED (4×4, 4 shapes, complex)
    ADVANCED: { levels: [11, 12, 13, 14, 15], gridSize: 4, shapeCount: 4 },

    // Levels 16-20: EXPERT (5×5, 5 shapes)
    EXPERT: { levels: [16, 17, 18, 19, 20], gridSize: 5, shapeCount: 5 }
};

/**
 * Get configuration for a specific level
 */
export function getLevelConfig(level) {
    if (level <= 5) return { type: 'BASIC', ...LEVEL_CONFIG.BASIC };
    if (level <= 10) return { type: 'INTERMEDIATE', ...LEVEL_CONFIG.INTERMEDIATE };
    if (level <= 15) return { type: 'ADVANCED', ...LEVEL_CONFIG.ADVANCED };
    return { type: 'EXPERT', ...LEVEL_CONFIG.EXPERT };
}

/**
 * Get available shapes for a grid size
 */
export function getShapesForGrid(gridSize) {
    const allShapes = [
        SHAPES.CIRCLE,
        SHAPES.PLUS,
        SHAPES.TRIANGLE,
        SHAPES.SQUARE,
        SHAPES.STAR
    ];

    return allShapes.slice(0, gridSize === 3 ? 3 : gridSize);
}
