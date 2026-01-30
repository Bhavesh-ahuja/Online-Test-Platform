import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePuzzle, ItemTypes } from '../logic/motionGenerator';

const GRID_WIDTH = 4;
const GRID_HEIGHT = 6;

export const useMotionGame = (config, onComplete, onTermination) => {
    const [level, setLevel] = useState(1);
    const [items, setItems] = useState([]);
    const [exitPos, setExitPos] = useState({ x: 3, y: 5 });
    const [score, setScore] = useState(0);
    const [puzzlesSolved, setPuzzlesSolved] = useState(0);
    const [moves, setMoves] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [timeLeft, setTimeLeft] = useState(config?.durationSeconds || 360);
    const [isAnimating, setIsAnimating] = useState(false);

    // Metrics
    const metricsRef = useRef({
        totalAttempts: 0, // total moves
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
        const { items: newItems, exitPos: newExit } = generatePuzzle(lvl);
        setItems(newItems);
        if (newExit) {
            setExitPos(newExit);
        }
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
                    // ...metricsRef.current
                }
            });
        }
    };

    const calculateScore = () => {
        // Simple scoring
        return metricsRef.current.puzzlesSolved * 100 + (totalMoves * 1);
    };

    // Movement Logic
    const moveItem = useCallback((itemId, direction) => {
        if (isAnimating || timeLeft <= 0) return;

        setItems(prevItems => {
            const itemIndex = prevItems.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return prevItems;

            const item = prevItems[itemIndex];

            // Fix: Prevent moving WALL items
            if (item.type === ItemTypes.WALL) return prevItems;

            // Calculate Slide
            let dx = 0, dy = 0;
            if (direction === 'UP') dy = -1;
            if (direction === 'DOWN') dy = 1;
            if (direction === 'LEFT') dx = -1;
            if (direction === 'RIGHT') dx = 1;

            let dist = 0;
            let finalX = item.x;
            let finalY = item.y;

            // Simulation loop
            while (true) {
                const nextX = finalX + dx;
                const nextY = finalY + dy;

                if (nextX < 0 || nextY < 0 || nextX + item.w > GRID_WIDTH || nextY + item.h > GRID_HEIGHT) {
                    break;
                }

                // Check collision
                const testRect = { ...item, x: nextX, y: nextY };
                const collision = prevItems.some(other => {
                    if (other.id === itemId) return false;
                    return (
                        testRect.x < other.x + other.w &&
                        testRect.x + testRect.w > other.x &&
                        testRect.y < other.y + other.h &&
                        testRect.y + testRect.h > other.y
                    );
                });

                if (collision) break;

                finalX = nextX;
                finalY = nextY;
                dist++;
            }

            if (dist > 0) {
                // Apply update
                const newItems = [...prevItems];
                newItems[itemIndex] = { ...item, x: finalX, y: finalY };

                // Update stats
                setTimeout(() => {
                    // Update external state in a safe way if needed
                }, 0);

                // Track metrics
                metricsRef.current.totalAttempts++;

                // Check Win Condition (Target reached Dynamic Exit)
                if (item.type === ItemTypes.TARGET && finalX === exitPos.x && finalY === exitPos.y) {
                    // Puzzle Solved!
                    // Trigger async to avoid state clash
                    setTimeout(() => handlePuzzleSolved(), 300);
                }

                return newItems;
            }

            return prevItems;
        });

        // Update Moves Counter (Reactive)
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

    // Constraint Logic for Drag
    const calculateConstraints = useCallback((itemId) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        // 1. Horizontal Constraints
        let minX = 0;
        let maxX = GRID_WIDTH - item.w;

        // Check against other items for X
        items.forEach(other => {
            if (other.id === itemId) return;
            // If overlapping in Y, then it constrains X
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
        let maxY = GRID_HEIGHT - item.h;

        items.forEach(other => {
            if (other.id === itemId) return;
            // If overlapping in X, then it constrains Y
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
    }, [items]);

    const moveItemTo = useCallback((itemId, newX, newY) => {
        if (isAnimating || timeLeft <= 0) return;

        setItems(prevItems => {
            const idx = prevItems.findIndex(i => i.id === itemId);
            if (idx === -1) return prevItems;

            const item = prevItems[idx];
            // If no change, return
            if (item.x === newX && item.y === newY) return prevItems;

            const newItem = { ...item, x: newX, y: newY };

            // Check Win
            if (newItem.type === ItemTypes.TARGET && newX === exitPos.x && newY === exitPos.y) {
                setTimeout(() => handlePuzzleSolved(), 300);
            }

            const newArr = [...prevItems];
            newArr[idx] = newItem;

            // Increment move count
            metricsRef.current.totalAttempts++;
            return newArr;
        });

        setMoves(m => m + 1);
        setTotalMoves(tm => tm + 1);
    }, [isAnimating, timeLeft, exitPos]);


    return {
        items,
        exitPos,
        timeLeft,
        moves,
        puzzlesSolved,
        level,
        moveItem, // Keep old one just in case? Or remove? keeping for safety
        moveItemTo,
        calculateConstraints,
        skipPuzzle
    };
};
