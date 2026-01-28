/**
 * GeoSudo Puzzle Generator - STABLE VERSION
 * Single question mark per level - WORKING STATE
 */

import { SHAPES, getShapesForGrid } from '../config/geoSudoConfig';

/**
 * Simple seeded random number generator for reproducibility
 */
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    nextInt(max) {
        return Math.floor(this.next() * max);
    }
}

/**
 * Shuffle array using seeded random
 */
function shuffle(array, random) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = random.nextInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Check if placing a shape at position is valid
 */
function isValidPlacement(grid, row, col, shape) {
    // Check row
    for (let c = 0; c < grid[row].length; c++) {
        if (grid[row][c] === shape) return false;
    }

    // Check column
    for (let r = 0; r < grid.length; r++) {
        if (grid[r][col] === shape) return false;
    }

    return true;
}

/**
 * Fill grid using backtracking for valid sudoku
 */
function fillGrid(grid, shapes, random) {
    const size = grid.length;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] === null) {
                const shapesToTry = shuffle(shapes, random);

                for (const shape of shapesToTry) {
                    if (isValidPlacement(grid, row, col, shape)) {
                        grid[row][col] = shape;

                        if (fillGrid(grid, shapes, random)) {
                            return true;
                        }

                        grid[row][col] = null;
                    }
                }

                return false;
            }
        }
    }

    return true;
}

/**
 * Generate a complete valid puzzle with single question mark
 * STABLE - WORKING VERSION
 */
export function generatePuzzle(level, seed) {
    // Fixed 4x4 grid for stability
    const gridSize = 4;
    const shapes = getShapesForGrid(gridSize);
    const random = new SeededRandom(typeof seed === 'string' ? seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : seed);

    // Create empty grid
    const completeGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

    // Fill grid completely
    fillGrid(completeGrid, shapes, random);

    // Choose a random cell to remove (single question mark)
    const questionRow = random.nextInt(gridSize);
    const questionCol = random.nextInt(gridSize);
    const correctAnswer = completeGrid[questionRow][questionCol];

    // Create puzzle grid with null at the question position
    const puzzleGrid = completeGrid.map((row, r) =>
        row.map((cell, c) => (r === questionRow && c === questionCol) ? null : cell)
    );

    return {
        grid: puzzleGrid,
        questionRow,
        questionCol,
        correctAnswer,
        gridSize,
        shapes
    };
}
