import { useState, useEffect, useCallback, useRef } from 'react';
import { DIGIT_LEVELS } from '../data/digitLevels';
import { validateExpression, calculateLevelScore } from '../utils/digitEngine';

/**
 * Custom hook for managing Digit Challenge game state
 */
export function useDigitGame() {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [selectedDigits, setSelectedDigits] = useState([]);
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [totalScore, setTotalScore] = useState(0);
    const [levelScores, setLevelScores] = useState([]);
    const [gameStatus, setGameStatus] = useState('idle'); // idle | playing | completed | timeout
    const [feedback, setFeedback] = useState(null);
    const [startTime, setStartTime] = useState(null);

    const timerRef = useRef(null);

    // Get current level data
    const levelData = DIGIT_LEVELS.find(l => l.id === currentLevel);

    // Get available (non-disabled) digits
    const availableDigits = levelData
        ? levelData.availableDigits.filter(d => !levelData.disabledDigits.includes(d))
        : [];

    // Start game
    const startGame = useCallback(() => {
        setCurrentLevel(1);
        setSelectedDigits([]);
        setTotalScore(0);
        setLevelScores([]);
        setGameStatus('playing');
        setFeedback(null);

        const firstLevel = DIGIT_LEVELS[0];
        setTimeRemaining(firstLevel.timeLimit);
        setStartTime(Date.now());
    }, []);

    // Start level
    const startLevel = useCallback((levelId) => {
        const level = DIGIT_LEVELS.find(l => l.id === levelId);
        if (!level) return;

        setCurrentLevel(levelId);
        setSelectedDigits([]);
        setTimeRemaining(level.timeLimit);
        setFeedback(null);
        setStartTime(Date.now());
    }, []);

    // Timer countdown
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
    }, [gameStatus, currentLevel]);

    // Add digit to expression
    const addDigit = useCallback((digit) => {
        if (selectedDigits.length >= levelData.slots) return;
        if (selectedDigits.includes(digit)) return; // Prevent duplicates

        setSelectedDigits([...selectedDigits, digit]);
    }, [selectedDigits, levelData]);

    // Remove last digit
    const removeLast = useCallback(() => {
        setSelectedDigits(selectedDigits.slice(0, -1));
    }, [selectedDigits]);

    // Clear all digits
    const clearAll = useCallback(() => {
        setSelectedDigits([]);
        setFeedback(null);
    }, []);

    // Submit answer
    const submitAnswer = useCallback(() => {
        const timeTaken = (Date.now() - startTime) / 1000;
        const validation = validateExpression(selectedDigits, levelData);

        // Validation runs silently - no feedback shown during test

        if (validation.valid) {
            // Calculate score
            const score = calculateLevelScore(currentLevel, timeTaken);
            setLevelScores([...levelScores, score]);
            setTotalScore(totalScore + score);

            // Check if game completed
            if (currentLevel === DIGIT_LEVELS.length) {
                setGameStatus('completed');
                clearInterval(timerRef.current);
            } else {
                // Auto-advance to next level after 500ms
                setTimeout(() => {
                    startLevel(currentLevel + 1);
                }, 500);
            }
        } else {
            // Wrong answer - record 0 for this level and move on
            setLevelScores([...levelScores, 0]);

            if (currentLevel === DIGIT_LEVELS.length) {
                setGameStatus('completed');
                clearInterval(timerRef.current);
            } else {
                setTimeout(() => {
                    startLevel(currentLevel + 1);
                }, 500);
            }
        }

        return validation;
    }, [selectedDigits, levelData, currentLevel, startTime, levelScores, totalScore, startLevel]);

    // Handle timeout - move to next level
    useEffect(() => {
        if (gameStatus === 'timeout') {
            // Record 0 score for timeout
            setLevelScores([...levelScores, 0]);

            // Move to next level after 500ms
            setTimeout(() => {
                if (currentLevel < DIGIT_LEVELS.length) {
                    setGameStatus('playing');
                    startLevel(currentLevel + 1);
                } else {
                    setGameStatus('completed');
                }
            }, 500);
        }
    }, [gameStatus, currentLevel, levelScores, startLevel]);

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

        // Actions
        startGame,
        startLevel,
        addDigit,
        removeLast,
        clearAll,
        submitAnswer
    };
}
