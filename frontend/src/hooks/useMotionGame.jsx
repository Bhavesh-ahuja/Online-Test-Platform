import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePuzzle, ItemTypes } from '../logic/motionGenerator';

export const useMotionGame = (config, onComplete, onTermination) => {
    const [level, setLevel] = useState(1);
    const [items, setItems] = useState([]);
    const [exitPos, setExitPos] = useState({ x: 3, y: 5 });
    const [gridSize, setGridSize] = useState({ w: 4, h: 6 }); // Default

    // State for score tracking
    const [score, setScore] = useState(0);
    const [puzzlesSolved, setPuzzlesSolved] = useState(0);
    const [levelMoves, setLevelMoves] = useState(0); // Moves for current level
    const [totalMoves, setTotalMoves] = useState(0); // Total moves in session
    const [timeLeft, setTimeLeft] = useState(config?.durationSeconds || 360);
    const [isAnimating, setIsAnimating] = useState(false);

    // Refs for calculation (avoiding stale closures in timeouts)
    const currentMinMovesRef = useRef(10);
    const metricsRef = useRef({
        totalAttempts: 0,
        puzzlesSolved: 0,
        moveHistory: [],
        puzzleStartTimes: [],
        finalScore: 0
    });

    const timerRef = useRef(null);

    // Initial Load
    useEffect(() => {
        loadNewPuzzle(1);
        metricsRef.current.puzzleStartTimes.push(Date.now());

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    // Use a timeout to break the render cycle and ensure latest state is captured if needed
                    // But here we rely on refs for critical data or pass current state wrapper
                    setTimeout(() => handleTimeout(), 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, []);

    const loadNewPuzzle = (lvl) => {
        const { items: newItems, exitPos: newExit, gridSize: newGrid, minMoves } = generatePuzzle(lvl);
        setItems(newItems);
        if (newExit) setExitPos(newExit);
        if (newGrid) setGridSize(newGrid);

        currentMinMovesRef.current = minMoves || (lvl * 2 + 5);
        setLevelMoves(0);
    };

    // Use a ref for score to ensure timeout captures the latest value without dependency issues
    const scoreRef = useRef(0);
    const updateScore = (newPoints) => {
        const s = scoreRef.current + newPoints;
        scoreRef.current = s;
        setScore(s);
    };

    const handleTimeout = () => {
        if (onComplete) {
            onComplete({
                score: scoreRef.current, // Use ref for latest
                metrics: {
                    reason: 'TIMEOUT',
                    totalAttempts: metricsRef.current.totalAttempts,
                    puzzlesSolved: metricsRef.current.puzzlesSolved,
                }
            });
        }
    };

    const calculateConstraints = useCallback((itemId) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        // 1. Horizontal Constraints
        let minX = 0;
        let maxX = gridSize.w - item.w;

        // Check against other items for X
        items.forEach(other => {
            if (other.id === itemId) return;
            if (other.y < item.y + item.h && other.y + other.h > item.y) {
                if (other.x + other.w <= item.x) {
                    minX = Math.max(minX, other.x + other.w);
                }
                if (other.x >= item.x + item.w) {
                    maxX = Math.min(maxX, other.x - item.w);
                }
            }
        });

        // 2. Vertical Constraints
        let minY = 0;
        let maxY = gridSize.h - item.h;

        items.forEach(other => {
            if (other.id === itemId) return;
            if (other.x < item.x + item.w && other.x + other.w > item.x) {
                if (other.y + other.h <= item.y) {
                    minY = Math.max(minY, other.y + other.h);
                }
                if (other.y >= item.y + item.h) {
                    maxY = Math.min(maxY, other.y - item.h);
                }
            }
        });

        return { minX, maxX, minY, maxY };
    }, [items, gridSize]);

    const moveItemTo = useCallback((itemId, newX, newY) => {
        if (isAnimating || timeLeft <= 0) return;

        setItems(prevItems => {
            const idx = prevItems.findIndex(i => i.id === itemId);
            if (idx === -1) return prevItems;

            const item = prevItems[idx];
            if (item.x === newX && item.y === newY) return prevItems;

            const newItem = { ...item, x: newX, y: newY };

            // Check Win
            if (newItem.type === ItemTypes.TARGET && newX === exitPos.x && newY === exitPos.y) {
                // Pass current level moves + 1 (this move) to solver handler
                // Need to use functional update or ref for accurate move count?
                // We'll trigger it via effect or timeout to read latest state.
                setTimeout(() => handlePuzzleSolved(), 300);
            }

            const newArr = [...prevItems];
            newArr[idx] = newItem;

            metricsRef.current.totalAttempts++;
            return newArr;
        });

        setLevelMoves(m => m + 1);
        setTotalMoves(tm => tm + 1);
    }, [isAnimating, timeLeft, exitPos]);

    const handlePuzzleSolved = () => {
        // Calculate Score based on Efficiency
        // Moves used for this puzzle: levelMoves + 1 (the winning move)
        // Safety: ensure no divide by zero
        const actualMoves = Math.max(1, levelMoves + 1);
        const optimalMoves = currentMinMovesRef.current;

        // Efficiency Ratio
        // if Actual <= Optimal -> 1.0 -> 100 pts
        // if Actual = 2 * Optimal -> 0.5 -> 50 pts
        let ratio = optimalMoves / actualMoves;
        if (ratio > 1) ratio = 1; // Cap at 100%

        const points = Math.max(10, Math.round(100 * ratio));

        updateScore(points);

        setPuzzlesSolved(p => p + 1);
        metricsRef.current.puzzlesSolved++;
        const newLvl = level + 1;
        setLevel(newLvl);
        loadNewPuzzle(newLvl);
    };

    const skipPuzzle = () => {
        // No points for skip
        loadNewPuzzle(level);
    };

    return {
        items,
        exitPos,
        gridSize,
        timeLeft,
        moves: totalMoves,
        levelMoves,
        puzzlesSolved,
        level,
        moveItemTo,
        calculateConstraints,
        skipPuzzle,
        currentScore: scoreRef.current
    }; // Use ref for stable return or state
};


