import { useState, useRef, useCallback } from 'react';

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const SYMBOLS = ['●', '▲', '■', '★']; // Simple Unicode shapes

// Difficulty Config
const LEVELS = {
    1: { depth: 1, distractors: 0 },
    2: { depth: 1, distractors: 1 },
    3: { depth: 2, distractors: 0 },
    4: { depth: 2, distractors: 1 },
    5: { depth: 3, distractors: 2 }
};

// ==========================================
// UTILS: LOGIC ENGINE
// ==========================================
const applyOperator = (source, opString) => {
    const indices = opString.split('').map(c => parseInt(c) - 1);
    return indices.map(i => source[i]);
};

const generateRandomOperator = () => {
    const nums = [1, 2, 3, 4];
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums.join('');
};

const generateOptions = (correctOp) => {
    const options = new Set([correctOp]);
    while (options.size < 4) {
        options.add(generateRandomOperator());
    }
    return Array.from(options).sort(() => Math.random() - 0.5);
};

export function useSwitchGame() {
    // --- STATE ---
    const [level, setLevel] = useState(1);
    const [streak, setStreak] = useState(0);
    const [score, setScore] = useState(0);
    const [gameData, setGameData] = useState(null);
    const [isGameOver, setIsGameOver] = useState(false);

    // Metrics for submission
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0
    });

    const questionStartTime = useRef(Date.now());

    // --- LOGIC FUNCTIONS ---
    const generateLevelData = useCallback((lvl) => {
        const config = LEVELS[lvl] || LEVELS[5];
        const source = [...SYMBOLS].sort(() => Math.random() - 0.5);
        let currentSymbols = [...source];
        let preOps = [];

        if (config.depth > 1) {
            const op1 = generateRandomOperator();
            currentSymbols = applyOperator(currentSymbols, op1);
            preOps.push(op1);
        }
        if (config.depth > 2) {
            const op2 = generateRandomOperator();
            currentSymbols = applyOperator(currentSymbols, op2);
            preOps.push(op2);
        }

        const correctOp = generateRandomOperator();
        const target = applyOperator(currentSymbols, correctOp);

        setGameData({
            source,
            target,
            preOps,
            correctOp,
            options: generateOptions(correctOp),
            hasDistractors: config.distractors > 0
        });

        questionStartTime.current = Date.now();
    }, []);

    const handleOptionSelect = useCallback((selectedOp) => {
        if (isGameOver || !gameData) return;

        const reactionTime = Date.now() - questionStartTime.current;
        metricsRef.current.reactionTimes.push(reactionTime);
        metricsRef.current.totalAttempts++;

        const isCorrect = selectedOp === gameData.correctOp;

        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            metricsRef.current.correct++;

            let multiplier = 1.0;
            if (newStreak >= 8) multiplier = 2.5;
            else if (newStreak >= 5) multiplier = 2.0;
            else if (newStreak >= 3) multiplier = 1.5;

            let speedBonus = 0;
            if (reactionTime < 2000) {
                speedBonus = 0.5 * level;
            }

            setScore(prev => prev + (level * multiplier) + speedBonus);

            let newLevel = level;
            if (newStreak % 5 === 0 && level < 5) {
                newLevel = level + 1;
            }

            if (newLevel > metricsRef.current.maxLevel) {
                metricsRef.current.maxLevel = newLevel;
            }

            setLevel(newLevel);
            generateLevelData(newLevel);
        } else {
            setScore(prev => Math.max(0, prev - level));
            setStreak(0);
            const newLevel = Math.max(1, level - 1);
            setLevel(newLevel);
            generateLevelData(newLevel);
        }
    }, [isGameOver, gameData, level, streak, generateLevelData]);

    const startGame = useCallback(() => {
        setScore(0);
        setStreak(0);
        setLevel(1);
        metricsRef.current = {
            totalAttempts: 0,
            correct: 0,
            reactionTimes: [],
            maxLevel: 1,
            violations: 0
        };
        setIsGameOver(false);
        generateLevelData(1);
    }, [generateLevelData]);

    const endGame = useCallback(() => {
        setIsGameOver(true);
    }, []);

    return {
        level,
        streak,
        score,
        gameData,
        isGameOver,
        metricsRef,
        handleOptionSelect,
        startGame,
        endGame,
        generateLevelData,
        setLevel // Exposed if needed for external reset, though startGame handles it
    };
}
