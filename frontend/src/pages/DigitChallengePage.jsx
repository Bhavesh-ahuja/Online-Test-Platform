import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';
import Modal from '../components/Modal';
import { useDigitGame } from '../hooks/useDigitGame';
import { useKeyboardLock } from '../hooks/useKeyboardLock';
import { extractOperators } from '../utils/digitEngine';

const MAX_WARNINGS = 3;

export default function DigitChallengePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ==========================================
    // PAGE STATE
    // ==========================================
    const [hasStarted, setHasStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [testStartTime, setTestStartTime] = useState(null);

    // Proctoring State
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    // Modal State
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // Refs
    const examSessionTokenRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const isInitializedRef = useRef(false);

    // ==========================================
    // GAME HOOK (Dynamic Puzzle Generation)
    // ==========================================
    const {
        currentLevel,
        selectedDigits,
        timeRemaining,
        totalScore,
        gameStatus,
        levelData,
        availableDigits,
        consecutiveFailures,
        maxConsecutiveFailures,
        totalLevels,
        metricsRef,
        startGame,
        addDigit,
        removeLast,
        clearAll,
        submitAnswer
    } = useDigitGame(user?.id, testStartTime);

    // ==========================================
    // COMPLIANCE ENFORCEMENT (Reused from Switch Challenge)
    // ==========================================

    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            if (metricsRef.current) {
                metricsRef.current.violations = newCount;
            }
            return newCount;
        });
    }, [metricsRef]);

    // Keyboard lock (reuse existing hook)
    useKeyboardLock(hasStarted && !isSubmissionModalOpen, addWarning);

    // Auto-submit on violation limit
    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && gameStatus === 'playing' && !submitting) {
            handleGameOver('VIOLATION_LIMIT');
        }
    }, [warningCount, gameStatus, submitting]);

    // ==========================================
    // SUBMISSION LOGIC
    // ==========================================

    const handleGameOver = useCallback(async (reason) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);
        setSubmissionReason(reason);

        // Simulated jitter
        const jitter = Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, jitter));

        // Finalize Metrics
        const currentMetrics = metricsRef.current;
        const finalMetrics = {
            totalAttempts: currentMetrics.totalAttempts,
            correct: currentMetrics.correct,
            incorrect: currentMetrics.incorrect,
            avgReactionMs: currentMetrics.reactionTimes.length
                ? currentMetrics.reactionTimes.reduce((a, b) => a + b, 0) / currentMetrics.reactionTimes.length
                : 0,
            maxLevel: currentMetrics.maxLevel,
            violations: currentMetrics.violations,
            consecutiveFailures: currentMetrics.consecutiveFailures,
            reason
        };

        const payload = {
            finalScore: Math.round(totalScore * 100) / 100,
            metrics: finalMetrics,
            testType: 'DIGIT'
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${examSessionTokenRef.current}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSubmitting(false);
                setIsSubmissionModalOpen(true);
            } else {
                const err = await response.json();
                console.error("Submission failed", err);
                alert(`Submission failed: ${err.message || 'Unknown error'}. Please try again.`);
                setSubmitting(false);
                isSubmittingRef.current = false;
            }
        } catch (e) {
            console.error("Network error during submission", e);
            alert("Network error. Please check connection and try again.");
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    }, [totalScore, id, metricsRef]);

    // Watch for game status changes
    useEffect(() => {
        if (gameStatus === 'completed' && !submitting && !isSubmittingRef.current) {
            handleGameOver('COMPLETED');
        } else if (gameStatus === 'timeout' && !submitting && !isSubmittingRef.current) {
            handleGameOver('TIMEOUT');
        } else if (gameStatus === 'terminated' && !submitting && !isSubmittingRef.current) {
            handleGameOver('CONSECUTIVE_FAILURES');
        }
    }, [gameStatus, submitting, handleGameOver]);

    // ==========================================
    // INIT & CONFIG
    // ==========================================

    useEffect(() => {
        let mounted = true;

        const initTest = async () => {
            if (isInitializedRef.current) return;
            isInitializedRef.current = true;

            const timeoutId = setTimeout(() => {
                if (mounted && loading) {
                    console.error("Init timed out");
                    setLoading(false);
                    setError("Connection timed out. Please try refreshing.");
                }
            }, 15000);

            try {
                // 1. Start Test Session
                console.log("Starting test session...");
                const startRes = await authFetch(`/api/tests/${id}/start`, { method: 'POST' });
                console.log("Start response status:", startRes.status);

                if (!startRes.ok) {
                    const err = await startRes.json().catch(() => ({}));
                    throw new Error(err.message || err.error || 'Failed to start test session');
                }
                const startData = await startRes.json();
                console.log("Session started. Token:", startData.examSessionToken ? "Received" : "Missing");
                examSessionTokenRef.current = startData.examSessionToken;

                if (!mounted) return;

                // 2. Fetch Config
                console.log("Fetching test config...");
                const configRes = await authFetch(`/api/tests/${id}`);
                console.log("Config response status:", configRes.status);

                if (!configRes.ok) throw new Error('Failed to load test config');
                const data = await configRes.json();
                console.log("Config loaded:", data);

                // Set test start timestamp for puzzle generation
                setTestStartTime(Date.now());

                clearTimeout(timeoutId);
                setLoading(false);

            } catch (err) {
                console.error("Init Error:", err);
                if (mounted) {
                    clearTimeout(timeoutId);
                    setLoading(false);
                    setError(err.message || "Failed to load test");
                }
            }
        };

        initTest();
        return () => {
            mounted = false;
            isInitializedRef.current = false;
        };
    }, [id]);

    // ==========================================
    // GAME CONTROL
    // ==========================================

    const handleStartGame = () => {
        setHasStarted(true);
        handleFixFullScreen();
        startGame();
    };

    // ==========================================
    // PROCTORING
    // ==========================================

    const handleFixFullScreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen request failed", e);
        }
        setIsFullScreenModalOpen(false);
    };

    // Visibility change detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && gameStatus === 'playing' && hasStarted) {
                addWarning();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [gameStatus, addWarning, hasStarted]);

    // Full screen detection
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && gameStatus === 'playing' && !submitting && hasStarted) {
                addWarning();
                setIsFullScreenModalOpen(true);
            }
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [gameStatus, submitting, addWarning, hasStarted]);

    // Block copy/paste
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

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (gameStatus !== 'playing' || !hasStarted) return;

            // Digit keys 1-9
            const digit = parseInt(e.key);
            if (!isNaN(digit) && digit >= 1 && digit <= 9) {
                if (availableDigits.includes(digit)) {
                    addDigit(digit);
                }
            }

            // Enter to submit
            if (e.key === 'Enter' && levelData && selectedDigits.length === levelData.slots) {
                submitAnswer();
            }

            // Backspace to remove last
            if (e.key === 'Backspace') {
                e.preventDefault();
                removeLast();
            }

            // Escape to clear all
            if (e.key === 'Escape') {
                clearAll();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameStatus, availableDigits, selectedDigits, levelData, addDigit, removeLast, clearAll, submitAnswer, hasStarted]);

    // ==========================================
    // RENDER HELPERS
    // ==========================================

    const operators = levelData ? extractOperators(levelData.template) : [];

    // ==========================================
    // MAIN RENDER
    // ==========================================

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xl font-semibold text-gray-700">Initializing Assessment...</div>
            <div className="text-sm text-gray-500">Please wait while we set up your secure environment.</div>
        </div>
    );

    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center p-8 bg-red-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center border-l-4 border-red-500">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Initialization Failed</h2>
                <p className="text-red-600 mb-6">{error}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Retry</button>
                    <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Back to Dashboard</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 select-none overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-xl text-blue-600">Digit Challenge</div>
                    {consecutiveFailures > 0 && hasStarted && (
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600">
                            ⚠️ Failures: {consecutiveFailures}/{maxConsecutiveFailures}
                        </div>
                    )}
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                        Lvl: {currentLevel}/{totalLevels}
                    </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-lg">
                    <div className={timeRemaining !== null && timeRemaining < 60 ? 'text-red-500 animate-pulse font-bold' : 'text-gray-700'}>
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="font-bold">
                        Score: {Math.round(totalScore * 100) / 100}
                    </div>
                </div>
            </div>

            {/* GAME AREA */}
            {!hasStarted || !levelData ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all max-w-lg w-full border border-gray-100">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🧮</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready for the Digit Challenge?</h2>
                        <ul className="text-left text-gray-600 mb-8 space-y-3">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">🔹</span>
                                <div><strong>20 Progressive Levels:</strong> Difficulty increases with each level.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">🔹</span>
                                <div><strong>10 Minute Timer:</strong> Manage your time strategically across all levels.</div>
                            </li>
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
                                <div><strong>Termination:</strong> 3 consecutive failures will end the test.</div>
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
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                    {/* Warning Banner */}
                    {warningCount > 0 && (
                        <div className="absolute top-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold border border-red-200">
                            ⚠️ Warning: {warningCount}/{MAX_WARNINGS} Violations
                        </div>
                    )}

                    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                        {/* Level Description */}
                        <div className="text-center mb-6">
                            <div className="text-xs uppercase text-gray-400 font-bold mb-1">{levelData.difficulty}</div>
                            <div className="text-sm text-gray-600">{levelData.description}</div>
                        </div>

                        {/* Expression Builder */}
                        <div className="mb-8">
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                                {Array.from({ length: levelData.slots }).map((_, index) => (
                                    <React.Fragment key={index}>
                                        <div className={`w-16 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all ${selectedDigits[index] !== undefined
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'bg-gray-50 border-gray-300 text-gray-400'
                                            }`}>
                                            {selectedDigits[index] !== undefined ? selectedDigits[index] : '?'}
                                        </div>
                                        {index < operators.length && (
                                            <div className="text-2xl font-bold text-gray-600">
                                                {operators[index]}
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                                <div className="text-2xl font-bold text-gray-600">=</div>
                                <div className="w-16 h-16 border-2 border-green-500 bg-green-50 rounded-lg flex items-center justify-center text-2xl font-bold text-green-700">
                                    {levelData.targetRHS}
                                </div>
                            </div>
                        </div>

                        {/* Digit Keypad */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                                const isAvailable = availableDigits.includes(digit);
                                const isUsed = selectedDigits.includes(digit);
                                const isDisabled = !isAvailable || isUsed;

                                return (
                                    <button
                                        key={digit}
                                        type="button"
                                        onClick={() => !isDisabled && addDigit(digit)}
                                        disabled={isDisabled}
                                        className={`h-16 rounded-lg text-xl font-bold transition-all ${isDisabled
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-2 border-gray-200'
                                            : 'bg-white text-gray-800 hover:bg-blue-50 hover:border-blue-400 border-2 border-gray-300 active:scale-95 cursor-pointer'
                                            }`}
                                    >
                                        {digit}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={clearAll}
                                className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all border border-gray-300"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={submitAnswer}
                                disabled={selectedDigits.length !== levelData.slots}
                                className={`py-3 px-6 font-bold rounded-lg transition-all ${selectedDigits.length === levelData.slots
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Submit
                            </button>
                        </div>

                        {/* Keyboard Shortcuts Hint */}
                        <div className="mt-6 text-center text-xs text-gray-400">
                            Keyboard: 1-9 to select • Enter to submit • Backspace to undo • Esc to clear
                        </div>
                    </div>
                </div>
            )}

            {/* Submitting Overlay */}
            {submitting && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-800">Submitting Results...</h2>
                    <p className="text-gray-500 mt-2">Please wait. Do not close the window.</p>
                </div>
            )}

            {/* MODALS */}
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
                    ) : submissionReason === 'CONSECUTIVE_FAILURES' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">❌</div>
                            <p className="text-lg text-gray-700">Your test has been successfully submitted.</p>
                            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-bold text-sm">
                                Status: TERMINATED
                            </div>
                            <p className="text-sm text-gray-500">Maximum consecutive failures reached (3).</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">✅</div>
                            <p className="text-lg text-green-600 font-bold">Great job!</p>
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-sm">
                                Completed {currentLevel} levels
                            </div>
                            <p className="text-sm text-gray-500">Your results have been successfully recorded.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
