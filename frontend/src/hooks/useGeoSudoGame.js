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
export function useGeoSudoGame(userId, testStartTime) {
    // Core game state
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedShape, setSelectedShape] = useState(null);
    const [totalScore, setTotalScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
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
        setIsGameOver(true);
    }, []);

    /**
     * Start the game
     */
    const startGame = useCallback(() => {
        setIsGameOver(false);
        setTotalScore(0);
        setCurrentLevel(1);
        setConsecutiveFailures(0);
        setStreak(0);
        setLevelStartTime(Date.now());

        metricsRef.current = {
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
        };

        // Generate first puzzle with dynamic seed
        const seed = `${userId}-${testStartTime}-${Date.now()}`;
        const puzzle = generatePuzzle(1, seed);
        setPuzzleData(puzzle);
    }, [userId, testStartTime]);

    /**
     * Submit current answer (Synchronous Evaluation)
     */
    const submitAnswer = useCallback(() => {
        if (!selectedShape || !puzzleData || isGameOver) {
            return;
        }

        const now = Date.now();
        const timeTaken = (now - levelStartTime) / 1000;

        // 1. Synchronous Validation
        const validation = validateAnswer(
            puzzleData.grid,
            selectedShape,
            puzzleData.questionRow,
            puzzleData.questionCol,
            puzzleData.correctAnswer
        );

        // 2. Metrics Tracking (Immediate)
        metricsRef.current.totalAttempts++;
        metricsRef.current.reactionTimes.push(timeTaken);

        if (validation.isCorrect) {
            // SUCCESS FLOW
            metricsRef.current.correct++;
            metricsRef.current.maxLevel = Math.max(metricsRef.current.maxLevel, currentLevel);

            // Reset failure counter immediately
            setConsecutiveFailures(0);
            metricsRef.current.consecutiveFailures = 0;

            // Update streak state
            const newStreak = streak + 1;
            setStreak(newStreak);
            metricsRef.current.streak = newStreak;
            metricsRef.current.maxStreak = Math.max(metricsRef.current.maxStreak, newStreak);

            // Calculate & update score
            const levelScore = calculateLevelScore(currentLevel, timeTaken, newStreak);
            setTotalScore(prev => prev + levelScore);

            // Advance or Finish
            if (currentLevel >= TOTAL_LEVELS) {
                metricsRef.current.reason = 'COMPLETED';
                setIsGameOver(true);
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
            // FAILURE FLOW
            metricsRef.current.incorrect++;
            setStreak(0);
            metricsRef.current.streak = 0;

            // Increment failure counter
            const newFailures = consecutiveFailures + 1;
            setConsecutiveFailures(newFailures);
            metricsRef.current.consecutiveFailures = newFailures;

            // Check termination condition immediately
            if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
                metricsRef.current.reason = 'CONSECUTIVE_FAILURES';
                setIsGameOver(true);
            }

            // Reset UI selection for retry (stay on same level)
            setSelectedShape(null);
            setLevelStartTime(now);
        }
    }, [selectedShape, puzzleData, isGameOver, levelStartTime, currentLevel, streak, calculateLevelScore, userId, testStartTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
        };
    }, []);

    return {
        // State
        currentLevel,
        selectedShape,
        totalScore,
        isGameOver,
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
