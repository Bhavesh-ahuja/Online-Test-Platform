import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMotionGame } from '../hooks/useMotionGame';
import MotionGrid from '../components/MotionChallenge/MotionGrid';
import { authFetch } from '../utils/authFetch';
import Modal from '../components/Modal';
import { useKeyboardLock } from '../hooks/useKeyboardLock';

const MAX_WARNINGS = 3;

// Inner Game Component (Runs only when started)
const GameContent = ({ testConfig, examSession, onFinish, navigate }) => {
    // Game Hook
    const {
        items,
        exitPos,
        timeLeft,
        moves,
        puzzlesSolved,
        level,
        moveItem,
        skipPuzzle
    } = useMotionGame(
        testConfig?.motionConfig || { durationSeconds: testConfig?.duration * 60 },
        // onComplete
        (result) => onFinish(result),
        // onTermination
        () => onFinish({ score: 0, metrics: { reason: "TERMINATED", totalAttempts: 0, puzzlesSolved: 0 } })
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col select-none">
            {/* Header */}
            <div className="h-16 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800">
                <div className="flex items-center space-x-4">
                    <span className="text-gray-400 font-mono text-sm">Motion Challenge</span>
                </div>
                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-400">REMAINING</span>
                        <span className={`text-xl font-bold font-mono ${timeLeft < 60 ? 'text-red-500' : 'text-blue-400'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-800 z-0"></div>

                <div className="z-10 w-full max-w-2xl flex flex-col items-center space-y-6">

                    {/* Stats Bar */}
                    <div className="w-full flex justify-between text-sm text-gray-400 px-4">
                        <div className="flex space-x-6">
                            <span>Solved: <strong className="text-white">{puzzlesSolved}</strong></span>
                            <span>Moves (Current): <strong className="text-white">{moves}</strong></span>
                        </div>
                    </div>

                    {/* The Grid */}
                    <MotionGrid items={items} onMove={moveItem} exitPos={exitPos} />

                    {/* Controls */}
                    <div className="flex space-x-4 mt-8">
                        <button
                            onClick={skipPuzzle}
                            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-500 transition-colors"
                        >
                            Skip Puzzle
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 max-w-md text-center mt-4">
                        Swipe blocks or use mouse drag/swipe to move. Get the red target to the hole.
                    </p>
                </div>
            </div>
        </div>
    );
};

const MotionChallengePage = () => {
    const { id: testId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [testConfig, setTestConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [examSession, setExamSession] = useState(null);
    const [testStarted, setTestStarted] = useState(false);

    // Security State
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // Initial Fetch
    useEffect(() => {
        const fetchTest = async () => {
            try {
                const res = await authFetch(`/api/tests/${testId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTestConfig(data);
                } else {
                    alert("Failed to load test");
                    navigate('/dashboard');
                }
            } catch (err) {
                console.error(err);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
    }, [testId, navigate]);

    // --- SECURITY ---
    const addWarning = useCallback(() => {
        if (!testStarted || isSubmittingRef.current) return;
        setWarningCount(prev => prev + 1);
    }, [testStarted]);

    useKeyboardLock(testStarted && !submitting, addWarning);

    // Full Screen Check
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement && testStarted && !isSubmittingRef.current) {
                addWarning();
                setIsFullScreenModalOpen(true);
            }
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [testStarted, addWarning]);

    // Visibility Check
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && testStarted && !isSubmittingRef.current) {
                addWarning();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [testStarted, addWarning]);

    // Block Context Menu
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

    // Max Warnings Check
    useEffect(() => {
        if (warningCount >= MAX_WARNINGS && testStarted && !isSubmittingRef.current) {
            submitResults({ score: 0, metrics: { reason: "VIOLATION_LIMIT" } });
        }
    }, [warningCount, testStarted]);

    const handleFixFullScreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen blocked", e);
        }
        setIsFullScreenModalOpen(false);
    };

    // Start Test Logic
    const startTest = async () => {
        handleFixFullScreen();

        try {
            const res = await authFetch(`/api/tests/${testId}/start`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                setExamSession(data.examSessionToken);
                setTestStarted(true);
            } else {
                alert(data.message || "Failed to start");
            }
        } catch (err) {
            console.error(err);
            alert("Error starting test");
        }
    };

    // Submission
    const submitResults = async (result) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitting(true);

        try {
            await authFetch(`/api/tests/${testId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-exam-session-token': examSession
                },
                body: JSON.stringify({
                    testType: 'MOTION',
                    status: result.metrics?.reason === 'VIOLATION_LIMIT' ? 'TERMINATED' : 'COMPLETED',
                    finalScore: result.score,
                    metrics: {
                        ...result.metrics,
                        violations: warningCount
                    }
                })
            });
            // Exit fullscreen
            if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            alert("Submission failed. Check console.");
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

    if (!testStarted) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                    <h1 className="text-3xl font-bold mb-4 text-blue-400">Motion Challenge</h1>

                    <div className="mb-6 space-y-2 text-gray-300 text-sm">
                        <p><strong>Instructions:</strong></p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Move the RED ball to the Exit Hole.</li>
                            <li>Slide blocks to clear the path.</li>
                            <li>Solve as many puzzles as possible.</li>
                        </ul>
                        <p className="mt-4 text-orange-400"><strong>Security Enabled:</strong></p>
                        <ul className="list-disc pl-5 space-y-1 text-gray-400">
                            <li>Full Screen enforced</li>
                            <li>No Tab Switching</li>
                            <li>Keyboard Shortcuts Disabled</li>
                            <li>Max 3 Violations Allowed</li>
                        </ul>
                    </div>

                    <button
                        onClick={startTest}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
                    >
                        Start Assessment
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full mt-4 bg-transparent border border-gray-600 hover:bg-gray-700 text-gray-400 py-2 rounded-lg"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <GameContent
                testConfig={testConfig}
                examSession={examSession}
                onFinish={submitResults}
                navigate={navigate}
            />
            {warningCount > 0 && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg z-50 font-bold animate-pulse">
                    ⚠️ Warning: {warningCount}/{MAX_WARNINGS} Violations
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
        </>
    );
};

export default MotionChallengePage;
