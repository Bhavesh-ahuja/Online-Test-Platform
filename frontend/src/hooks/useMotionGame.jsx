import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePuzzle, ItemTypes } from '../logic/motionGenerator';

export const useMotionGame = (config, onComplete, onTermination) => {
    const [level, setLevel] = useState(1);
    const [items, setItems] = useState([]);
    const [exitPos, setExitPos] = useState({ x: 3, y: 5 });
    const [gridSize, setGridSize] = useState({ w: 4, h: 6 }); // Default

    const [score, setScore] = useState(0);
    const [puzzlesSolved, setPuzzlesSolved] = useState(0);
    const [moves, setMoves] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [timeLeft, setTimeLeft] = useState(config?.durationSeconds || 360);
    const [isAnimating, setIsAnimating] = useState(false);

    // Metrics
    const metricsRef = useRef({
        totalAttempts: 0,
        puzzlesPlaying: 0,
        moveHistory: [],
        puzzleStartTimes: [],
        puzzlesSolved: 0
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
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, []);

    const loadNewPuzzle = (lvl) => {
        const { items: newItems, exitPos: newExit, gridSize: newGrid } = generatePuzzle(lvl);
        setItems(newItems);
        if (newExit) setExitPos(newExit);
        if (newGrid) setGridSize(newGrid);
        setMoves(0);
    };

    const handleTimeout = () => {
        if (onComplete) {
            onComplete({
                score: calculateScore(),
                metrics: {
                    reason: 'TIMEOUT',
                    totalAttempts: metricsRef.current.totalAttempts,
                    puzzlesSolved: metricsRef.current.puzzlesSolved,
                }
            });
        }
    };

    const calculateScore = () => {
        return metricsRef.current.puzzlesSolved * 100 + (totalMoves * 1);
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
                setTimeout(() => handlePuzzleSolved(), 300);
            }

            const newArr = [...prevItems];
            newArr[idx] = newItem;

            metricsRef.current.totalAttempts++;
            return newArr;
        });

        setMoves(m => m + 1);
        setTotalMoves(tm => tm + 1);
    }, [isAnimating, timeLeft, exitPos]);

    const handlePuzzleSolved = () => {
        setPuzzlesSolved(p => p + 1);
        metricsRef.current.puzzlesSolved++;
        const newLvl = level + 1;
        setLevel(newLvl);
        loadNewPuzzle(newLvl);
    };

    const skipPuzzle = () => {
        loadNewPuzzle(level);
    };

    return {
        items,
        exitPos,
        gridSize,
        timeLeft,
        moves,
        puzzlesSolved,
        level,
        moveItemTo,
        calculateConstraints,
        skipPuzzle
    };
};
