import React, { useEffect } from 'react';
import { useDigitGame } from '../hooks/useDigitGame';
import { extractOperators } from '../utils/digitEngine';

function DigitChallengePage() {
    const {
        currentLevel,
        selectedDigits,
        timeRemaining,
        totalScore,
        levelScores,
        gameStatus,
        feedback,
        levelData,
        availableDigits,
        startGame,
        addDigit,
        removeLast,
        clearAll,
        submitAnswer
    } = useDigitGame();

    // Start game on mount
    useEffect(() => {
        startGame();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (gameStatus !== 'playing') return;

            // Digit keys 1-9
            const digit = parseInt(e.key);
            if (!isNaN(digit) && digit >= 1 && digit <= 9) {
                if (availableDigits.includes(digit)) {
                    addDigit(digit);
                }
            }

            // Enter to submit
            if (e.key === 'Enter' && selectedDigits.length === levelData?.slots) {
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
    }, [gameStatus, availableDigits, selectedDigits, levelData, addDigit, removeLast, clearAll, submitAnswer]);

    if (!levelData) {
        return <div className="h-screen flex items-center justify-center">Loading...</div>;
    }

    const operators = extractOperators(levelData.template);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
            style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* Header */}
            <div className="w-full max-w-2xl mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Level <span className="font-bold text-gray-900">{currentLevel}</span> / {5}
                    </div>
                    <div className={`text-2xl font-mono font-bold ${timeRemaining <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm text-gray-600">
                        Score: <span className="font-bold text-blue-600">{totalScore.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Main Game Area */}
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

                {/* Feedback removed - assessment is silent until completion */}

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

            {/* Game Completed Modal */}
            {gameStatus === 'completed' && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="text-4xl mb-4">✓</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Challenge Complete</h2>
                            <div className="text-sm text-gray-600 mb-6">Assessment submitted successfully</div>

                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <div className="text-sm text-gray-500 mb-2">Final Score</div>
                                <div className="text-5xl font-bold text-blue-600">
                                    {totalScore.toFixed(2)}
                                </div>
                            </div>

                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DigitChallengePage;
