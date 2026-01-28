/**
 * GeoSudo Puzzle Generator - STABLE VERSION
 * Single question mark per level - WORKING STATE
 */

import { SHAPES, getShapesForGrid, getEmptyCountForLevel } from '../config/geoSudoConfig';

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
 * Solver to check for unique solutions
 * We only care if there is exactly 1 valid shape for the target cell
 */
function countSolutionsForTarget(grid, row, col, shapes) {
    let solutions = 0;
    for (const shape of shapes) {
        if (isValidPlacement(grid, row, col, shape)) {
            // Temporarily place it
            grid[row][col] = shape;

            // In a real Sudoku solver, we'd check if the REST of the grid is solvable.
            // For a 4x4 with few removals, if the direct row/col constraints leave only 1 shape,
            // it's usually enough, but let's be more robust by ensuring the WHOLE grid can be finished.

            // Create a temp copy of the grid for full solving
            const tempGrid = grid.map(r => [...r]);
            if (canFinishGrid(tempGrid, shapes)) {
                solutions++;
            }

            grid[row][col] = null;
        }
    }
    return solutions;
}

function canFinishGrid(grid, shapes) {
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === null) {
                for (const shape of shapes) {
                    if (isValidPlacement(grid, r, c, shape)) {
                        grid[r][c] = shape;
                        if (canFinishGrid(grid, shapes)) return true;
                        grid[r][c] = null;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

/**
 * Generate a complete valid puzzle with multiple empty cells
 * STABLE - PROGRESSIVE DIFFICULTY VERSION (L1-32)
 */
export function generatePuzzle(level, seed) {
    const gridSize = 4;
    const shapes = getShapesForGrid(gridSize);

    // Use a multi-layered seed for better entropy
    const seedStr = typeof seed === 'string' ? seed : String(seed);
    const numericSeed = seedStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const random = new SeededRandom(numericSeed);

    // Guard against rare bad luck with regeneration limit
    for (let attempt = 0; attempt < 10; attempt++) {
        const completeGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
        if (!fillGrid(completeGrid, shapes, random)) continue;

        const questionRow = random.nextInt(gridSize);
        const questionCol = random.nextInt(gridSize);
        const correctAnswer = completeGrid[questionRow][questionCol];

        const totalToRemove = getEmptyCountForLevel(level, random);
        const puzzleGrid = completeGrid.map(row => [...row]);
        puzzleGrid[questionRow][questionCol] = null;

        // Difficulty Tuning: For Levels 1-5 (ENTRY), enforce a 2-step deduction.
        // This is done by ensuring at least one other cell in the same row is removed,
        // making the row ambiguous until you check the column.
        if (level <= 5) {
            let rowNeighbors = [];
            for (let c = 0; c < gridSize; c++) {
                if (c !== questionCol) rowNeighbors.push({ r: questionRow, c });
            }
            const neighbor = rowNeighbors[random.nextInt(rowNeighbors.length)];
            puzzleGrid[neighbor.r][neighbor.c] = null;
        }

        // Collect all potential cells to remove
        const otherCells = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (puzzleGrid[r][c] !== null) {
                    otherCells.push({ r, c });
                }
            }
        }

        const shuffledOthers = shuffle(otherCells, random);
        let removedCount = puzzleGrid.flat().filter(c => c === null).length;

        // Iteratively remove cells while maintaining a unique solution for the target
        for (let i = 0; i < shuffledOthers.length && removedCount < totalToRemove; i++) {
            const { r, c } = shuffledOthers[i];
            const originalValue = puzzleGrid[r][c];
            puzzleGrid[r][c] = null;

            if (countSolutionsForTarget(puzzleGrid, questionRow, questionCol, shapes) === 1) {
                removedCount++;
            } else {
                puzzleGrid[r][c] = originalValue;
            }
        }

        // FINAL VALIDATION: Ensure the puzzle is solvable and the target actually has exactly 1 solution
        if (countSolutionsForTarget(puzzleGrid, questionRow, questionCol, shapes) === 1) {
            return {
                grid: puzzleGrid,
                questionRow,
                questionCol,
                correctAnswer,
                gridSize,
                shapes
            };
        }
    }

    // Fallback in case of total collapse (extremely rare)
    return generatePuzzle(level, seed + "-fallback");
}
