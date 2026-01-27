import { useState, useEffect, useCallback, useRef } from 'react';
import { generatePuzzleSet } from '../utils/digitGenerator';
import { validateExpression } from '../utils/digitEngine';

/**
 * Custom hook for Digit Challenge with dynamic puzzle generation
 * Generates 20 unique levels per test session
 */
export function useDigitGame(userId, testStartTime) {
    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedDigits, setSelectedDigits] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes global timer
    const [totalScore, setTotalScore] = useState(0);
    const [levelScores, setLevelScores] = useState([]);
    const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | completed | timeout
    const [feedback, setFeedback] = useState(null);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);
    const [puzzleSet, setPuzzleSet] = useState(null);
    const [startTime, setStartTime] = useState(null);

    const timerRef = useRef(null);

    // Metrics for submission
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        incorrect: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0,
        consecutiveFailures: 0
    });

    // Total number of levels
    const TOTAL_LEVELS = 20;
    const MAX_CONSECUTIVE_FAILURES = 3;

    // ==========================================
    // PUZZLE GENERATION
    // ==========================================

    /**
     * Initialize puzzle set when game starts
     */
    const initializePuzzles = useCallback(() => {
        if (!userId || !testStartTime) {
            console.warn('Cannot generate puzzles without userId and testStartTime');
            return null;
        }

        // Generate unique puzzle set for this test session
        const puzzles = generatePuzzleSet(userId, testStartTime, TOTAL_LEVELS);
        console.log('Generated puzzle set:', puzzles.length, 'levels');
        return puzzles;
    }, [userId, testStartTime, TOTAL_LEVELS]);

    // Get current level data
    const levelData = puzzleSet ? puzzleSet[currentLevel - 1] : null;

    // Get available (non-disabled) digits
    const availableDigits = levelData
        ? levelData.availableDigits.filter(d => !levelData.disabledDigits.includes(d))
        : [];

    // ==========================================
    // GAME CONTROL
    // ==========================================

    /**
     * Start game - generates new puzzle set and resets state
     */
    const startGame = useCallback(() => {
        const puzzles = initializePuzzles();
        if (!puzzles) return;

        setPuzzleSet(puzzles);
        setCurrentLevel(1);
        setSelectedDigits([]);
        setTotalScore(0);
        setLevelScores([]);
        setGameStatus('playing');
        setFeedback(null);
        setConsecutiveFailures(0);
        setTimeRemaining(600); // 10 minutes
        setStartTime(Date.now());

        // Reset metrics
        metricsRef.current = {
            totalAttempts: 0,
            correct: 0,
            incorrect: 0,
            reactionTimes: [],
            maxLevel: 1,
            violations: 0,
            consecutiveFailures: 0
        };
    }, [initializePuzzles]);

    /**
     * Start specific level
     */
    const startLevel = useCallback((levelId) => {
        if (!puzzleSet || levelId > TOTAL_LEVELS) return;

        setCurrentLevel(levelId);
        setSelectedDigits([]);
        setFeedback(null);
        setStartTime(Date.now());
    }, [puzzleSet, TOTAL_LEVELS]);

    // ==========================================
    // TIMER LOGIC
    // ==========================================

    useEffect(() => {
        if (gameStatus !== 'playing') return;

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setGameStatus('timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameStatus]);

    // ==========================================
    // DIGIT MANIPULATION
    // ==========================================

    /**
     * Add digit to expression
     */
    const addDigit = useCallback((digit) => {
        if (!levelData || selectedDigits.length >= levelData.slots) return;
        if (selectedDigits.includes(digit)) return; // Prevent duplicates

        setSelectedDigits([...selectedDigits, digit]);
    }, [selectedDigits, levelData]);

    /**
     * Remove last digit
     */
    const removeLast = useCallback(() => {
        setSelectedDigits(selectedDigits.slice(0, -1));
    }, [selectedDigits]);

    /**
     * Clear all digits
     */
    const clearAll = useCallback(() => {
        setSelectedDigits([]);
        setFeedback(null);
    }, []);

    // ==========================================
    // ANSWER SUBMISSION
    // ==========================================

    /**
     * Submit answer for current level
     */
    const submitAnswer = useCallback(() => {
        if (!levelData || !startTime) return;

        const timeTaken = (Date.now() - startTime) / 1000;
        const validation = validateExpression(selectedDigits, levelData);

        // Update metrics
        metricsRef.current.totalAttempts++;
        metricsRef.current.reactionTimes.push(timeTaken);

        if (validation.valid) {
            // Correct answer
            metricsRef.current.correct++;
            const score = calculateLevelScore(currentLevel, timeTaken);
            setLevelScores([...levelScores, score]);
            setTotalScore(totalScore + score);
            setConsecutiveFailures(0);

            // Update max level
            if (currentLevel > metricsRef.current.maxLevel) {
                metricsRef.current.maxLevel = currentLevel;
            }

            // Check if test completed
            if (currentLevel === TOTAL_LEVELS) {
                setGameStatus('completed');
                clearInterval(timerRef.current);
            } else {
                // Auto-advance to next level
                setTimeout(() => {
                    startLevel(currentLevel + 1);
                }, 500);
            }
        } else {
            // Wrong answer
            metricsRef.current.incorrect++;
            const newFailures = consecutiveFailures + 1;
            setConsecutiveFailures(newFailures);
            metricsRef.current.consecutiveFailures = newFailures;

            // Record 0 score for failed level
            setLevelScores([...levelScores, 0]);

            // Check for consecutive failure termination
            if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
                setGameStatus('terminated');
                clearInterval(timerRef.current);
            } else if (currentLevel === TOTAL_LEVELS) {
                setGameStatus('completed');
                clearInterval(timerRef.current);
            } else {
                // Continue to next level
                setTimeout(() => {
                    startLevel(currentLevel + 1);
                }, 500);
            }
        }

        return validation;
    }, [selectedDigits, levelData, currentLevel, startTime, levelScores, totalScore, consecutiveFailures, startLevel, TOTAL_LEVELS, MAX_CONSECUTIVE_FAILURES]);

    // ==========================================
    // SCORE CALCULATION
    // ==========================================

    /**
     * Calculate score for completed level
     * Formula: (Level)² / TimeTaken * SpeedMultiplier
     */
    function calculateLevelScore(levelId, timeTakenSeconds) {
        if (timeTakenSeconds <= 0) return 0;

        const baseScore = Math.pow(levelId, 2) / timeTakenSeconds;

        // Speed bonus for fast completion
        let speedMultiplier = 1.0;
        if (timeTakenSeconds < 5) speedMultiplier = 1.5;
        else if (timeTakenSeconds < 10) speedMultiplier = 1.2;

        const finalScore = baseScore * speedMultiplier;
        return Math.round(finalScore * 100) / 100;
    }

    // ==========================================
    // RETURN PUBLIC API
    // ==========================================

    return {
        // State
        currentLevel,
        selectedDigits,
        timeRemaining,
        totalScore,
        levelScores,
        gameStatus,
        feedback,
        levelData,
        availableDigits,
        consecutiveFailures,
        maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
        totalLevels: TOTAL_LEVELS,
        metricsRef,

        // Actions
        startGame,
        startLevel,
        addDigit,
        removeLast,
        clearAll,
        submitAnswer
    };
}
