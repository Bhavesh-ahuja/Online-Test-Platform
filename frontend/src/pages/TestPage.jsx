import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import { useTestEngine } from '../hooks/useTestEngine';
import TimerDisplay from '../components/TimerDisplay';
import QuestionPalette from '../components/QuestionPalette';

const MAX_WARNINGS = 3;

import { useKeyboardLock } from '../hooks/useKeyboardLock';

function WarningBanner({ count }) {
  if (!count) return null;
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-4 mt-4 text-sm font-medium" role="alert">
      Warning! Tab switching/Exiting Full Screen is prohibited. ({count}/{MAX_WARNINGS})
    </div>
  );
}

function TestPage() {
  const { id } = useParams();

  // --- 1. Use the Hook (The Brain) ---
  const {
    test,
    questions,
    currentQuestionIndex,
    answers,
    markedQuestions,
    visitedQuestions,
    timeLeft,
    warningCount,
    loading,
    error,
    handleAnswerSelect,
    handleClearAnswer,
    handleJump,
    toggleMark,
    handleSubmit,
    addWarning
  } = useTestEngine(id);

  // --- 2. Local UI State (The View) ---
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

  // --- 3. Security (Keyboard Lock) ---
  // Only lock when the test is effectively running (not loading, no error)
  useKeyboardLock(!loading && !error, addWarning);

  // --- 3. Proctoring Logic (UI Event Listeners) ---
  // We keep listeners here because they interact with the DOM/Window directly

  // Visibility (Tab Switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addWarning();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addWarning]);

  // Full Screen Detection
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        addWarning();
        setIsFullScreenModalOpen(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, [addWarning]);

  // No-Copy Shield (Events not covered by Keyboard Lock)
  useEffect(() => {
    const block = e => e.preventDefault();
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
    };
  }, []);

  // Handle "OK" click on Warning Modal
  const handleFixFullScreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      }
      setIsFullScreenModalOpen(false);
    } catch (err) {
      console.error("Failed to re-enter full screen", err);
      setIsFullScreenModalOpen(false);
    }
  };

  // --- 4. Render Logic ---

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-lg">Loading Test...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

  if (!test || !questions || questions.length === 0) {
    return <div className="flex h-screen items-center justify-center">Test data not available</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="flex h-screen items-center justify-center">Loading Question...</div>;
  }

  // Helper for Nav Buttons
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      handleJump(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      handleJump(currentQuestionIndex - 1);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 select-none">

      {/* Header / Timer */}
      {timeLeft !== null && <TimerDisplay seconds={timeLeft} />}

      <WarningBanner count={warningCount} />

      {/* Main Layout */}
      <div className="flex grow overflow-hidden">

        {/* Left: Question Area (75%) */}
        <div className="w-3/4 flex flex-col p-6 overflow-y-auto">

          {/* Question Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Question {currentQuestionIndex + 1}</h2>
            <div className="text-sm text-gray-500">
              {test?.title || ''}
            </div>
          </div>

          {/* Question Box */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 min-h-[200px]">
            <p className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
              {currentQuestion.text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all hover:bg-blue-50 
                  ${answers[currentQuestion.id] === option
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white'}`}
              >
                <input
                  type="radio"
                  name={`question_${currentQuestion.id}`}
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => handleAnswerSelect(option)}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-gray-700 font-medium">{option}</span>
              </label>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-auto pt-6 border-t flex justify-between items-center">

            <div className="space-x-3">
              <button
                onClick={handleClearAnswer}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium transition"
              >
                Clear Response
              </button>
              <button
                onClick={toggleMark}
                className={`px-4 py-2 border rounded font-medium transition
                  ${markedQuestions.includes(currentQuestionIndex)
                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {markedQuestions.includes(currentQuestionIndex) ? 'Unmark Review' : 'Mark for Review'}
              </button>
            </div>

            <div className="space-x-3">
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className={`px-6 py-2 rounded font-medium transition
                  ${currentQuestionIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'}`}
              >
                Previous
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to submit the test?")) {
                      handleSubmit('COMPLETED');
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-md transition"
                >
                  Submit Test
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold transition"
                >
                  Next & Save
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Question Palette (25%) */}
        <div className="w-1/4 p-4 bg-gray-100 border-l border-gray-200 overflow-y-auto">
          <QuestionPalette
            questions={questions}
            totalQuestions={questions.length}
            currentQuestionIndex={currentQuestionIndex}
            answers={answers}
            markedQuestions={markedQuestions}
            visitedQuestions={visitedQuestions}
            onJump={handleJump}
          />
        </div>

      </div>

      {/* Full Screen Warning Modal */}
      <Modal
        isOpen={isFullScreenModalOpen}
        onClose={handleFixFullScreen}
        title="Security Warning"
        actions={
          <button onClick={handleFixFullScreen} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-semibold shadow-md">
            OK, Return to Full Screen
          </button>
        }
      >
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-600 mb-2">Full-Screen Mode Required</h3>
          <p className="text-gray-600">
            You have exited full-screen mode. This has been recorded as a <span className="font-bold text-red-500">violation ({warningCount}/{MAX_WARNINGS})</span>.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Please click <strong>OK</strong> to return to full-screen mode and continue the test.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default TestPage;
