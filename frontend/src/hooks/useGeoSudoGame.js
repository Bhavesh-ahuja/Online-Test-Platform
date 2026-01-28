import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePuzzle } from '../utils/geoSudoGenerator';
import { validateAnswer } from '../utils/geoSudoEngine';
import {
    TOTAL_LEVELS,
    MAX_CONSECUTIVE_FAILURES,
    SCORE_MULTIPLIERS
} from '../config/geoSudoConfig';

/**
 * GeoSudo Game Hook - STABLE VERSION
 * Matches Digit Challenge pattern
 */
export function useGeoSudoGame(userId, testStartTime, durationSeconds) {
    // Core game state
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedShape, setSelectedShape] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
    const [totalScore, setTotalScore] = useState(0);
    const [gameStatus, setGameStatus] = useState('idle'); // idle, playing, completed, timeout, terminated
    const [puzzleData, setPuzzleData] = useState(null);
    const [levelStartTime, setLevelStartTime] = useState(null);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);

    // Metrics tracking
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        incorrect: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0,
        consecutiveFailures: 0,
        reason: null
    });

    // Timer reference
    const timerRef = useRef(null);

    /**
     * Calculate score for a level
     */
    const calculateLevelScore = useCallback((level, timeTakenSeconds) => {
        if (timeTakenSeconds <= 0) return 0;

        // Formula: (Level² / TimeTaken) × SpeedMultiplier
        const baseScore = Math.pow(level, 2) / timeTakenSeconds;

        // Apply speed bonus
        let speedMultiplier = SCORE_MULTIPLIERS.NORMAL;
        if (timeTakenSeconds < 5) {
            speedMultiplier = SCORE_MULTIPLIERS.FAST;
        } else if (timeTakenSeconds < 10) {
            speedMultiplier = SCORE_MULTIPLIERS.MEDIUM;
        }

        const finalScore = baseScore * speedMultiplier;
        return Math.round(finalScore * 100) / 100;
    }, []);

    /**
     * End the game
     */
    const endGame = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    /**
     * Start the game
     */
    const startGame = useCallback(() => {
        setGameStatus('playing');
        setLevelStartTime(Date.now());

        // Generate first puzzle with dynamic seed
        const seed = `${userId}-${testStartTime}-${Date.now()}`;
        const puzzle = generatePuzzle(1, seed);
        setPuzzleData(puzzle);

        // Start timer
        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    setGameStatus('timeout');
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [userId, testStartTime, endGame]);

    /**
     * Submit current answer (NO FEEDBACK VERSION)
     */
    const submitAnswer = useCallback(() => {
        console.log('[GeoSudo] Submit Answer Called');
        console.log('[GeoSudo] selectedShape:', selectedShape);
        console.log('[GeoSudo] puzzleData:', puzzleData);
        console.log('[GeoSudo] gameStatus:', gameStatus);

        if (!selectedShape || !puzzleData || gameStatus !== 'playing') {
            console.warn('[GeoSudo] Submit blocked:', {
                hasShape: !!selectedShape,
                hasPuzzle: !!puzzleData,
                status: gameStatus
            });
            return;
        }

        const timeTaken = (Date.now() - levelStartTime) / 1000;
        console.log('[GeoSudo] Processing answer, time taken:', timeTaken);

        // Validate answer
        const validation = validateAnswer(
            puzzleData.grid,
            selectedShape,
            puzzleData.questionRow,
            puzzleData.questionCol,
            puzzleData.correctAnswer
        );

        console.log('[GeoSudo] Validation result:', validation);

        // Update metrics
        metricsRef.current.totalAttempts++;
        metricsRef.current.reactionTimes.push(timeTaken);

        if (validation.isCorrect) {
            // CORRECT - Silent progression (NO FEEDBACK)
            console.log('[GeoSudo] ✓ Correct answer!');
            metricsRef.current.correct++;
            metricsRef.current.maxLevel = Math.max(metricsRef.current.maxLevel, currentLevel);

            // Calculate and add score
            const levelScore = calculateLevelScore(currentLevel, timeTaken);
            setTotalScore(prev => prev + levelScore);

            // Reset consecutive failures
            setConsecutiveFailures(0);

            // Move to next level or complete
            if (currentLevel >= TOTAL_LEVELS) {
                console.log('[GeoSudo] All levels completed!');
                setGameStatus('completed');
                endGame();
            } else {
                const nextLevel = currentLevel + 1;
                console.log(`[GeoSudo] Moving to level ${nextLevel}`);
                setCurrentLevel(nextLevel);
                setSelectedShape(null);
                setLevelStartTime(Date.now());
                const seed = `${userId}-${testStartTime}-${nextLevel}-${Date.now()}`;
                const puzzle = generatePuzzle(nextLevel, seed);
                setPuzzleData(puzzle);
            }

        } else {
            // INCORRECT - Silent tracking (NO FEEDBACK)
            console.log('[GeoSudo] ✗ Incorrect answer');
            metricsRef.current.incorrect++;
            const newConsecutiveFailures = consecutiveFailures + 1;
            setConsecutiveFailures(newConsecutiveFailures);
            metricsRef.current.consecutiveFailures = newConsecutiveFailures;

            // Check for consecutive failure limit
            if (newConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.log('[GeoSudo] Consecutive failure limit reached');
                setGameStatus('terminated');
                metricsRef.current.reason = 'CONSECUTIVE_FAILURES';
                endGame();
            } else {
                // Retry same level (NO FEEDBACK)
                console.log(`[GeoSudo] Retry level ${currentLevel}, failures: ${newConsecutiveFailures}`);
                setSelectedShape(null);
                setLevelStartTime(Date.now());
            }
        }
    }, [selectedShape, puzzleData, gameStatus, levelStartTime, currentLevel, consecutiveFailures, calculateLevelScore, userId, testStartTime, endGame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    return {
        // State
        currentLevel,
        selectedShape,
        timeRemaining,
        totalScore,
        gameStatus,
        puzzleData,
        consecutiveFailures,
        metricsRef,

        // Actions
        startGame,
        submitAnswer,
        endGame,
        setSelectedShape
    };
}
