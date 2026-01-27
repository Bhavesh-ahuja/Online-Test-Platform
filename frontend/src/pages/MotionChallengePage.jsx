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
const CELL_SIZE = 78; // Professional sizing (1.3× larger)

export default function MotionChallengePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Game hook
    const {
        level,
        blocks,
        hole,
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
    const [showInstructions, setShowInstructions] = useState(true);

    // Proctoring state
    const [warningCount, setWarningCount] = useState(0);
    const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

    // Modal state
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [submissionReason, setSubmissionReason] = useState(null);

    // Drag state - intention signal only
    const [dragStart, setDragStart] = useState(null);
    const [invalidMoveBlock, setInvalidMoveBlock] = useState(null);

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

    const handleStartAssessment = () => {
        setShowInstructions(false);
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

    // Block interactions
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

    // Mouse drag handlers - INTENTION SIGNAL ONLY
    const handleMouseDown = (blockId, e) => {
        if (isGameOver || isLevelComplete) return;
        const block = blocks.find(b => b.id === blockId);
        if (block.type === 'rock') return;

        setActiveBlockId(blockId);
        setDragStart({
            blockId,
            startX: e.clientX,
            startY: e.clientY
        });
    };

    const handleMouseUp = useCallback((e) => {
        if (!dragStart) return;

        const deltaX = e.clientX - dragStart.startX;
        const deltaY = e.clientY - dragStart.startY;

        const MIN_DRAG_THRESHOLD = 20; // pixels

        if (Math.abs(deltaX) < MIN_DRAG_THRESHOLD && Math.abs(deltaY) < MIN_DRAG_THRESHOLD) {
            setDragStart(null);
            return; // Just a click, not a drag
        }

        // Determine direction from drag vector
        let direction = null;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
        } else {
            direction = deltaY > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
        }

        // SINGLE move attempt - no loops, no sweeping
        const moved = handleMove(dragStart.blockId, direction);

        if (!moved) {
            // Visual feedback for invalid move
            setInvalidMoveBlock(dragStart.blockId);
            setTimeout(() => setInvalidMoveBlock(null), 300);
        }

        setDragStart(null);
    }, [dragStart, handleMove, DIRECTIONS]);

    // Attach global mouse up listener
    useEffect(() => {
        if (dragStart) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [dragStart, handleMouseUp]);


    const getBlockColor = (block) => {
        if (block.type === 'ball') return '#dc2626'; // Red ball
        if (block.type === 'rock') return '#4b5563'; // Dark gray rock

        // Plastic blocks: vertical blue, horizontal purple/green
        if (block.type === 'plastic') {
            const isVertical = block.height > block.width;
            const isHorizontal = block.width > block.height;

            if (isVertical) return '#3b82f6'; // Blue vertical
            if (isHorizontal) {
                // Alternate purple/green for visual variety
                const blockNum = parseInt(block.id.match(/\d+/)?.[0] || '0');
                return blockNum % 2 === 1 ? '#9333ea' : '#10b981'; // Purple odd, Green even
            }
        }

        return '#6b7280'; // Default gray
    };

    const renderBlock = (block) => {
        const isActive = activeBlockId === block.id;
        const isInvalid = invalidMoveBlock === block.id;
        const isDraggable = block.type !== 'rock';

        const baseStyle = {
            position: 'absolute',
            left: `${block.x * CELL_SIZE + 2}px`,
            top: `${block.y * CELL_SIZE + 2}px`,
            width: `${block.width * CELL_SIZE}px`,
            height: `${block.height * CELL_SIZE}px`,
            backgroundColor: getBlockColor(block),
            border: isActive ? '2px solid white' : `1px solid ${getBlockColor(block)}`,
            boxShadow: isInvalid
                ? '0 0 0 3px rgba(255, 0, 0, 0.4)'
                : '0 1px 2px rgba(0,0,0,0.1)',
            cursor: isDraggable ? 'grab' : 'not-allowed',
            opacity: isActive ? 0.9 : 1,
            transform: isInvalid ? 'scale(0.98)' : 'scale(1)',
            transition: 'all 150ms ease',
            zIndex: block.type === 'ball' ? 10 : 5
        };

        // Ball is rendered as circle
        if (block.type === 'ball') {
            return (
                <div
                    key={block.id}
                    style={{
                        ...baseStyle,
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                    }}
                    onMouseDown={(e) => handleMouseDown(block.id, e)}
                    onClick={() => setActiveBlockId(block.id)}
                />
            );
        }

        // Plastic blocks and rocks as rectangles
        return (
            <div
                key={block.id}
                style={{
                    ...baseStyle,
                    borderRadius: '4px'
                }}
                onMouseDown={(e) => handleMouseDown(block.id, e)}
                onClick={() => setActiveBlockId(block.id)}
            />
        );
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>Initializing assessment...</div>;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 select-none overflow-hidden flex flex-col" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            {/* PROFESSIONAL TOP BAR */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="text-sm font-medium text-gray-900">Motion Assessment</div>
                    <div className="text-sm text-gray-600">Level {level}/5</div>
                    <div className="text-sm text-gray-600">Moves: {moves}</div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`font-mono text-sm font-medium ${timeLeft !== null && timeLeft < 60 ? 'text-red-600' : 'text-gray-700'}`}>
                        {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                    </div>
                    <div className="text-sm text-gray-500">
                        Score: {Math.round(score)}
                    </div>
                </div>
            </div>

            {/* INSTRUCTIONS MODAL (ONE-TIME ONLY) */}
            {showInstructions && !hasStarted && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Motion Assessment</h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            Rearrange blocks to guide the red ball into the black hole.
                            Complete each problem in minimum moves within the given time.
                        </p>
                        <div className="bg-gray-50 rounded p-4 mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Rules</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Red ball moves in all four directions</li>
                                <li>• Move plastic blocks to clear a path</li>
                                <li>• Rocks cannot be moved</li>
                                <li>• You have 6 minutes for 5 levels</li>
                            </ul>
                        </div>
                        <button
                            onClick={handleStartAssessment}
                            className="w-full py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
                        >
                            Start Assessment
                        </button>
                    </div>
                </div>
            )}

            {/* GAMEPLAY AREA - MINIMAL & CLEAN */}
            {hasStarted && !showInstructions && (
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Minimal warning display */}
                    {warningCount > 0 && (
                        <div className="absolute top-4 bg-red-50 text-red-700 px-4 py-2 rounded text-sm border border-red-200">
                            Warning: {warningCount}/{MAX_WARNINGS} Violations
                        </div>
                    )}

                    {/* GRID ONLY - NO SURROUNDING CARDS */}
                    <div
                        ref={gridRef}
                        className="relative bg-gray-50 rounded border border-gray-300"
                        style={{
                            width: `${GRID_COLS * CELL_SIZE + 4}px`,
                            height: `${GRID_ROWS * CELL_SIZE + 4}px`,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
                        }}
                    >
                        {/* Grid cells - thin lines */}
                        {Array.from({ length: GRID_ROWS }).map((_, row) =>
                            Array.from({ length: GRID_COLS }).map((_, col) => (
                                <div
                                    key={`${row}-${col}`}
                                    className="absolute"
                                    style={{
                                        left: `${col * CELL_SIZE + 2}px`,
                                        top: `${row * CELL_SIZE + 2}px`,
                                        width: `${CELL_SIZE}px`,
                                        height: `${CELL_SIZE}px`,
                                        border: '0.5px solid #e5e7eb'
                                    }}
                                />
                            ))
                        )}

                        {/* BLACK HOLE (Exit) - dynamically rendered from level data */}
                        {hole && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${hole.x * CELL_SIZE + 2}px`,
                                    top: `${hole.y * CELL_SIZE + 2}px`,
                                    width: `${CELL_SIZE}px`,
                                    height: `${CELL_SIZE}px`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1
                                }}
                            >
                                <div
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        backgroundColor: '#1f2937',
                                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                                        opacity: 0.4
                                    }}
                                />
                            </div>
                        )}

                        {/* Blocks - render using renderBlock function */}
                        {blocks.map(block => renderBlock(block))}
                    </div>
                </div>
            )}

            {/* SUBMITTING OVERLAY - SILENT & PROFESSIONAL */}
            {submitting && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-50">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-700 text-sm">Submitting assessment...</p>
                </div>
            )}

            <Modal
                isOpen={isFullScreenModalOpen}
                onClose={handleFixFullScreen}
                title="Security Validation"
                actions={
                    <button onClick={handleFixFullScreen} className="bg-blue-600 text-white px-6 py-2 rounded font-medium">
                        Return to Assessment
                    </button>
                }
            >
                <div className="text-center py-4">
                    <p>Full screen mode is required. Please authorize to continue.</p>
                </div>
            </Modal>

            <Modal
                isOpen={isSubmissionModalOpen}
                title="Assessment Submitted"
                onClose={() => navigate('/dashboard')}
                actions={
                    <button onClick={() => navigate('/dashboard')} className="bg-blue-600 text-white px-6 py-2 rounded font-medium">
                        Return to Dashboard
                    </button>
                }
            >
                <div className="text-center py-6">
                    {submissionReason === 'TIMEOUT' ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded font-medium text-sm">
                                TIMEOUT
                            </div>
                            <p className="text-sm text-gray-600">Time limit reached.</p>
                        </div>
                    ) : submissionReason === 'VIOLATION_LIMIT' ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-red-100 text-red-800 px-4 py-2 rounded font-medium text-sm">
                                TERMINATED
                            </div>
                            <p className="text-sm text-gray-600">Maximum violations reached.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded font-medium text-sm">
                                COMPLETED
                            </div>
                            <p className="text-sm text-gray-600">Assessment submitted successfully.</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
