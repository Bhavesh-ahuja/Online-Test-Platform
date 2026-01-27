import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { API_BASE_URL } from '../../config';
import Modal from '../components/Modal';
import { useMotionGame } from '../hooks/useMotionGame';
import { useKeyboardLock } from '../hooks/useKeyboardLock';
import { GRID_ROWS, GRID_COLS } from '../data/motionLevels';

const MAX_WARNINGS = 3;
const TOTAL_DURATION = 360; // 6 minutes

export default function MotionChallengePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Game hook
    const {
        level,
        blocks,
        moves,
        score,
        isGameOver,
        isLevelComplete,
        activeBlockId,
        metricsRef,
        startGame,
        handleMove,
        resetLevel,
        endGame,
        setActiveBlockId,
        DIRECTIONS
    } = useMotionGame();

    // Page state
    const [timeLeft, setTimeLeft] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Proctoring state
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    // Modal state
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // Drag state
    const [dragState, setDragState] = useState(null);

    // Refs
    const examSessionTokenRef = useRef(null);
    const gridRef = useRef(null);

    // Proctoring function
    const addWarning = useCallback(() => {
        setWarningCount(prev => {
            const newCount = prev + 1;
            metricsRef.current.violations = newCount;
            return newCount;
        });
    }, [metricsRef]);

    // Keyboard lock (allow arrow keys)
    useKeyboardLock(hasStarted && !isSubmissionModalOpen, addWarning);

    // Submission logic
    const handleGameOver = useCallback(async (reason) => {
        if (submitting) return;
        endGame();
        setSubmitting(true);
        setSubmissionReason(reason);

        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000)));

        const finalMetrics = {
            totalMoves: metricsRef.current.totalMoves,
            levelsCompleted: metricsRef.current.levelsCompleted,
            maxLevel: metricsRef.current.maxLevel,
            violations: metricsRef.current.violations,
            levelScores: metricsRef.current.levelScores,
            reason
        };

        const payload = {
            finalScore: Math.round(score),
            metrics: finalMetrics,
            testType: 'MOTION'
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
                alert(`Submission failed: ${err.message || 'Unknown error'}`);
                setSubmitting(false);
            }
        } catch (e) {
            console.error("Network error", e);
            alert("Network error. Please check connection.");
            setSubmitting(false);
        }
    }, [submitting, endGame, score, id, metricsRef]);

    // Initialize
    useEffect(() => {
        let mounted = true;

        const initGame = async () => {
            try {
                console.log('Motion Challenge - Test ID from params:', id);

                const startRes = await authFetch(`/api/tests/${id}/start`, { method: 'POST' });
                if (!startRes.ok) {
                    const err = await startRes.json();
                    throw new Error(err.message || 'Failed to start test session');
                }
                const startData = await startRes.json();
                examSessionTokenRef.current = startData.examSessionToken;

                if (!mounted) return;

                const configRes = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
                    headers: { 'Authorization': `Bearer ${startData.examSessionToken}` }
                });

                if (!configRes.ok) throw new Error('Failed to load test config');

                setTimeLeft(TOTAL_DURATION);
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
    }, [id, navigate]);

    const handleStartGame = () => {
        setHasStarted(true);
        handleFixFullScreen();
        startGame();
    };

    // Proctoring effects
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

    // Timer
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

    // Fullscreen
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

    // Block interactions/proctoring
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

    // Keyboard controls
    useEffect(() => {
        if (!hasStarted || isGameOver || isLevelComplete || !activeBlockId) return;

        const handleKeyDown = (e) => {
            let direction = null;
            switch (e.key) {
                case 'ArrowUp': direction = DIRECTIONS.UP; break;
                case 'ArrowDown': direction = DIRECTIONS.DOWN; break;
                case 'ArrowLeft': direction = DIRECTIONS.LEFT; break;
                case 'ArrowRight': direction = DIRECTIONS.RIGHT; break;
                default: return;
            }
            e.preventDefault();
            handleMove(activeBlockId, direction);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasStarted, isGameOver, isLevelComplete, activeBlockId, handleMove, DIRECTIONS]);

    // Mouse drag handlers
    const handleMouseDown = (blockId, e) => {
        if (isGameOver || isLevelComplete) return;
        const block = blocks.find(b => b.id === blockId);
        if (block.type === 'rock') return;

        setActiveBlockId(blockId);
        setDragState({
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            hasMoved: false
        });
    };

    const handleMouseMove = useCallback((e) => {
        if (!dragState) return;

        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        // Determine dominant direction and cell count
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (absDeltaX > 20 || absDeltaY > 20) {
            const block = blocks.find(b => b.id === dragState.blockId);
            if (!block) return;

            let direction = null;
            let cells = 0;

            const isHorizontal = block.width > block.height;
            const isVertical = block.height > block.width;

            if (isHorizontal && absDeltaX > absDeltaY) {
                direction = deltaX > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
                cells = Math.floor(absDeltaX / 60); // Assuming 60px cell size
            } else if (isVertical && absDeltaY > absDeltaX) {
                direction = deltaY > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
                cells = Math.floor(absDeltaY / 60);
            }

            if (direction && cells > 0) {
                for (let i = 0; i < cells; i++) {
                    handleMove(dragState.blockId, direction);
                }
                setDragState({
                    ...dragState,
                    startX: e.clientX,
                    startY: e.clientY,
                    hasMoved: true
                });
            }
        }
    }, [dragState, blocks, handleMove, DIRECTIONS]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);

    // Render helpers
    const getBlockColor = (block) => {
        if (block.type === 'hero') return 'bg-red-500';
        if (block.type === 'rock') return 'bg-gray-600';
        return 'bg-blue-400';
    };

    const getCellSize = () => {
        if (!gridRef.current) return 60;
        const gridHeight = gridRef.current.clientHeight;
        return Math.floor(gridHeight / GRID_ROWS) - 2;
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Initializing Exam Session...</div>;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 select-none overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-xl text-red-600">Motion Challenge</div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                        Level: {level}
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-600">
                        Moves: {moves}
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
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🧩</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready for the Motion Challenge?</h2>
                        <ul className="text-left text-gray-600 mb-8 space-y-3">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">🔹</span>
                                <div><strong>Full Screen Required:</strong> The test will enter full-screen mode automatically.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">🔹</span>
                                <div><strong>No Interruption:</strong> Do not switch tabs or exit full screen. Violations will be recorded.</div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">🔹</span>
                                <div><strong>Game Rules:</strong> Move the red block to the exit on the right by sliding blocks. Use mouse or arrow keys.</div>
                            </li>
                        </ul>
                        <button
                            onClick={handleStartGame}
                            className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-xl shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Start Challenge
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center relative p-4">
                    {warningCount > 0 && (
                        <div className="absolute top-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 z-20">
                            ⚠️ Warning: {warningCount}/{MAX_WARNINGS} Violations
                        </div>
                    )}

                    <div className="flex gap-8 items-start max-w-6xl w-full">
                        {/* GRID */}
                        <div className="flex-1">
                            <div
                                ref={gridRef}
                                className="relative bg-gray-100 rounded-xl border-4 border-gray-800 shadow-2xl"
                                style={{
                                    width: `${GRID_COLS * 62}px`,
                                    height: `${GRID_ROWS * 62}px`
                                }}
                            >
                                {/* Grid cells */}
                                {Array.from({ length: GRID_ROWS }).map((_, row) =>
                                    Array.from({ length: GRID_COLS }).map((_, col) => (
                                        <div
                                            key={`${row}-${col}`}
                                            className="absolute border border-gray-300"
                                            style={{
                                                left: `${col * 60}px`,
                                                top: `${row * 60}px`,
                                                width: '60px',
                                                height: '60px'
                                            }}
                                        />
                                    ))
                                )}

                                {/* Exit marker */}
                                <div
                                    className="absolute bg-green-400 border-4 border-green-600 rounded-lg flex items-center justify-center text-2xl font-bold"
                                    style={{
                                        left: `${4 * 60}px`,
                                        top: `${2 * 60}px`,
                                        width: '60px',
                                        height: '60px',
                                        zIndex: 1
                                    }}
                                >
                                    🚪
                                </div>

                                {/* Blocks */}
                                {blocks.map(block => (
                                    <div
                                        key={block.id}
                                        className={`absolute ${getBlockColor(block)} border-2 border-gray-800 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center font-bold text-white cursor-pointer hover:brightness-110 ${activeBlockId === block.id ? 'ring-4 ring-yellow-400' : ''}`}
                                        style={{
                                            left: `${block.x * 60}px`,
                                            top: `${block.y * 60}px`,
                                            width: `${block.width * 60}px`,
                                            height: `${block.height * 60}px`,
                                            zIndex: block.type === 'hero' ? 10 : 5,
                                            cursor: block.type === 'rock' ? 'not-allowed' : 'grab'
                                        }}
                                        onMouseDown={(e) => handleMouseDown(block.id, e)}
                                        onClick={() => setActiveBlockId(block.id)}
                                    >
                                        {block.type === 'hero' && '🚗'}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* INFO PANEL */}
                        <div className="w-64 space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                                <h3 className="font-bold text-lg mb-2">Instructions</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Click block to select</li>
                                    <li>• Use arrow keys OR drag</li>
                                    <li>• Move red block to exit</li>
                                </ul>
                            </div>

                            <button
                                onClick={resetLevel}
                                className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition"
                            >
                                Reset Level
                            </button>

                            {isLevelComplete && (
                                <div className="bg-green-100 text-green-800 p-4 rounded-lg font-bold text-center">
                                    ✅ Level Complete!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {submitting && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-800">Submitting Results...</h2>
                    <p className="text-gray-500 mt-2">Please wait do not close the window.</p>
                </div>
            )}

            <Modal
                isOpen={isFullScreenModalOpen}
                onClose={handleFixFullScreen}
                title="Security Validation"
                actions={
                    <button onClick={handleFixFullScreen} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">
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
                    <button onClick={() => navigate('/dashboard')} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold">
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
