// Motion Challenge Pure Game Engine - GRID-CENTRIC
// Grid is the single source of truth

import { MOTION_LEVELS } from '../data/motionLevels.js';

export const GRID_ROWS = 6;
export const GRID_COLS = 5;

// Direction constants
export const DIRECTIONS = {
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT'
};

/**
 * Get direction vector for movement
 */
const getDirectionVector = (direction) => {
    switch (direction) {
        case DIRECTIONS.UP: return { dx: 0, dy: -1 };
        case DIRECTIONS.DOWN: return { dx: 0, dy: 1 };
        case DIRECTIONS.LEFT: return { dx: -1, dy: 0 };
        case DIRECTIONS.RIGHT: return { dx: 1, dy: 0 };
        default: return { dx: 0, dy: 0 };
    }
};

/**
 * Initialize empty grid
 */
export const createEmptyGrid = () => {
    return Array(GRID_ROWS).fill(null).map(() =>
        Array(GRID_COLS).fill(null)
    );
};

/**
 * Populate grid from block definitions
 * Grid cells store block IDs for occupancy tracking
 */
export const populateGrid = (blocks) => {
    const grid = createEmptyGrid();

    for (const block of blocks) {
        for (let dy = 0; dy < block.height; dy++) {
            for (let dx = 0; dx < block.width; dx++) {
                const y = block.y + dy;
                const x = block.x + dx;
                if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
                    grid[y][x] = block.id;
                }
            }
        }
    }

    return grid;
};

/**
 * Get block metadata by ID
 */
export const getBlockById = (blocks, blockId) => {
    return blocks.find(b => b.id === blockId);
};

/**
 * Get leading-edge cells for a block moving in direction
 */
const getLeadingEdgeCells = (block, direction) => {
    const cells = [];

    switch (direction) {
        case DIRECTIONS.LEFT:
            for (let dy = 0; dy < block.height; dy++) {
                cells.push({ x: block.x - 1, y: block.y + dy });
            }
            break;
        case DIRECTIONS.RIGHT:
            for (let dy = 0; dy < block.height; dy++) {
                cells.push({ x: block.x + block.width, y: block.y + dy });
            }
            break;
        case DIRECTIONS.UP:
            for (let dx = 0; dx < block.width; dx++) {
                cells.push({ x: block.x + dx, y: block.y - 1 });
            }
            break;
        case DIRECTIONS.DOWN:
            for (let dx = 0; dx < block.width; dx++) {
                cells.push({ x: block.x + dx, y: block.y + block.height });
            }
            break;
    }

    return cells;
};

/**
 * BALL MOVEMENT VALIDATION
 * Ball is NOT a block - separate logic path
 */
export const validateBallMove = (grid, ball, direction, holePosition) => {
    const { x, y } = ball;
    const { dx, dy } = getDirectionVector(direction);

    const newX = x + dx;
    const newY = y + dy;

    // Bounds check
    if (newX < 0 || newX >= GRID_COLS || newY < 0 || newY >= GRID_ROWS) {
        return { valid: false, reason: 'OUT_OF_BOUNDS' };
    }

    // SPECIAL: Allow ball to enter hole
    if (newX === holePosition.x && newY === holePosition.y) {
        return { valid: true, isWinningMove: true };
    }

    // Check if target cell is empty (grid-based check)
    if (grid[newY][newX] !== null) {
        return { valid: false, reason: 'CELL_OCCUPIED' };
    }

    return { valid: true, isWinningMove: false };
};

/**
 * BLOCK MOVEMENT VALIDATION
 * Blocks are orientation-locked
 */
export const validateBlockMove = (grid, blocks, blockId, direction) => {
    const block = getBlockById(blocks, blockId);
    if (!block) return { valid: false, reason: 'BLOCK_NOT_FOUND' };

    // Rock check
    if (block.type === 'rock') {
        return { valid: false, reason: 'ROCK_IMMOVABLE' };
    }

    // Orientation check
    const isHorizontal = block.width > block.height;
    const isVertical = block.height > block.width;

    if (isHorizontal && (direction === DIRECTIONS.UP || direction === DIRECTIONS.DOWN)) {
        return { valid: false, reason: 'ORIENTATION_LOCKED' };
    }
    if (isVertical && (direction === DIRECTIONS.LEFT || direction === DIRECTIONS.RIGHT)) {
        return { valid: false, reason: 'ORIENTATION_LOCKED' };
    }

    // Get leading-edge cells
    const leadingCells = getLeadingEdgeCells(block, direction);

    // Check bounds
    for (const cell of leadingCells) {
        if (cell.x < 0 || cell.x >= GRID_COLS || cell.y < 0 || cell.y >= GRID_ROWS) {
            return { valid: false, reason: 'OUT_OF_BOUNDS' };
        }
    }

    // Check grid occupancy for leading cells (grid-based collision)
    for (const cell of leadingCells) {
        if (grid[cell.y][cell.x] !== null) {
            return { valid: false, reason: 'CELL_OCCUPIED' };
        }
    }

    return { valid: true };
};

/**
 * Attempt to move an entity (ball or block)
 * @returns {Object|null} New game state or null if invalid
 */
export const attemptMove = (gameState, entityId, direction) => {
    const { blocks, grid, hole, moves } = gameState;
    const entity = getBlockById(blocks, entityId);

    if (!entity) return null;

    // SPLIT LOGIC PATHS - Ball vs Block
    let validation;
    if (entity.type === 'ball') {
        validation = validateBallMove(grid, entity, direction, hole);
    } else {
        validation = validateBlockMove(grid, blocks, entityId, direction);
    }

    if (!validation.valid) {
        return null; // Invalid move
    }

    // Execute move - Grid is updated atomically
    const { dx, dy } = getDirectionVector(direction);

    // 1. Clear old grid cells
    const newGrid = grid.map(row => [...row]); // Deep copy
    for (let h = 0; h < entity.height; h++) {
        for (let w = 0; w < entity.width; w++) {
            newGrid[entity.y + h][entity.x + w] = null;
        }
    }

    // 2. Update entity position
    const newBlocks = blocks.map(b => {
        if (b.id === entityId) {
            return { ...b, x: b.x + dx, y: b.y + dy };
        }
        return b;
    });

    // 3. Re-occupy new grid cells
    const movedEntity = newBlocks.find(b => b.id === entityId);
    for (let h = 0; h < movedEntity.height; h++) {
        for (let w = 0; w < movedEntity.width; w++) {
            newGrid[movedEntity.y + h][movedEntity.x + w] = entityId;
        }
    }

    return {
        ...gameState,
        blocks: newBlocks,
        grid: newGrid,
        moves: moves + 1,
        isWinningMove: validation.isWinningMove || false
    };
};

/**
 * Check win condition: ball occupies hole cell
 */
export const checkWinCondition = (ballBlock, holePosition) => {
    if (!ballBlock) return false;
    return (
        ballBlock.x === holePosition.x &&
        ballBlock.y === holePosition.y
    );
};

/**
 * Get minimum moves for a level
 */
export const calculateMinMoves = (levelId) => {
    const level = MOTION_LEVELS.find(l => l.id === levelId);
    return level ? level.minMoves : 0;
};

/**
 * Load level and initialize grid state
 */
export const loadLevel = (levelId) => {
    const levelData = MOTION_LEVELS.find(l => l.id === levelId);
    if (!levelData) {
        throw new Error(`Level ${levelId} not found`);
    }

    const blocks = JSON.parse(JSON.stringify(levelData.blocks));
    const grid = populateGrid(blocks); // Grid initialized from blocks

    return {
        levelId: levelData.id,
        blocks,
        grid, // Grid is now part of state
        hole: { ...levelData.hole },
        minMoves: levelData.minMoves,
        moves: 0
    };
};

/**
 * Calculate score for completed level
 */
export const calculateLevelScore = (level, minMoves, actualMoves, timeTakenSeconds) => {
    if (actualMoves === 0 || timeTakenSeconds === 0) return 0;

    const X = minMoves / actualMoves;
    const numerator = Math.pow(level + X, 2);
    const score = numerator / timeTakenSeconds;

    return Math.round(score * 100) / 100;
};

/**
 * Validate level meets company-grade difficulty standards
 */
export const validateLevelDesign = (levelData) => {
    const { blocks, hole } = levelData;
    const grid = populateGrid(blocks);
    const ball = blocks.find(b => b.type === 'ball');

    if (!ball) {
        return { valid: false, issues: ['No ball found'], stats: {} };
    }

    const issues = [];

    // Rule 1: Ball blocked ≥2 sides
    const ballBlockedSides = [
        (grid[ball.y - 1]?.[ball.x] !== null) || ball.y === 0,
        (grid[ball.y + 1]?.[ball.x] !== null) || ball.y === GRID_ROWS - 1,
        (grid[ball.y]?.[ball.x - 1] !== null) || ball.x === 0,
        (grid[ball.y]?.[ball.x + 1] !== null) || ball.x === GRID_COLS - 1,
    ].filter(Boolean).length;

    if (ballBlockedSides < 2) {
        issues.push(`Ball only blocked on ${ballBlockedSides} sides (need ≥2)`);
    }

    // Rule 2: ≥60% blocks immobile
    const plasticBlocks = blocks.filter(b => b.type === 'plastic');
    const movableBlocks = plasticBlocks.filter(b => {
        return ['UP', 'DOWN', 'LEFT', 'RIGHT'].some(dir => {
            const validation = validateBlockMove(grid, blocks, b.id, dir);
            return validation.valid;
        });
    });

    const immobilePercent = plasticBlocks.length > 0
        ? (plasticBlocks.length - movableBlocks.length) / plasticBlocks.length * 100
        : 0;

    if (immobilePercent < 60) {
        issues.push(`Only ${Math.round(immobilePercent)}% immobile (need ≥60%)`);
    }

    // Rule 3: Min 5 moves
    if (levelData.minMoves < 5) {
        issues.push(`MinMoves=${levelData.minMoves} (need ≥5)`);
    }

    return {
        valid: issues.length === 0,
        issues,
        stats: {
            ballBlockedSides,
            immobilePercent: Math.round(immobilePercent),
            minMoves: levelData.minMoves
        }
    };
};

