/**
 * GeoSudo Game Engine
 * Validates user answers for geometric sudoku puzzles
 */

/**
 * Check if a shape can be placed at a position
 */
export function isValidPlacement(grid, row, col, shape) {
    // Check row for duplicates
    for (let c = 0; c < grid[row].length; c++) {
        if (c !== col && grid[row][c] === shape) {
            return false;
        }
    }

    // Check column for duplicates
    for (let r = 0; r < grid.length; r++) {
        if (r !== row && grid[r][col] === shape) {
            return false;
        }
    }

    return true;
}

/**
 * Validate user's answer
 * @param {Array} grid - Current puzzle grid
 * @param {string} userAnswer - Shape selected by user
 * @param {number} questionRow - Row index of question mark
 * @param {number} questionCol - Column index of question mark
 * @param {string} correctAnswer - The actual correct answer
 * @returns {{isCorrect: boolean, reason: string}}
 */
export function validateAnswer(grid, userAnswer, questionRow, questionCol, correctAnswer) {
    // Create a copy of the grid with the user's answer
    const testGrid = grid.map((row, r) =>
        row.map((cell, c) => (r === questionRow && c === questionCol) ? userAnswer : cell)
    );

    // Check if placement is valid (no duplicates in row/column)
    const isValid = isValidPlacement(testGrid, questionRow, questionCol, userAnswer);

    // Check if it matches the correct answer
    const isCorrect = userAnswer === correctAnswer;

    if (isCorrect && isValid) {
        return {
            isCorrect: true,
            reason: 'Correct! Well done.'
        };
    } else if (!isValid) {
        return {
            isCorrect: false,
            reason: `Shape '${userAnswer}' violates sudoku rules (duplicate in row/column).`
        };
    } else {
        return {
            isCorrect: false,
            reason: `Incorrect. The answer was '${correctAnswer}'.`
        };
    }
}

/**
 * Check if the entire grid is valid (no duplicates)
 */
export function isGridValid(grid) {
    const size = grid.length;

    // Check all rows
    for (let r = 0; r < size; r++) {
        const seen = new Set();
        for (let c = 0; c < size; c++) {
            if (grid[r][c] !== null) {
                if (seen.has(grid[r][c])) return false;
                seen.add(grid[r][c]);
            }
        }
    }

    // Check all columns
    for (let c = 0; c < size; c++) {
        const seen = new Set();
        for (let r = 0; r < size; r++) {
            if (grid[r][c] !== null) {
                if (seen.has(grid[r][c])) return false;
                seen.add(grid[r][c]);
            }
        }
    }

    return true;
}
