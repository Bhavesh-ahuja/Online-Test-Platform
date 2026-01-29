/**
 * GeoSudo Puzzle Generator - STABLE VERSION
 * Single question mark per level - WORKING STATE
 */

import { SHAPES, getShapesForGrid, getEmptyCountForLevel, getTier } from '../config/geoSudoConfig.js';

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
 * Get potential candidates for a cell based on Sudoku rules
 */
export function getCandidates(grid, row, col, shapes) {
    const candidates = [];
    for (const shape of shapes) {
        if (isValidPlacement(grid, row, col, shape)) {
            candidates.push(shape)
        }
    }
    return candidates;
}

/**
 * HUMAN LOGIC ANALYZER
 * Returns the "Deduction Depth" needed to solve the target cell.
 */
export function analyzeDeduction(grid, targetRow, targetCol, shapes) {
    const rowCandidates = getCandidates(grid, targetRow, targetCol, shapes);

    // Check Row Triviality (3 shapes known in row)
    const rowKnowns = grid[targetRow].filter(c => c !== null).length;
    if (rowKnowns === 3) return { depth: 1, method: 'Row Elimination' };

    // Check Col Triviality (3 shapes known in col)
    let colKnowns = 0;
    for (let r = 0; r < 4; r++) {
        if (grid[r][targetCol] !== null) colKnowns++;
    }
    if (colKnowns === 3) return { depth: 1, method: 'Col Elimination' };

    // Check Intersection (Row + Col)
    // If only one shape fits the intersection of Row and Col constraints
    if (rowCandidates.length === 1) {
        return { depth: 2, method: 'Row-Col Intersection' };
    }

    // Depth 3: Multiple cells in row/col are empty, requiring multi-step thought
    return { depth: 3, method: 'Strategic Deduction' };
}

/**
 * Count fully filled rows and columns
 */
export function countAnchors(grid) {
    let anchors = 0;
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        if (grid[r].every(c => c !== null)) anchors++;
    }
    for (let c = 0; c < size; c++) {
        if (grid.every(r => r[c] !== null)) anchors++;
    }
    return anchors;
}

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
    const tier = getTier(level);

    let currentSeed = seed;
    let totalAttempts = 0;
    const MAX_TOTAL_ATTEMPTS = 500; // Hard limit to prevent page freeze

    while (totalAttempts < MAX_TOTAL_ATTEMPTS) {
        const seedStr = typeof currentSeed === 'string' ? currentSeed : String(currentSeed);
        const numericSeed = seedStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const random = new SeededRandom(numericSeed);

        // Adaptive Constraints: Relax rules if we're struggling
        const targetDepth = totalAttempts > 200 ? 1 : tier.minDepth;
        const targetAnchors = totalAttempts > 300 ? 8 : (tier.maxAnchors ?? 8);

        for (let attempt = 0; attempt < 20; attempt++) {
            totalAttempts++;
            const completeGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
            if (!fillGrid(completeGrid, shapes, random)) continue;

            const questionRow = random.nextInt(gridSize);
            const questionCol = random.nextInt(gridSize);
            const correctAnswer = completeGrid[questionRow][questionCol];

            const puzzleGrid = completeGrid.map(row => [...row]);
            puzzleGrid[questionRow][questionCol] = null;

            // 1. Mandatory Removals for Non-Triviality
            if (level <= 5 && totalAttempts < 300) {
                const rowOthers = [0, 1, 2, 3].filter(c => c !== questionCol);
                const colOthers = [0, 1, 2, 3].filter(r => r !== questionRow);
                const rSh = shuffle(rowOthers, random);
                const cSh = shuffle(colOthers, random);
                puzzleGrid[questionRow][rSh[0]] = null;
                puzzleGrid[questionRow][rSh[1]] = null;
                puzzleGrid[cSh[0]][questionCol] = null;
            }

            // 2. Strategic Removal Loop
            const totalToRemove = getEmptyCountForLevel(level, random);
            const otherCells = [];
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (puzzleGrid[r][c] !== null) otherCells.push({ r, c });
                }
            }

            const shuffledOthers = shuffle(otherCells, random);
            let removedCount = puzzleGrid.flat().filter(c => c === null).length;

            for (let i = 0; i < shuffledOthers.length && removedCount < totalToRemove; i++) {
                const { r, c } = shuffledOthers[i];
                const originalValue = puzzleGrid[r][c];
                puzzleGrid[r][c] = null;

                let skip = false;
                // Entry Check: No row/col with 3 knowns (only if not relaxed)
                if (level <= 5 && totalAttempts < 100) {
                    for (let k = 0; k < 4; k++) {
                        const rK = puzzleGrid[k].filter(v => v !== null).length;
                        let colK = 0;
                        for (let cr = 0; cr < 4; cr++) if (puzzleGrid[cr][k] !== null) colK++;
                        if (rK === 3 || colK === 3) skip = true;
                    }
                }

                if (level >= 6 && countAnchors(puzzleGrid) > targetAnchors) skip = true;

                if (skip || countSolutionsForTarget(puzzleGrid, questionRow, questionCol, shapes) !== 1) {
                    puzzleGrid[r][c] = originalValue;
                } else {
                    removedCount++;
                }
            }

            // 3. Final Metric Validation
            const deduction = analyzeDeduction(puzzleGrid, questionRow, questionCol, shapes);
            const anchors = countAnchors(puzzleGrid);

            if (deduction.depth >= targetDepth && anchors <= targetAnchors) {
                return {
                    grid: puzzleGrid,
                    questionRow,
                    questionCol,
                    correctAnswer,
                    gridSize,
                    shapes,
                    difficultyMetrics: {
                        depth: deduction.depth,
                        method: deduction.method,
                        anchors
                    }
                };
            }
        }

        currentSeed = currentSeed + "-retry";
    }

    // Absolute fallback: Return the simplest unique puzzle to break the loop
    const fallbackGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const random = new SeededRandom(numericSeed);
    fillGrid(fallbackGrid, shapes, random);
    const qR = random.nextInt(4);
    const qC = random.nextInt(4);
    const cA = fallbackGrid[qR][qC];
    const finalGrid = fallbackGrid.map(row => [...row]);
    finalGrid[qR][qC] = null;

    return {
        grid: finalGrid,
        questionRow: qR,
        questionCol: qC,
        correctAnswer: cA,
        gridSize,
        shapes,
        difficultyMetrics: { depth: 1, method: 'Fallback', anchors: 8 }
    };
}
