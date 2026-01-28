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
    const [streak, setStreak] = useState(0);

    // Metrics tracking
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        incorrect: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0,
        consecutiveFailures: 0,
        streak: 0,
        maxStreak: 0,
        reason: null
    });

    // Timer reference
    const timerRef = useRef(null);

    /**
     * Calculate score for a level
     */
    const calculateLevelScore = useCallback((level, timeTakenSeconds, currentStreak) => {
        if (timeTakenSeconds <= 0) return 0;

        // Base Formula: (Level² / TimeTaken)
        const baseScore = Math.pow(level, 1.5) / (Math.log10(timeTakenSeconds + 1) + 1);

        // Apply speed bonus
        let speedMultiplier = SCORE_MULTIPLIERS.NORMAL;
        if (timeTakenSeconds < 5) {
            speedMultiplier = SCORE_MULTIPLIERS.FAST;
        } else if (timeTakenSeconds < 10) {
            speedMultiplier = SCORE_MULTIPLIERS.MEDIUM;
        }

        // Streak Bonus: +5% per streak point (up to 50%)
        const streakMultiplier = 1 + Math.min(currentStreak * 0.05, 0.5);

        const finalScore = baseScore * speedMultiplier * streakMultiplier;
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
     * Submit current answer (Synchronous Evaluation)
     */
    const submitAnswer = useCallback(() => {
        if (!selectedShape || !puzzleData || gameStatus !== 'playing') {
            return;
        }

        const now = Date.now();
        const timeTaken = (now - levelStartTime) / 1000;

        // Validate answer
        const validation = validateAnswer(
            puzzleData.grid,
            selectedShape,
            puzzleData.questionRow,
            puzzleData.questionCol,
            puzzleData.correctAnswer
        );

        // Update Global Metrics
        metricsRef.current.totalAttempts++;
        metricsRef.current.reactionTimes.push(timeTaken);

        if (validation.isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            metricsRef.current.streak = newStreak;
            metricsRef.current.maxStreak = Math.max(metricsRef.current.maxStreak, newStreak);
            metricsRef.current.correct++;
            metricsRef.current.maxLevel = Math.max(metricsRef.current.maxLevel, currentLevel);

            // Calculate score with streak bonus
            const levelScore = calculateLevelScore(currentLevel, timeTaken, newStreak);
            setTotalScore(prev => prev + levelScore);

            // Reset failures on success
            setConsecutiveFailures(0);

            // Advance or Finish
            if (currentLevel >= TOTAL_LEVELS) {
                setGameStatus('completed');
                endGame();
            } else {
                const nextLevel = currentLevel + 1;
                setCurrentLevel(nextLevel);
                setSelectedShape(null);
                setLevelStartTime(now);
                const seed = `${userId}-${testStartTime}-${nextLevel}-${now}`;
                const puzzle = generatePuzzle(nextLevel, seed);
                setPuzzleData(puzzle);
            }
        } else {
            // INCORRECT
            setStreak(0);
            metricsRef.current.streak = 0;
            metricsRef.current.incorrect++;

            const newFailures = consecutiveFailures + 1;
            setConsecutiveFailures(newFailures);
            metricsRef.current.consecutiveFailures = newFailures;

            if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
                setGameStatus('terminated');
                metricsRef.current.reason = 'CONSECUTIVE_FAILURES';
                endGame();
            } else {
                // Retry same level
                setSelectedShape(null);
                setLevelStartTime(now);
            }
        }
    }, [selectedShape, puzzleData, gameStatus, levelStartTime, currentLevel, consecutiveFailures, streak, calculateLevelScore, userId, testStartTime, endGame]);

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
