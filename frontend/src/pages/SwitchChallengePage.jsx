import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';
import Modal from '../components/Modal';

// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const SYMBOLS = ['●', '▲', '■', '★']; // Simple Unicode shapes
const MAX_WARNINGS = 3;

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

// ==========================================
// COMPONENT
// ==========================================
export default function SwitchChallengePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- STATE ---
    const [level, setLevel] = useState(1);
    const [streak, setStreak] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null); // Null means "loading" / "not started"
    const [hasStarted, setHasStarted] = useState(false); // NEW: Start Gate

    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    // NEW: Submission Modal State
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // Session Token for submission
    const examSessionTokenRef = useRef(null);

    // Metrics
    const metricsRef = useRef({
        totalAttempts: 0,
        correct: 0,
        reactionTimes: [],
        maxLevel: 1,
        violations: 0
    });

    const questionStartTime = useRef(Date.now());

    // --- LOGIC FUNCTIONS (Hoisted) ---
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

    // --- SUBMISSION ---
    const handleGameOver = useCallback(async (reason) => {
        if (submitting) return;
        setGameOver(true);
        setSubmitting(true);
        setSubmissionReason(reason); // Store reason for modal

        const currentMetrics = metricsRef.current;
        const jitter = Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, jitter));

        const finalMetrics = {
            totalAttempts: currentMetrics.totalAttempts,
            correct: currentMetrics.correct,
            avgReactionMs: currentMetrics.reactionTimes.length
                ? currentMetrics.reactionTimes.reduce((a, b) => a + b, 0) / currentMetrics.reactionTimes.length
                : 0,
            maxLevel: currentMetrics.maxLevel,
            violations: currentMetrics.violations,
            reason
        };

        const payload = {
            finalScore: Math.round(score),
            metrics: finalMetrics,
            testType: 'SWITCH'
        };

        try {
            // Must use fetch directly to override Authorization header with Exam Session Token
            const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${examSessionTokenRef.current}` // Critical Fix
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSubmitting(false); // Stop spinner
                setIsSubmissionModalOpen(true); // Show Success Modal
            } else {
                const err = await response.json();
                console.error("Submission failed", err);
                alert(`Submission failed: ${err.message || 'Unknown error'}. Please try again.`);
                setSubmitting(false);
            }
        } catch (e) {
            console.error("Network error during submission", e);
            alert("Network error. Please check connection and try again.");
            setSubmitting(false);
        }
    }, [score, id, submitting]); // removed user & navigate dependency

    // --- DATA FETCHING & INIT ---
    useEffect(() => {
        let mounted = true;

        const initGame = async () => {
            try {
                // 1. Start Test Session (User Token) -> Get Exam Token
                const startRes = await authFetch(`/api/tests/${id}/start`, { method: 'POST' });
                if (!startRes.ok) {
                    const err = await startRes.json();
                    throw new Error(err.message || 'Failed to start test session');
                }
                const startData = await startRes.json();
                examSessionTokenRef.current = startData.examSessionToken;

                if (!mounted) return;

                // 2. Fetch Config (Session Token)
                // Use fetch directly with Exam Session Token
                const configRes = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
                    headers: { 'Authorization': `Bearer ${startData.examSessionToken}` }
                });

                if (!configRes.ok) throw new Error('Failed to load test config');
                const data = await configRes.json();

                // 3. Setup Timer & Game
                const totalSeconds = data.switchConfig?.durationSeconds || (data.duration * 60) || 360;

                setTimeLeft(totalSeconds);
                generateLevelData(1);
                setLoading(false);

            } catch (err) {
                console.error(err);
                if (mounted) {
                    alert(`Error: ${err.message}`);
                    navigate('/dashboard');
                }
            }
        };

        initGame();
        return () => { mounted = false; };
    }, [id, navigate, generateLevelData]);


    // --- GAMEPLAY INTERACTION ---
    const handleOptionSelect = (selectedOp) => {
        if (gameOver) return;

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
    };

    const handleStartGame = () => {
        setHasStarted(true);
        handleFixFullScreen();
        questionStartTime.current = Date.now(); // reset timing
    };

    // --- PROCTORING ---
    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            metricsRef.current.violations = newCount;
            return newCount;
        });
    }, []);

    // Monitor Violations
    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && !gameOver && !submitting) {
            handleGameOver('VIOLATION_LIMIT');
        }
    }, [warningCount, gameOver, submitting, handleGameOver]);

    const handleFixFullScreen = async () => {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        }
        setIsFullScreenModalOpen(false);
    };

    // --- TIMERS & LISTENERS ---

    // Timer
    useEffect(() => {
        // Critical: Guard against null (loading) state OR hasn't started
        if (timeLeft === null || !hasStarted) return;

        if (timeLeft <= 0 && !gameOver) {
            handleGameOver('TIMEOUT');
            return;
        }
        if (!gameOver && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, gameOver, handleGameOver, hasStarted]);

    // Visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !gameOver && hasStarted) {
                addWarning();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [gameOver, addWarning, hasStarted]);

    // Full Screen (Optional: can comment out for dev)
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && !gameOver && !submitting && hasStarted) {
                addWarning();
                setIsFullScreenModalOpen(true);
            }
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [gameOver, submitting, addWarning, hasStarted]);

    // No Copy/Paste
    useEffect(() => {
        const block = e => e.preventDefault();
        window.addEventListener('contextmenu', block);
        window.addEventListener('copy', block);
        window.addEventListener('paste', block);
        return () => {
            window.removeEventListener('contextmenu', block);
            window.removeEventListener('copy', block);
            window.removeEventListener('paste', block);
        };
    }, []);

    // --- RENDER ---
    const getSymbolColor = (symbol) => {
        switch (symbol) {
            case '●': return 'text-blue-500';   // Circle -> Blue
            case '★': return 'text-purple-500'; // Star -> Purple
            case '■': return 'text-red-500';    // Square -> Red
            case '▲': return 'text-yellow-500'; // Triangle -> Yellow
            default: return 'text-gray-700';
        }
    };

    const renderRow = (symbols, label) => (
        <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{label}</span>
            <div className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                {symbols.map((s, i) => (
                    <div key={i} className={`w-12 h-12 flex items-center justify-center text-3xl font-bold bg-gray-50 rounded-lg ${getSymbolColor(s)}`}>
                        {s}
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) return <div className="h-screen flex items-center justify-center">Initializing Exam Session...</div>;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 select-none overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-xl text-blue-600">Switch Challenge</div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${streak > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                        Streak: {streak} 🔥
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                        Lvl: {level}
                    </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-lg">
                    <div className={timeLeft !== null && timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-700'}>
                        {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                    </div>
                    <div className="font-bold">
                        Score: {Math.round(score)}
                    </div>
                </div>
            </div>

            {/* GAME AREA */}
            {!hasStarted ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all max-w-lg w-full border border-gray-100">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">⚡</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready for the Switch Challenge?</h2>
                        <ul className="text-left text-gray-600 mb-8 space-y-3">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">🔹</span>
                                <div><strong>Full Screen Required:</strong> The test will enter full-screen mode automatically.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">🔹</span>
                                <div><strong>No Interruption:</strong> Do not switch tabs or exit full screen. Violations will be recorded.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">🔹</span>
                                <div><strong>Game Rules:</strong> Select the operator that transforms the first sequence into the second.</div>
                            </li>
                        </ul>
                        <button
                            onClick={handleStartGame}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Start Challenge
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center relative p-4">

                    {warningCount > 0 && (
                        <div className="absolute top-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold border border-red-200">
                            ⚠️ Warning: {warningCount}/{MAX_WARNINGS} Violations
                        </div>
                    )}

                    <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fadeIn">
                        {renderRow(gameData.source, "Initial Sequence")}

                        <div className="flex flex-col items-center gap-2 text-gray-300">
                            {gameData.preOps.map((op, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    <div className="h-8 w-0.5 bg-gray-300"></div>
                                    <div className="bg-gray-200 text-gray-600 text-sm px-2 py-1 rounded font-mono font-bold tracking-widest">
                                        {op}
                                    </div>
                                    <div className="h-8 w-0.5 bg-gray-300"></div>
                                </div>
                            ))}

                            <div className="h-8 w-0.5 bg-gray-300"></div>
                            {gameData.hasDistractors && (
                                <div className="absolute w-[300px] h-0 border-t-2 border-dashed border-gray-200 -z-10 transform rotate-12" />
                            )}
                            <div className="w-16 h-16 rounded-full border-4 border-dashed border-blue-300 flex items-center justify-center bg-blue-50 text-blue-400 font-bold text-2xl shadow-inner">
                                ?
                            </div>
                            <div className="h-8 w-0.5 bg-gray-300"></div>
                        </div>

                        {renderRow(gameData.target, "Target Sequence")}
                    </div>

                    <div className="mt-12 grid grid-cols-4 gap-4 w-full max-w-2xl">
                        {gameData.options.map((op, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(op)}
                                disabled={submitting || gameOver}
                                className="py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-xl font-mono font-bold text-gray-700 active:scale-95"
                            >
                                {op}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {submitting && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-800">Submitting Results...</h2>
                    <p className="text-gray-500 mt-2">Please wait do not close the window.</p>
                </div>
            )}

            <Modal
                isOpen={isFullScreenModalOpen}
                onClose={handleFixFullScreen}
                title="Security Validation"
                actions={
                    <button onClick={handleFixFullScreen} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
                        Return to Test
                    </button>
                }
            >
                <div className="text-center py-4">
                    <p>Full Screen mode is required. Please authorize to continue.</p>
                </div>
            </Modal>

            <Modal
                isOpen={isSubmissionModalOpen}
                title="Test Submitted Successfully"
                onClose={() => navigate('/dashboard')}
                actions={
                    <button onClick={() => navigate('/dashboard')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
                        Return to Dashboard
                    </button>
                }
            >
                <div className="text-center py-6">
                    {submissionReason === 'TIMEOUT' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">⏰</div>
                            <p className="text-lg text-gray-700">Your test has been successfully submitted.</p>
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-sm">
                                Status: TIMEOUT
                            </div>
                            <p className="text-sm text-gray-500">The time limit was reached.</p>
                        </div>
                    ) : submissionReason === 'VIOLATION_LIMIT' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">⚠️</div>
                            <p className="text-lg text-gray-700">Your test has been successfully submitted.</p>
                            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm">
                                Status: TERMINATED
                            </div>
                            <p className="text-sm text-gray-500">Maximum security violations reached.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">✅</div>
                            <p className="text-lg text-green-600 font-bold">Great job!</p>
                            <p className="text-sm text-gray-500">Your results have been successfully recorded.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
