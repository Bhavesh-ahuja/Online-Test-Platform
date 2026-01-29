import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { DEFAULT_DURATION_SECONDS, SHAPE_COLORS, SHAPE_LABELS, TOTAL_LEVELS } from '../config/geoSudoConfig';
import Modal from '../components/Modal';
import { API_BASE_URL } from '../../config';
import { useGeoSudoGame } from '../hooks/useGeoSudoGame';
import { useKeyboardLock } from '../hooks/useKeyboardLock';

const MAX_WARNINGS = 3;

export default function GeoSudoChallengePage() {
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
    const [testDuration, setTestDuration] = useState(0);

    // Proctoring State
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    const [timeLeft, setTimeLeft] = useState(null);
    const [isGameOverPermanent, setIsGameOverPermanent] = useState(false);
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // Refs
    const examSessionTokenRef = useRef(null);
    const isSubmittingRef = useRef(false);
    const isInitializedRef = useRef(false);

    // ==========================================
    // GAME HOOK
    // ==========================================
    const {
        currentLevel,
        selectedShape,
        totalScore,
        isGameOver,
        puzzleData,
        consecutiveFailures,
        metricsRef,
        startGame,
        submitAnswer,
        endGame,
        setSelectedShape
    } = useGeoSudoGame(user?.id, testStartTime);

    // ==========================================
    // COMPLIANCE ENFORCEMENT
    // ==========================================
    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            metricsRef.current.violations = newCount;
            return newCount;
        });
    }, [metricsRef]);

    // Keyboard lock (anti-cheat)
    useKeyboardLock(hasStarted && !isSubmissionModalOpen, addWarning);

    // Tab/Window Switch Detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && hasStarted && !isGameOverPermanent) {
                addWarning();
            }
        };

        const handleBlur = () => {
            if (hasStarted && !isGameOverPermanent) {
                addWarning();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [hasStarted, addWarning, isGameOverPermanent]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft === null || !hasStarted || isGameOverPermanent) return;

        if (timeLeft <= 0) {
            handleGameOver('TIMEOUT');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, hasStarted, isGameOverPermanent]);

    // Hook Game Over Trigger
    useEffect(() => {
        if (isGameOver && !isGameOverPermanent) {
            const reason = metricsRef.current.reason ||
                (currentLevel >= TOTAL_LEVELS ? 'COMPLETED' : 'TERMINATED');
            handleGameOver(reason);
        }
    }, [isGameOver, isGameOverPermanent, currentLevel, metricsRef]);

    // Full Screen Enforcement
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && hasStarted && !isGameOverPermanent && !submitting) {
                addWarning();
                setIsFullScreenModalOpen(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [hasStarted, isGameOverPermanent, submitting, addWarning]);

    // Enter fullscreen on start
    const handleEnterFullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setIsFullScreenModalOpen(false);
        } catch (err) {
            console.error('Fullscreen request failed:', err);
        }
    };

    // ==========================================
    // SUBMISSION
    // ==========================================
    const handleGameOver = useCallback(async (reason) => {
        if (isSubmittingRef.current || isGameOverPermanent) return;
        isSubmittingRef.current = true;
        setIsGameOverPermanent(true);
        setSubmitting(true);
        endGame();

        try {
            // Build submission data manually
            const finalMetrics = {
                totalAttempts: metricsRef.current.totalAttempts,
                correct: metricsRef.current.correct,
                incorrect: metricsRef.current.incorrect,
                avgReactionMs: metricsRef.current.reactionTimes.length
                    ? Math.round(metricsRef.current.reactionTimes.reduce((a, b) => a + b, 0) / metricsRef.current.reactionTimes.length * 1000)
                    : 0,
                maxLevel: metricsRef.current.maxLevel,
                violations: metricsRef.current.violations || 0,
                consecutiveFailures: metricsRef.current.consecutiveFailures,
                streak: metricsRef.current.streak,
                maxStreak: metricsRef.current.maxStreak,
                reason: reason || metricsRef.current.reason || 'UNKNOWN'
            };

            const submissionData = {
                finalScore: Math.round(totalScore * 100) / 100,
                metrics: finalMetrics,
                testType: 'GEOSUDO'
            };

            const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${examSessionTokenRef.current}`
                },
                body: JSON.stringify(submissionData)
            });

            if (response.ok) {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
                setSubmitting(false);
                setIsSubmissionModalOpen(true);
            } else {
                const err = await response.json();
                console.error('Submission failed:', err);
                alert(`Submission failed: ${err.message || 'Unknown error'}. Please try again.`);
                setSubmitting(false);
                isSubmittingRef.current = false;
                setIsGameOverPermanent(false);
            }
        } catch (err) {
            console.error('Submission failed:', err);
            alert('Submission failed. Please check your connection and try again.');
            setSubmitting(false);
            isSubmittingRef.current = false;
            setIsGameOverPermanent(false);
        }
    }, [id, totalScore, metricsRef, endGame, isGameOverPermanent]);

    // ==========================================
    // AUTO-SUBMIT TRIGGERS (Cleanup)
    // ==========================================
    // Violation Limit
    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && hasStarted && !isSubmittingRef.current && !isGameOverPermanent) {
            if (metricsRef.current) {
                metricsRef.current.reason = 'VIOLATION_LIMIT';
            }
            handleGameOver('VIOLATION_LIMIT');
        }
    }, [warningCount, hasStarted, handleGameOver, metricsRef, isGameOverPermanent]);

    // ==========================================
    // EXAM SESSION INITIALIZATION
    // ==========================================
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const initializeExam = async () => {
            try {
                const res = await authFetch(`/api/tests/${id}/start`, { method: 'POST' });
                if (!res.ok) throw new Error('Failed to start test session');
                const responseData = await res.json();

                examSessionTokenRef.current = responseData.examSessionToken;

                // Get test configuration for duration
                const testData = responseData.test;
                const duration = testData?.duration || 30; // Fallback to 30 mins
                const durationSeconds = duration * 60;

                setTestDuration(durationSeconds);
                setTimeLeft(durationSeconds);

                setTestStartTime(Date.now());
                setLoading(false);
            } catch (err) {
                console.error('Failed to initialize exam session:', err);
                setError(err.message || 'Failed to start test');
                setLoading(false);
            }
        };

        initializeExam();
    }, [id]);

    // ==========================================
    // GAME START
    // ==========================================
    const handleStartGame = async () => {
        try {
            await document.documentElement.requestFullscreen();
            setHasStarted(true);
            startGame();
        } catch (err) {
            console.error('Failed to enter fullscreen:', err);
            alert('Please allow fullscreen mode to start the test.');
        }
    };


    // ==========================================
    // RENDER: LOADING STATE
    // ==========================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading GeoSudo Challenge...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 transition"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: PRE-START SCREEN
    // ==========================================
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-orange-600 mb-2">GeoSudo Challenge</h1>
                        <p className="text-gray-600">Geometric Sudoku - Deductive Reasoning Test</p>
                    </div>

                    <div className="bg-orange-50 border-l-4 border-orange-600 p-6 mb-6">
                        <h2 className="text-xl font-bold text-orange-800 mb-4">📋 Instructions</h2>
                        <ul className="space-y-2 text-gray-700">
                            <li>✓ You will see a grid with shapes and <strong>one question mark (?)</strong></li>
                            <li>✓ Find the <strong>missing shape</strong> that completes the grid</li>
                            <li>✓ <strong>Rules:</strong> No shape can repeat in the same row or column</li>
                            <li>✓ Progress through <strong>20 levels</strong> of increasing difficulty</li>
                            <li>✓ <strong>3 consecutive wrong answers</strong> will end the test</li>
                            <li>✓ Higher scores for faster solutions</li>
                        </ul>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
                        <h3 className="text-lg font-bold text-yellow-800 mb-2">⚠️ Compliance Rules</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                            <li>• Test must be taken in <strong>fullscreen mode</strong></li>
                            <li>• Switching tabs/windows will trigger violations</li>
                            <li>• <strong>3 violations</strong> will auto-submit your test</li>
                            <li>• Copy/paste and keyboard shortcuts are disabled</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStartGame}
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold py-4 rounded-lg hover:from-orange-700 hover:to-amber-700 transition shadow-lg"
                    >
                        Start GeoSudo Challenge
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: GAME SCREEN
    // ==========================================
    const gridSize = puzzleData?.gridSize || 4;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <h1 className="text-2xl font-bold">GeoSudo Challenge</h1>
                        <div className="text-sm">
                            <span className="font-semibold">Level:</span> {currentLevel}/{TOTAL_LEVELS}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={`text-xl font-bold ${(timeLeft || 0) < 60 ? 'text-yellow-300 animate-pulse' : ''}`}>
                            {Math.floor((timeLeft || 0) / 60)}:{((timeLeft || 0) % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold">Score:</span> {totalScore.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
            <div className="max-w-4xl mx-auto p-8">
                {puzzleData && (
                    <>
                        {/* Grid */}
                        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl mb-6">
                            <div
                                className="grid gap-2 mx-auto"
                                style={{
                                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                                    width: 'fit-content'
                                }}
                            >
                                {puzzleData.grid.map((row, rowIndex) =>
                                    row.map((cell, colIndex) => {
                                        const isQuestionCell = rowIndex === puzzleData.questionRow && colIndex === puzzleData.questionCol;

                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className={`
                                                    w-20 h-20 rounded-lg flex items-center justify-center text-4xl font-bold
                                                    border-2 transition-all
                                                    ${isQuestionCell
                                                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-orange-400 ring-4 ring-orange-300/50 shadow-lg shadow-orange-500/50 z-10'
                                                        : cell
                                                            ? 'bg-slate-700 border-slate-600'
                                                            : 'bg-slate-800/50 border-slate-700/50 border-dashed'
                                                    }
                                                `}
                                            >
                                                {isQuestionCell ? (
                                                    <span className="text-white text-5xl animate-pulse">?</span>
                                                ) : cell ? (
                                                    <span style={{ color: SHAPE_COLORS[cell] }}>
                                                        {SHAPE_LABELS[cell]}
                                                    </span>
                                                ) : (
                                                    <div className="w-10 h-10 border-2 border-slate-700 rounded-md bg-slate-900/30"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Shape Selector */}
                        <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl mb-6">
                            <h3 className="text-white text-lg font-semibold mb-4 text-center">Select Your Answer</h3>
                            <div className="flex justify-center gap-4">
                                {puzzleData.shapes.map((shape) => (
                                    <button
                                        key={shape}
                                        onClick={() => setSelectedShape(shape)}
                                        className={`
                                            w-20 h-20 rounded-lg text-4xl font-bold
                                            border-3 transition-all transform
                                            ${selectedShape === shape
                                                ? 'bg-orange-600 border-orange-400 scale-110 ring-4 ring-orange-400/50 shadow-lg'
                                                : 'bg-slate-700 border-slate-600 hover:border-orange-400 hover:scale-105'
                                            }
                                            hover:shadow-xl
                                        `}
                                    >
                                        <span style={{ color: SHAPE_COLORS[shape] }}>
                                            {SHAPE_LABELS[shape]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setSelectedShape(null)}
                                disabled={!selectedShape}
                                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={submitAnswer}
                                disabled={!selectedShape || isGameOverPermanent}
                                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-lg hover:from-orange-700 hover:to-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                Submit Answer
                            </button>
                        </div>


                        {/* Consecutive Failures Warning */}
                        {consecutiveFailures >= 1 && (
                            <div className="absolute top-20 bg-amber-100 text-amber-800 px-6 py-3 rounded-xl border border-amber-200 font-bold shadow-lg animate-bounce z-50">
                                ⚠️ Incorrect attempt detected. Continued mistakes may end the test.
                            </div>
                        )}

                        {/* Violation Warning */}
                        {warningCount > 0 && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-6 py-3 rounded-xl border border-red-200 font-bold shadow-lg z-50">
                                ⚠️ Violation: {warningCount}/{MAX_WARNINGS}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={isFullScreenModalOpen} onClose={() => { }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ Fullscreen Required</h2>
                    <p className="text-gray-700 mb-6">
                        You must stay in fullscreen mode during the test.
                    </p>
                    <button
                        onClick={handleEnterFullscreen}
                        className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition"
                    >
                        Return to Fullscreen
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isSubmissionModalOpen} onClose={() => navigate('/dashboard')}>
                <div className="text-center p-6">
                    {submissionReason === 'TIMEOUT' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">⏰</div>
                            <h2 className="text-3xl font-bold text-gray-800">Time's Up!</h2>
                            <p className="text-gray-600">Your test has been automatically submitted.</p>
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-sm">
                                Status: TIMEOUT
                            </div>
                        </div>
                    ) : submissionReason === 'VIOLATION_LIMIT' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">⚠️</div>
                            <h2 className="text-3xl font-bold text-red-600">Test Terminated</h2>
                            <p className="text-gray-600">Maximum security violations reached.</p>
                            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold text-sm">
                                Status: TERMINATED
                            </div>
                        </div>
                    ) : submissionReason === 'CONSECUTIVE_FAILURES' ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-4xl">🛑</div>
                            <h2 className="text-3xl font-bold text-orange-600">Test Ended</h2>
                            <p className="text-gray-600">You've reached the maximum number of consecutive mistakes.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-4xl">✅</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800">Test Submitted!</h2>
                            <p className="text-gray-600">Your results have been securely recorded.</p>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full mt-8 bg-blue-600 text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </Modal>
        </div>
    );
}
