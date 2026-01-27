// Motion Challenge Pure Game Engine
// Handles all game logic without React state dependencies

import { GRID_ROWS, GRID_COLS, MOTION_LEVELS } from '../data/motionLevels.js';

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
 * Check if a block's movement direction is valid for its orientation
 * Horizontal blocks can only move LEFT/RIGHT
 * Vertical blocks can only move UP/DOWN
 * Rocks cannot move
 */
export const isDirectionAllowedForBlock = (block, direction) => {
    if (block.type === 'rock') return false;

    const isHorizontal = block.width > block.height;
    const isVertical = block.height > block.width;

    if (isHorizontal) {
        return direction === DIRECTIONS.LEFT || direction === DIRECTIONS.RIGHT;
    }

    if (isVertical) {
        return direction === DIRECTIONS.UP || direction === DIRECTIONS.DOWN;
    }

    return false;
};

/**
 * Check if a block would be within grid bounds after moving
 */
const isWithinBounds = (block, newX, newY) => {
    return (
        newX >= 0 &&
        newY >= 0 &&
        newX + block.width <= GRID_COLS &&
        newY + block.height <= GRID_ROWS
    );
};

/**
 * Check if two blocks collide
 */
const blocksCollide = (block1, block2) => {
    return !(
        block1.x + block1.width <= block2.x ||
        block1.x >= block2.x + block2.width ||
        block1.y + block1.height <= block2.y ||
        block1.y >= block2.y + block2.height
    );
};

/**
 * Detect collision with any other block
 */
export const detectCollision = (movingBlock, allBlocks) => {
    for (const block of allBlocks) {
        if (block.id === movingBlock.id) continue;
        if (blocksCollide(movingBlock, block)) {
            return true;
        }
    }
    return false;
};

/**
 * Check if a single-cell move is valid
 * @param {Array} blocks - Current blocks array
 * @param {string} blockId - ID of block to move
 * @param {string} direction - Direction constant
 * @returns {boolean} - True if move is valid
 */
export const isValidMove = (blocks, blockId, direction) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return false;

    // Check orientation constraint
    if (!isDirectionAllowedForBlock(block, direction)) {
        return false;
    }

    // Calculate new position (single cell)
    const { dx, dy } = getDirectionVector(direction);
    const newX = block.x + dx;
    const newY = block.y + dy;

    // Check bounds
    if (!isWithinBounds(block, newX, newY)) {
        return false;
    }

    // Create hypothetical moved block
    const movedBlock = { ...block, x: newX, y: newY };

    // Check collisions
    if (detectCollision(movedBlock, blocks)) {
        return false;
    }

    return true;
};

/**
 * Attempt to move a block by one cell in the given direction
 * @param {Object} gameState - Current game state {blocks, moves, ...}
 * @param {string} blockId - ID of block to move
 * @param {string} direction - Direction constant
 * @returns {Object|null} - New game state or null if invalid
 */
export const attemptMove = (gameState, blockId, direction) => {
    const { blocks, moves } = gameState;

    if (!isValidMove(blocks, blockId, direction)) {
        return null; // Invalid move returns null
    }

    // Apply the move
    const { dx, dy } = getDirectionVector(direction);
    const newBlocks = blocks.map(block => {
        if (block.id === blockId) {
            return {
                ...block,
                x: block.x + dx,
                y: block.y + dy
            };
        }
        return block;
    });

    // Return new game state with incremented move count
    return {
        ...gameState,
        blocks: newBlocks,
        moves: moves + 1
    };
};

/**
 * Check win condition: hero's rightmost cell aligns with exit column
 * @param {Object} heroBlock - The hero block object
 * @param {Object} exitPosition - Exit position {x, y}
 * @returns {boolean} - True if win condition met
 */
export const checkWinCondition = (heroBlock, exitPosition) => {
    if (!heroBlock) return false;

    // Hero's rightmost cell x-coordinate
    const heroRightmost = heroBlock.x + heroBlock.width - 1;

    // Check if rightmost cell aligns with exit column and correct row
    return (
        heroRightmost === exitPosition.x &&
        heroBlock.y === exitPosition.y
    );
};

/**
 * Get precomputed minimum moves for a level
 * Source of truth for scoring
 * @param {number} levelId - Level number (1-5)
 * @returns {number} - Optimal move count
 */
export const calculateMinMoves = (levelId) => {
    const level = MOTION_LEVELS.find(l => l.id === levelId);
    return level ? level.minMoves : 0;
};

/**
 * Load level data and create initial game state
 * @param {number} levelId - Level number
 * @returns {Object} - Initial game state
 */
export const loadLevel = (levelId) => {
    const levelData = MOTION_LEVELS.find(l => l.id === levelId);
    if (!levelData) {
        throw new Error(`Level ${levelId} not found`);
    }

    return {
        levelId: levelData.id,
        blocks: JSON.parse(JSON.stringify(levelData.blocks)), // Deep clone
        exit: { ...levelData.exit },
        minMoves: levelData.minMoves,
        moves: 0
    };
};

/**
 * Calculate score for completed level
 * Formula: ((level + X)^2) / TimeTaken
 * where X = minMoves / actualMoves
 * @param {number} level - Level number
 * @param {number} minMoves - Optimal moves
 * @param {number} actualMoves - Player's moves
 * @param {number} timeTakenSeconds - Time in seconds
 * @returns {number} - Score
 */
export const calculateLevelScore = (level, minMoves, actualMoves, timeTakenSeconds) => {
    if (actualMoves === 0 || timeTakenSeconds === 0) return 0;

    const X = minMoves / actualMoves;
    const numerator = Math.pow(level + X, 2);
    const score = numerator / timeTakenSeconds;

    return Math.round(score * 100) / 100; // Round to 2 decimals
};

/**
 * Validate level difficulty constraints
 * (For debugging/testing purposes)
 * @param {Object} levelData - Level configuration
 * @returns {Object} - Validation result {valid, errors}
 */
export const validateLevel = (levelData) => {
    const errors = [];

    // Check hero exists
    const hero = levelData.blocks.find(b => b.type === 'hero');
    if (!hero) {
        errors.push('Level must have a hero block');
    }

    // Check hero is initially blocked from exit
    if (hero) {
        const initialState = loadLevel(levelData.id);
        if (checkWinCondition(hero, levelData.exit)) {
            errors.push('Hero must be blocked at level start');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};
