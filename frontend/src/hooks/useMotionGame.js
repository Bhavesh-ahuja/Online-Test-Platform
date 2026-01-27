import { useState, useRef, useCallback } from 'react';
import {
    loadLevel,
    attemptMove,
    checkWinCondition,
    calculateMinMoves,
    calculateLevelScore,
    DIRECTIONS
} from '../utils/motionEngine.js';

/**
 * Custom hook for Motion Challenge game logic
 * Manages game state and integrates with pure game engine
 */
export function useMotionGame() {
    // Core game state
    const [level, setLevel] = useState(1);
    const [blocks, setBlocks] = useState([]);
    const [grid, setGrid] = useState(null);
    const [hole, setHole] = useState(null);
    const [moves, setMoves] = useState(0);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState(null);

    // Timing
    const levelStartTime = useRef(null);
    const totalElapsedTime = useRef(0);

    // Metrics for submission
    const metricsRef = useRef({
        totalMoves: 0,
        levelsCompleted: 0,
        maxLevel: 1,
        violations: 0,
        levelScores: []
    });

    /**
     * Initialize/restart game
     */
    const startGame = useCallback(() => {
        const levelData = loadLevel(1);
        setLevel(1);
        setBlocks(levelData.blocks);
        setGrid(levelData.grid);
        setHole(levelData.hole);
        setMoves(0);
        setScore(0);
        setIsGameOver(false);
        setIsLevelComplete(false);
        setActiveBlockId(null);
        levelStartTime.current = Date.now();
        totalElapsedTime.current = 0;

        metricsRef.current = {
            totalMoves: 0,
            levelsCompleted: 0,
            maxLevel: 1,
            violations: 0,
            levelScores: []
        };
    }, []);

    /**
     * Handle block movement attempt
     * @param {string} blockId - ID of block to move
     * @param {string} direction - Direction constant
     * @returns {boolean} - True if move was successful
     */
    const handleMove = useCallback((blockId, direction) => {
        if (isGameOver || isLevelComplete) return false;

        const gameState = { blocks, grid, hole, moves };
        const newState = attemptMove(gameState, blockId, direction);

        if (newState) {
            // Valid move
            setBlocks(newState.blocks);
            setGrid(newState.grid);
            setMoves(newState.moves);
            metricsRef.current.totalMoves++;

            // Check win condition
            const ballBlock = newState.blocks.find(b => b.type === 'ball');
            const levelData = loadLevel(level);

            // Check for winning move
            if (newState.isWinningMove || checkWinCondition(ballBlock, levelData.hole)) {
                handleLevelComplete();
            }

            return true;
        }

        return false; // Invalid move
    }, [blocks, grid, moves, hole, level, isGameOver, isLevelComplete]);

    /**
     * Handle level completion
     */
    const handleLevelComplete = useCallback(() => {
        setIsLevelComplete(true);

        // Calculate level score
        const timeTaken = (Date.now() - levelStartTime.current) / 1000; // seconds
        const minMoves = calculateMinMoves(level);
        const levelScore = calculateLevelScore(level, minMoves, moves + 1, timeTaken); // +1 for the winning move

        setScore(prev => prev + levelScore);
        metricsRef.current.levelsCompleted++;
        metricsRef.current.levelScores.push({
            level,
            moves: moves + 1,
            minMoves,
            timeTaken,
            score: levelScore
        });

        // Auto-advance after brief delay
        setTimeout(() => {
            if (level < 5) {
                advanceLevel();
            } else {
                // All levels complete
                setIsGameOver(true);
            }
        }, 1500);
    }, [level, moves]);

    /**
     * Advance to next level
     */
    const advanceLevel = useCallback(() => {
        const nextLevel = level + 1;
        const levelData = loadLevel(nextLevel);

        setLevel(nextLevel);
        setBlocks(levelData.blocks);
        setGrid(levelData.grid);
        setHole(levelData.hole);
        setMoves(0);
        setIsLevelComplete(false);
        setActiveBlockId(null);
        levelStartTime.current = Date.now();

        if (nextLevel > metricsRef.current.maxLevel) {
            metricsRef.current.maxLevel = nextLevel;
        }
    }, [level]);

    /**
     * Reset current level
     */
    const resetLevel = useCallback(() => {
        const levelData = loadLevel(level);
        setBlocks(levelData.blocks);
        setGrid(levelData.grid);
        setHole(levelData.hole);
        setMoves(0);
        setIsLevelComplete(false);
        setActiveBlockId(null);
        levelStartTime.current = Date.now();
    }, [level]);

    /**
     * End game (called on timeout or violation)
     */
    const endGame = useCallback(() => {
        setIsGameOver(true);
    }, []);

    return {
        // State
        level,
        blocks,
        grid,
        hole,
        moves,
        score,
        isGameOver,
        isLevelComplete,
        activeBlockId,
        metricsRef,

        // Actions
        startGame,
        handleMove,
        resetLevel,
        endGame,
        setActiveBlockId,

        // Utilities
        DIRECTIONS
    };
}
