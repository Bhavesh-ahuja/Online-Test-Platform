import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { DEFAULT_DURATION_SECONDS, SHAPE_COLORS, SHAPE_LABELS } from '../config/geoSudoConfig';
import Modal from '../components/Modal';
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
    const [testDuration, setTestDuration] = useState(DEFAULT_DURATION_SECONDS);

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
    // GAME HOOK
    // ==========================================
    const {
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
        violations,
        startGame,
        submitAnswer,
        endGame,
        handleViolation,
        setSelectedShape,
        getSubmissionData
    } = useGeoSudoGame(user?.id, testStartTime, testDuration);

    // ==========================================
    // COMPLIANCE ENFORCEMENT
    // ==========================================
    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            handleViolation();
            return newCount;
        });
    }, [handleViolation]);

    // Keyboard lock (anti-cheat)
    useKeyboardLock(hasStarted && !isSubmissionModalOpen);

    // Tab/Window Switch Detection
    useEffect(() => {
        if (!hasStarted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                addWarning();
            }
        };

        const handleBlur = () => {
            addWarning();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [hasStarted, addWarning]);

    // Fullscreen Enforcement
    useEffect(() => {
        if (!hasStarted) return;

        const checkFullscreen = () => {
            if (!document.fullscreenElement) {
                setIsFullScreenModalOpen(true);
            }
        };

        document.addEventListener('fullscreenchange', checkFullscreen);
        return () => document.removeEventListener('fullscreenchange', checkFullscreen);
    }, [hasStarted]);

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
    // AUTO-SUBMIT TRIGGERS
    // ==========================================
    // Timeout
    useEffect(() => {
        if (gameStatus === 'timeout' && !isSubmittingRef.current) {
            setSubmissionReason('timer expired');
            setIsSubmissionModalOpen(true);
        }
    }, [gameStatus]);

    // Violation Limit
    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && gameStatus === 'playing' && !isSubmittingRef.current) {
            endGame('VIOLATION_LIMIT');
            setSubmissionReason('violation limit exceeded');
            setIsSubmissionModalOpen(true);
        }
    }, [warningCount, gameStatus, endGame]);

    // Consecutive Failures
    useEffect(() => {
        if (gameStatus === 'terminated' && !isSubmittingRef.current) {
            setSubmissionReason('too many consecutive failures');
            setIsSubmissionModalOpen(true);
        }
    }, [gameStatus]);

    // Completion
    useEffect(() => {
        if (gameStatus === 'completed' && !isSubmittingRef.current) {
            setSubmissionReason('all levels completed');
            setIsSubmissionModalOpen(true);
        }
    }, [gameStatus]);

    // ==========================================
    // EXAM SESSION INITIALIZATION
    // ==========================================
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const initializeExam = async () => {
            try {
                const response = await authFetch(`/api/tests/start/${id}`);
                examSessionTokenRef.current = response.examSessionToken;

                // Get test configuration for duration
                const testConfig = response.test;
                if (testConfig && testConfig.duration) {
                    setTestDuration(testConfig.duration * 60); // Convert minutes to seconds
                }

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
    // SUBMISSION
    // ==========================================
    const handleGameOver = useCallback(async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);

        try {
            const submissionData = getSubmissionData();

            await authFetch(`/api/tests/submit/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Exam-Session-Token': examSessionTokenRef.current
                },
                body: JSON.stringify(submissionData)
            });

            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }

            navigate(`/dashboard`);
        } catch (err) {
            console.error('Submission failed:', err);
            alert('Submission failed. Please try again.');
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    }, [id, navigate, getSubmissionData]);

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
                            <span className="font-semibold">Level:</span> {currentLevel}/20
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className={`text-xl font-bold ${timeRemaining < 60 ? 'text-yellow-300 animate-pulse' : ''}`}>
                            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm">
                            <span className="font-semibold">Score:</span> {totalScore.toFixed(2)}
                        </div>
                        <div className={`text-sm ${warningCount > 0 ? 'text-red-300 font-bold' : ''}`}>
                            Violations: {warningCount}/3
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
                                                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-orange-400 ring-4 ring-orange-300/50 shadow-lg shadow-orange-500/50'
                                                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                                                    }
                                                `}
                                            >
                                                {isQuestionCell ? (
                                                    <span className="text-white text-5xl">?</span>
                                                ) : cell ? (
                                                    <span style={{ color: SHAPE_COLORS[cell] }}>
                                                        {SHAPE_LABELS[cell]}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
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
                                        disabled={showFeedback}
                                        className={`
                                            w-20 h-20 rounded-lg text-4xl font-bold
                                            border-3 transition-all transform
                                            ${selectedShape === shape
                                                ? 'bg-orange-600 border-orange-400 scale-110 ring-4 ring-orange-400/50 shadow-lg'
                                                : 'bg-slate-700 border-slate-600 hover:border-orange-400 hover:scale-105'
                                            }
                                            ${showFeedback ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
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
                                disabled={!selectedShape || showFeedback}
                                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={submitAnswer}
                                disabled={!selectedShape || showFeedback}
                                className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold rounded-lg hover:from-orange-700 hover:to-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                Submit Answer
                            </button>
                        </div>

                        {/* Feedback */}
                        {showFeedback && (
                            <div className={`mt-6 p-4 rounded-lg text-center font-semibold ${isCorrectAnswer ? 'bg-green-500/20 text-green-300 border-2 border-green-500' : 'bg-red-500/20 text-red-300 border-2 border-red-500'
                                }`}>
                                {feedbackMessage}
                            </div>
                        )}

                        {/* Consecutive Failures Warning */}
                        {consecutiveFailures > 0 && (
                            <div className="mt-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg text-center text-red-300 font-semibold">
                                ⚠️ Consecutive Failures: {consecutiveFailures}/3
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

            <Modal isOpen={isSubmissionModalOpen} onClose={() => { }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-orange-600 mb-4">Test Completed</h2>
                    <p className="text-gray-700 mb-2">Reason: {submissionReason}</p>
                    <p className="text-lg font-semibold text-gray-800 mb-6">
                        Final Score: <span className="text-orange-600">{totalScore.toFixed(2)}</span>
                    </p>
                    <button
                        onClick={handleGameOver}
                        disabled={submitting}
                        className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Results'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
