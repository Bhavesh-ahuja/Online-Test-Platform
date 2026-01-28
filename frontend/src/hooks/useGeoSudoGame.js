import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePuzzle } from '../utils/geoSudoGenerator';
import { validateAnswer } from '../utils/geoSudoEngine';
import {
    TOTAL_LEVELS,
    MAX_CONSECUTIVE_FAILURES,
    SCORE_MULTIPLIERS,
    getLevelConfig
} from '../config/geoSudoConfig';

/**
 * Main GeoSudo Game Hook
 * Manages game state, scoring, and progression
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
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);

    // Metrics tracking
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        incorrect: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0,
        consecutiveFailures: 0,
        reason: null // 'COMPLETED', 'TIMEOUT', 'VIOLATION_LIMIT', 'CONSECUTIVE_FAILURES'
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
        return Math.round(finalScore * 100) / 100; // Round to 2 decimals
    }, []);

    /**
     * Start the game
     */
    const startGame = useCallback(() => {
        setGameStatus('playing');
        setLevelStartTime(Date.now());

        // Generate first puzzle
        const puzzle = generatePuzzle(1, Date.now() + userId);
        setPuzzleData(puzzle);

        // Start timer
        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    endGame('TIMEOUT');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [userId]);

    /**
     * Submit current answer
     */
    const submitAnswer = useCallback(() => {
        if (!selectedShape || !puzzleData || gameStatus !== 'playing') return;

        const timeTaken = (Date.now() - levelStartTime) / 1000;

        // Validate answer
        const validation = validateAnswer(
            puzzleData.grid,
            selectedShape,
            puzzleData.questionRow,
            puzzleData.questionCol,
            puzzleData.correctAnswer
        );

        // Update metrics
        metricsRef.current.totalAttempts++;
        metricsRef.current.reactionTimes.push(timeTaken);

        if (validation.isCorrect) {
            // Correct answer
            metricsRef.current.correct++;
            metricsRef.current.maxLevel = Math.max(metricsRef.current.maxLevel, currentLevel);

            // Calculate and add score
            const levelScore = calculateLevelScore(currentLevel, timeTaken);
            setTotalScore(prev => prev + levelScore);

            // Reset consecutive failures
            setConsecutiveFailures(0);

            // Show success feedback
            setFeedbackMessage(`Correct! +${levelScore.toFixed(2)} points`);
            setIsCorrectAnswer(true);
            setShowFeedback(true);

            // Move to next level
            setTimeout(() => {
                setShowFeedback(false);
                if (currentLevel >= TOTAL_LEVELS) {
                    // All levels completed
                    endGame('COMPLETED');
                } else {
                    // Next level
                    const nextLevel = currentLevel + 1;
                    setCurrentLevel(nextLevel);
                    setSelectedShape(null);
                    setLevelStartTime(Date.now());
                    const puzzle = generatePuzzle(nextLevel, Date.now() + userId + nextLevel);
                    setPuzzleData(puzzle);
                }
            }, 1500);

        } else {
            // Incorrect answer
            metricsRef.current.incorrect++;
            const newConsecutiveFailures = consecutiveFailures + 1;
            setConsecutiveFailures(newConsecutiveFailures);
            metricsRef.current.consecutiveFailures = newConsecutiveFailures;

            // Show error feedback
            setFeedbackMessage(validation.reason);
            setIsCorrectAnswer(false);
            setShowFeedback(true);

            // Check for consecutive failure limit
            if (newConsecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                setTimeout(() => {
                    endGame('CONSECUTIVE_FAILURES');
                }, 1500);
            } else {
                // Allow retry same level
                setTimeout(() => {
                    setShowFeedback(false);
                    setSelectedShape(null);
                    setLevelStartTime(Date.now());
                }, 1500);
            }
        }
    }, [selectedShape, puzzleData, gameStatus, levelStartTime, currentLevel, consecutiveFailures, calculateLevelScore, userId]);

    /**
     * End the game
     */
    const endGame = useCallback((reason) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        metricsRef.current.reason = reason;

        if (reason === 'TIMEOUT') {
            setGameStatus('timeout');
        } else if (reason === 'VIOLATION_LIMIT') {
            setGameStatus('terminated');
        } else if (reason === 'CONSECUTIVE_FAILURES') {
            setGameStatus('terminated');
        } else {
            setGameStatus('completed');
        }
    }, []);

    /**
     * Handle violation (from parent component)
     */
    const handleViolation = useCallback(() => {
        metricsRef.current.violations++;

        if (metricsRef.current.violations >= 3) {
            endGame('VIOLATION_LIMIT');
        }
    }, [endGame]);

    /**
     * Get submission data
     */
    const getSubmissionData = useCallback(() => {
        const metrics = {
            ...metricsRef.current,
            totalAttempts: metricsRef.current.totalAttempts,
            correct: metricsRef.current.correct,
            incorrect: metricsRef.current.incorrect,
            avgReactionMs: metricsRef.current.reactionTimes.length > 0
                ? Math.round(metricsRef.current.reactionTimes.reduce((a, b) => a + b, 0) / metricsRef.current.reactionTimes.length * 1000)
                : 0,
            maxLevel: metricsRef.current.maxLevel,
            violations: metricsRef.current.violations,
            consecutiveFailures: metricsRef.current.consecutiveFailures,
            reason: metricsRef.current.reason
        };

        return {
            finalScore: Math.round(totalScore * 100) / 100,
            metrics,
            testType: 'GEOSUDO'
        };
    }, [totalScore]);

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
        showFeedback,
        feedbackMessage,
        isCorrectAnswer,
        violations: metricsRef.current.violations,

        // Actions
        startGame,
        submitAnswer,
        endGame,
        handleViolation,
        setSelectedShape,
        getSubmissionData
    };
}
