/**
 * GeoSudo Puzzle Generator
 * Generates valid geometric sudoku puzzles with unique solutions
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
 * Find all possible solutions for a cell
 */
function getPossibleShapes(grid, row, col, shapes) {
    const possible = [];

    for (const shape of shapes) {
        if (isValidPlacement(grid, row, col, shape)) {
            possible.push(shape);
        }
    }

    return possible;
}

/**
 * Generate a complete valid puzzle
 * @param {number} level - Current level (1-20)
 * @param {number} seed - Random seed for reproducibility
 * @returns {{grid: Array, questionRow: number, questionCol: number, correctAnswer: string}}
 */
export function generatePuzzle(level, seed) {
    // Determine grid size based on level
    let gridSize;
    if (level <= 5) gridSize = 3;      // BASIC
    else if (level <= 15) gridSize = 4; // INTERMEDIATE & ADVANCED
    else gridSize = 5;                  // EXPERT

    const shapes = getShapesForGrid(gridSize);
    const random = new SeededRandom(seed);

    // Create empty grid
    const completeGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

    // Fill grid completely
    fillGrid(completeGrid, shapes, random);

    // Choose a cell to remove (create the question mark)
    // For harder levels, choose cells with more constraints
    let questionRow, questionCol;

    if (level <= 5) {
        // Easy: any random cell
        questionRow = random.nextInt(gridSize);
        questionCol = random.nextInt(gridSize);
    } else {
        // Harder: prefer cells in middle or with more filled neighbors
        const candidates = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                // Prefer middle cells
                const distFromCenter = Math.abs(r - Math.floor(gridSize / 2)) + Math.abs(c - Math.floor(gridSize / 2));
                if (distFromCenter <= 1) {
                    candidates.push({ r, c });
                }
            }
        }
        const chosen = candidates[random.nextInt(candidates.length)];
        questionRow = chosen.r;
        questionCol = chosen.c;
    }

    const correctAnswer = completeGrid[questionRow][questionCol];

    // Create puzzle grid with null at the question position
    const puzzleGrid = completeGrid.map((row, r) =>
        row.map((cell, c) => (r === questionRow && c === questionCol) ? null : cell)
    );

    // Verify uniqueness of solution
    const possibleAnswers = getPossibleShapes(puzzleGrid, questionRow, questionCol, shapes);

    if (possibleAnswers.length !== 1) {
        console.warn(`Puzzle generated with ${possibleAnswers.length} solutions, regenerating...`);
        // In production, retry with different seed
        return generatePuzzle(level, seed + 1);
    }

    return {
        grid: puzzleGrid,
        questionRow,
        questionCol,
        correctAnswer,
        gridSize,
        shapes
    };
}
