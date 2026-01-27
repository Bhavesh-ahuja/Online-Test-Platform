import { useState, useEffect, useCallback, useRef } from 'react';
import { generatePuzzleSet } from '../utils/digitGenerator';
import { validateExpression } from '../utils/digitEngine';
import {
    DEFAULT_DURATION_SECONDS,
    TOTAL_LEVELS,
    MAX_CONSECUTIVE_FAILURES,
    SCORE_MULTIPLIERS
} from '../config/digitConfig';

/**
 * Custom hook for Digit Challenge with dynamic puzzle generation
 * 
 * @param {number} userId - User ID for seeded random generation
 * @param {number} testStartTime - Timestamp when test session started (for puzzle seed)
 * @param {number} durationSeconds - Total test duration in seconds (configurable)
 * 
 * Timer Configuration:
 * - The durationSeconds parameter allows admin-configurable test duration
 * - Falls back to DEFAULT_DURATION_SECONDS (600s = 10 min) if not provided
 * - This matches Switch Challenge behavior for consistency
 * 
 * @returns {Object} Game state and control functions
 */
export function useDigitGame(userId, testStartTime, durationSeconds = DEFAULT_DURATION_SECONDS) {
    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedDigits, setSelectedDigits] = useState([]);

    /**
     * Global Timer (Configurable)
     * - Default: 600 seconds (10 minutes) - matches Switch Challenge standard
     * - Configurable via test settings (digitConfig.durationSeconds)
     * - Auto-submits test when timer reaches 0
     */
    const [timeRemaining, setTimeRemaining] = useState(durationSeconds);

    const [totalScore, setTotalScore] = useState(0);
    const [levelScores, setLevelScores] = useState([]);
    const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | completed | timeout | terminated
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

    // ==========================================
    // TIMER SYNCHRONIZATION
    // ==========================================

    /**
     * CRITICAL: Sync timer when durationSeconds changes
     * 
     * This fixes the timing desynchronization bug where:
     * 1. Component mounts with default duration (600s)
     * 2. Test config is fetched async
     * 3. setTestDuration updates durationSeconds
     * 4. Timer must update to match configured duration
     * 
     * Without this effect, timer would remain stuck at initial (default) value
     * even when test configuration specifies different duration.
     * 
     * This ensures: Timer duration is ALWAYS derived from test configuration (admin-defined),
     * never from hardcoded defaults or stale state.
     */
    useEffect(() => {
        if (gameStatus === 'idle' && durationSeconds > 0) {
            console.log(`[useDigitGame] Timer sync: ${durationSeconds}s (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`);
            setTimeRemaining(durationSeconds);
        }
    }, [durationSeconds, gameStatus]);

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
     * Start the game and initialize all game state
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

        /**
         * Timer Initialization (Configurable)
         * 
         * CRITICAL: Use durationSeconds from test configuration, NOT hardcoded value.
         * This ensures UI timer matches admin-configured test duration.
         * 
         * If test config says 7 minutes → timer starts at 420 seconds
         * If test config says 10 minutes → timer starts at 600 seconds
         * 
         * Source of truth: Test configuration (backend) → durationSeconds parameter
         */
        console.log(`[useDigitGame] Starting game with ${durationSeconds}s timer (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`);
        setTimeRemaining(durationSeconds);
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
    }, [initializePuzzles, durationSeconds]);

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
     * Calculate score for a completed level
     * Formula: (Level² / TimeTaken) × SpeedMultiplier
     * 
     * @param {number} level - Level number
     * @param {number} timeTakenSeconds - Time taken to solve
     * @returns {number} - Calculated score
     */
    const calculateLevelScore = (level, timeTakenSeconds) => {
        if (timeTakenSeconds <= 0) return 0;

        const baseScore = Math.pow(level, 2) / timeTakenSeconds;

        // Apply speed bonus from config
        let speedMultiplier = SCORE_MULTIPLIERS.NORMAL; // >= 10 seconds
        if (timeTakenSeconds < 5) speedMultiplier = SCORE_MULTIPLIERS.FAST;
        else if (timeTakenSeconds < 10) speedMultiplier = SCORE_MULTIPLIERS.MEDIUM;

        return Math.round(baseScore * speedMultiplier * 100) / 100;
    };

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
