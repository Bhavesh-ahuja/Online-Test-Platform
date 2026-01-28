// GeoSudo Challenge Configuration - STABLE VERSION

export const DEFAULT_DURATION_SECONDS = 600; // 10 minutes (fallback only)
export const TOTAL_LEVELS = 20;
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
