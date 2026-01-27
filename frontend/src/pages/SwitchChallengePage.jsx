import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';
import Modal from '../components/Modal';
import { useSwitchGame } from '../hooks/useSwitchGame';
import { useKeyboardLock } from '../hooks/useKeyboardLock';

const MAX_WARNINGS = 3;

export default function SwitchChallengePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); // kept for potential use or context requirement

    // --- SECURITY ---
    // Only lock when game has actually started and we aren't showing the result modal


    // --- GAME HOOK ---
    const {
        level,
        streak,
        score,
        gameData,
        isGameOver,
        metricsRef,
        handleOptionSelect,
        startGame,
        endGame
    } = useSwitchGame();

    // --- PAGE STATE ---
    const [timeLeft, setTimeLeft] = useState(null); // Null means "loading" / "not started"
    const [hasStarted, setHasStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // --- SECURITY ---
    // Only lock when game has actually started and we aren't showing the result modal


    // Proctoring State
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    // Modal State
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // --- AGGRESSIVE DEBUG LOCK & FOCUS TRACKING ---




    // --- SECURITY ---
    // Only lock when game has actually started and we aren't showing the result modal
    // --- SECURITY ---
    // Aggressive logic is now inside useKeyboardLock
    // --- PROCTORING HELPER (HOISTED) ---
    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            metricsRef.current.violations = newCount;
            return newCount;
        });
    }, [metricsRef]);

    useKeyboardLock(hasStarted && !isSubmissionModalOpen, addWarning);

    // Refs
    const examSessionTokenRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const isInitializedRef = useRef(false);

    // --- SUBMISSION LOGIC ---
    const handleGameOver = useCallback(async (reason) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);

        endGame(); // Stop game logic
        setSubmissionReason(reason);

        // Simulated jitter
        const jitter = Math.floor(Math.random() * 2000);
        await new Promise(r => setTimeout(r, jitter));

        // Finalize Metrics
        const currentMetrics = metricsRef.current;
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
            // UPDATED: Using fetch with explicit Authorization header for Exam Session Token
            // authFetch is for User Token, here we need the specific Exam Session Token
            const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${examSessionTokenRef.current}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSubmitting(false); // UI state
                // Keep ref true to prevent re-submit
                setIsSubmissionModalOpen(true);
            } else {
                const err = await response.json();
                console.error("Submission failed", err);
                alert(`Submission failed: ${err.message || 'Unknown error'}. Please try again.`);
                setSubmitting(false);
                isSubmittingRef.current = false; // Allow retry on failure
            }
        } catch (e) {
            console.error("Network error during submission", e);
            alert("Network error. Please check connection and try again.");
            setSubmitting(false);
            isSubmittingRef.current = false; // Allow retry on failure
        }
    }, [endGame, score, id, metricsRef]);

    // --- INIT & CONFIG ---
    useEffect(() => {
        let mounted = true;

        const initGame = async () => {
            console.log("initGame called. isInitialized:", isInitializedRef.current);
            if (isInitializedRef.current) return;
            isInitializedRef.current = true;

            // Safety Timeout
            const timeoutId = setTimeout(() => {
                if (mounted && loading) {
                    console.error("Init timed out");
                    setLoading(false);
                    setError("Connection timed out. Please try refreshing.");
                }
            }, 15000);

            try {
                // 1. Start Test Session (User Token needed)
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

                // 2. Fetch Config (User Token needed)
                console.log("Fetching test config...");
                const configRes = await authFetch(`/api/tests/${id}`);
                console.log("Config response status:", configRes.status);

                if (!configRes.ok) throw new Error('Failed to load test config');
                const data = await configRes.json();
                console.log("Config loaded:", data);

                // 3. Setup Timer
                const totalSeconds = data.switchConfig?.durationSeconds || (data.duration * 60) || 360;
                setTimeLeft(totalSeconds);

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

        initGame();
        return () => {
            mounted = false;
            isInitializedRef.current = false; // Allow re-initialization on remount
        };
    }, [id, navigate]);

    // --- GAME CONTROL ---
    const handleStartGame = () => {
        setHasStarted(true);
        handleFixFullScreen();
        startGame(); // triggers hook reset
    };

    // --- PROCTORING ---
    // addWarning moved up due to dependency references

    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && !isGameOver && !submitting) {
            handleGameOver('VIOLATION_LIMIT');
        }
    }, [warningCount, isGameOver, submitting, handleGameOver]);

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

    // --- TIMERS & LISTENERS ---
    useEffect(() => {
        if (timeLeft === null || !hasStarted) return;

        if (timeLeft <= 0 && !isGameOver) {
            handleGameOver('TIMEOUT');
            return;
        }
        if (!isGameOver && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, isGameOver, handleGameOver, hasStarted]);

    // Visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isGameOver && hasStarted) {
                addWarning();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isGameOver, addWarning, hasStarted]);

    // Full Screen
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && !isGameOver && !submitting && hasStarted) {
                addWarning();
                setIsFullScreenModalOpen(true);
            }
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [isGameOver, submitting, addWarning, hasStarted]);

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

    // --- UTILS ---
    const getSymbolColor = (symbol) => {
        switch (symbol) {
            case '●': return 'text-blue-500';
            case '★': return 'text-purple-500';
            case '■': return 'text-red-500';
            case '▲': return 'text-yellow-500';
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

    // --- RENDER ---
    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xl font-semibold text-gray-700">Initializing Exam Session...</div>
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
            {!hasStarted || !gameData ? (
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
                                disabled={submitting || isGameOver}
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
