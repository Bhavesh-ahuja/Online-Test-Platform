import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { API_BASE_URL } from '../../config';
import { authFetch } from '../utils/authFetch';

/* --------------------------------------------------------
   Global Constants & Helpers
---------------------------------------------------------*/
const MAX_WARNINGS = 3;
const RUNNING_STATUSES = ['IN_PROGRESS'];






const getAutosaveKey = (testId, submissionId) =>
  `autosave:test:${testId}:${submissionId}`;



// Question Status Constants
const STATUS = {
  NOT_VISITED: 'not_visited',
  NOT_ANSWERED: 'not_answered', // Visited but no answer
  ANSWERED: 'answered',
  MARKED: 'marked', // Marked for review
  MARKED_ANSWERED: 'marked_answered' // Answered AND Marked
};

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/* --------------------------------------------------------
   Sub-Components
---------------------------------------------------------*/

function WarningBanner({ count }) {
  if (!count) return null;
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-4 mt-4 text-sm font-medium" role="alert">
      Warning! Tab switching/Exiting Full Screen is prohibited. ({count}/{MAX_WARNINGS})
    </div>
  );
}

import TimerDisplay from '../components/TimerDisplay';
import QuestionPalette from '../components/QuestionPalette';

/* --------------------------------------------------------
   Main TestPage Component
---------------------------------------------------------*/
function TestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const testId = id;
  const LOCAL_AUTOSAVE_KEY = `local:test:${testId}`;

  // --- State ---
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissionId, setSubmissionId] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const hasRestoredRef = useRef(false);
  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);
  const timerIntervalRef = useRef(null);




  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [warnings, setWarnings] = useState(0);

  const autosaveIntervalRef = useRef(null);
  const localAutosaveIntervalRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);



  // Data Storage
  // We use objects keyed by Question INDEX (0, 1, 2) for local UI state
  // But we will map back to Question ID when submitting.
  const [answers, setAnswers] = useState({}); // { index: "Option A" }
  const [markedQuestions, setMarkedQuestions] = useState([]); // [0, 5, 8] (Indices)
  const [visitedQuestions, setVisitedQuestions] = useState([0]); // [0, 1, 2] (Indices)

  // --- 4. Submission Logic ---
  const handleSubmit = useCallback(
    async (status = 'COMPLETED') => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const examToken = sessionStorage.getItem('examSessionToken');
      const loginToken = localStorage.getItem('token');
      if (isSubmitted) return;   // 🔒 prevent re-run
      setIsSubmitted(true);
      if (!examToken) {
        alert("Session expired. Please refresh.");
        return;
      }
      // 🔥 HARD STOP autosave immediately
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
        autosaveIntervalRef.current = null;
      }
      if (localAutosaveIntervalRef.current) {
        clearInterval(localAutosaveIntervalRef.current);
        localAutosaveIntervalRef.current = null;
      };







      const formattedAnswers = {};
      if (test && test.questions) {
        test.questions.forEach((q) => {
          if (answers[q.id]) {
            formattedAnswers[q.id] = answers[q.id];
          }
        });
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submit`, {

          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${examToken}`,
          },

          body: JSON.stringify({
            answers: formattedAnswers,
            status,
          }),
        });
        // 🔴 HARD STOP: test already completed
        if (response.status === 403) {
          const data = await response.json();

          if (data.finalSubmissionId) {
            navigate(`/results/${data.finalSubmissionId}`);
            return; // 🚨 STOP rendering test page
          }
        }


        let data;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text || 'Submit failed');
        }


        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit');
        }

        // ✅ clear autosave ONLY after successful submit
        if (submissionId) {
          const autosaveKey = getAutosaveKey(id, submissionId);
          localStorage.removeItem(autosaveKey);
        }
        setSubmissionStatus(status === 'TIMEOUT' ? 'TIMEOUT' : 'COMPLETED');

        // ✅ single navigation (no duplicate)
        navigate(`/results/${data.submissionId}`);
        sessionStorage.removeItem('examSessionToken');
      } catch (err) {
        alert('Error submitting test: ' + err.message);
      }
    },
    [id, answers, navigate, loading, test, submissionId]

  );


  useEffect(() => {
    if (!submissionId) return;
    if (submissionStatus !== 'IN_PROGRESS') return;

    // Jitter: Add random offset (0-5s) to prevent "thundering herd"
    const jitter = Math.floor(Math.random() * 5000);
    const intervalTime = 30000 + jitter;

    const interval = setInterval(() => {
      // Logic Check: Only save if there are actual answers/marks
      if (Object.keys(answers).length === 0 && markedQuestions.length === 0) return;

      const autosaveKey = getAutosaveKey(id, submissionId);
      localStorage.setItem(
        autosaveKey,
        JSON.stringify({
          answers,
          markedQuestions,
          updatedAt: Date.now(),
        })
      );
    }, 10000); // Keep local save frequent

    return () => clearInterval(interval);
  }, [answers, markedQuestions, submissionId, id]);









  // Inside TestPage.jsx
  useEffect(() => {
    if (submissionStatus !== 'IN_PROGRESS' || !submissionId) return;

    const examToken = sessionStorage.getItem('examSessionToken');
    if (!examToken) return;

    const jitter = Math.floor(Math.random() * 5000); // 0-5s random delay

    autosaveIntervalRef.current = setInterval(() => {
      // Throttling: Verify if data has changed? (For now, simplified to always run but staggered)

      // Change URL to /autosave and method to PATCH to match test.routes.js
      fetch(`${API_BASE_URL}/api/tests/${id}/autosave`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${examToken}`,
        },
        body: JSON.stringify({
          submissionId,
          answers,
          markedQuestions,
        }),
      }).catch((err) => console.error("Autosave failed:", err));
    }, 30000 + jitter); // Base 30s + Jitter

    return () => {
      if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
    };
  }, [submissionId, submissionStatus, id, answers, markedQuestions]); // Added dependencies to ensure current state is sent


  useEffect(() => {
    if (!submissionId || !test || hasRestoredRef.current) return;

    const autosaveKey = getAutosaveKey(id, submissionId);
    const saved = localStorage.getItem(autosaveKey);

    if (!saved) {
      hasRestoredRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (parsed.answers && typeof parsed.answers === 'object') {
        setAnswers(parsed.answers);
      }

      if (Array.isArray(parsed.markedQuestions)) {
        setMarkedQuestions(parsed.markedQuestions);
      }

    } catch (e) {
      console.error('❌ Autosave restore failed', e);
    }

    hasRestoredRef.current = true;
  }, [submissionId, test, id]);




  // --- 1. Fetch & Init ---
  // --- Step A, B, C: Init Test ---
  useEffect(() => {
    let isMounted = true;

    const initTest = async () => {
      // 🔥 HARD RESET for fresh attempt
      setIsSubmitted(false);
      setSubmissionStatus(null);
      setEndTime(null);
      setTimeLeft(null);
      hasRestoredRef.current = false;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const loginToken = localStorage.getItem('token');
      if (!loginToken) {
        navigate('/login');
        return;
      }

      try {
        const startRes = await authFetch(`/api/tests/${id}/start`, {
          method: 'POST',
        });

        if (!startRes.ok) {
          const err = await startRes.json();
          throw new Error(err.error || 'Start failed');
        }

        const sessionData = await startRes.json();

        if (!isMounted) return;

        setSubmissionStatus(sessionData.status || 'IN_PROGRESS');
        setSubmissionId(sessionData.submissionId);
        sessionStorage.setItem('examSessionToken', sessionData.examSessionToken);

        const testRes = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
          headers: {
            Authorization: `Bearer ${sessionData.examSessionToken}`,
          },
        });

        const data = await testRes.json();

        // Inside initTest after setTest(data);
        if (sessionData.draft) {
          const { answers: savedAnswers, markedQuestions: savedMarked } = sessionData.draft;

          if (savedAnswers) setAnswers(savedAnswers);
          if (savedMarked) setMarkedQuestions(savedMarked);

          // Mark all questions that have answers as "visited"
          const savedVisited = Object.keys(savedAnswers || {}).map(id =>
            data.questions.findIndex(q => q.id === parseInt(id))
          ).filter(index => index !== -1);

          setVisitedQuestions(prev => [...new Set([...prev, ...savedVisited])]);
        }


        if (!isMounted) return;

        setTest(data);

        const startTime = new Date(sessionData.startTime).getTime();
        const end = startTime + data.duration * 60 * 1000;

        setEndTime(end);
        setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initTest();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);


  // --- Step D: Timer & Auto Submit ---
  useEffect(() => {
    if (submissionStatus !== 'IN_PROGRESS' || isSubmitted) return;
    if (!endTime) return;

    timerIntervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((endTime - Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        handleSubmit('TIMEOUT');
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [endTime, submissionStatus, isSubmitted, handleSubmit]);

  // --- 2. Navigation Handlers ---
  const handleJump = useCallback((index) => {
    setCurrentQuestionIndex(index);
    setVisitedQuestions(prev => {
      if (!prev.includes(index)) return [...prev, index];
      return prev;
    });
  }, []);

  const handleNext = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      handleJump(currentQuestionIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      handleJump(currentQuestionIndex - 1);
    }
  };

  // --- 3. Interaction Handlers ---
  const handleAnswerSelect = (option) => {
    const questionId = test.questions[currentQuestionIndex].id;

    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };



  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    const questionId = test.questions[currentQuestionIndex].id;
    delete newAnswers[questionId];

    setAnswers(newAnswers);
  };

  const toggleMarkForReview = () => {
    if (markedQuestions.includes(currentQuestionIndex)) {
      setMarkedQuestions(markedQuestions.filter(i => i !== currentQuestionIndex));
    } else {
      setMarkedQuestions([...markedQuestions, currentQuestionIndex]);
    }
  };


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);


  const handleViolation = () => {
    setWarnings(prev => {
      const updated = prev + 1;

      if (updated >= MAX_WARNINGS) {
        alert('Violation Limit Reached. Test Terminated');
        handleSubmit('TERMINATED');
      }

      return updated; // ✅ THIS WAS MISSING
    });
  };

  // Full Screen Detection
  useEffect(() => {
    const handleFullScreenChange = () => {
      // If fullscreenElement is null, it means we exited full screen
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        handleViolation();
        // Open the modal (if not terminated yet)
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
  }, [handleViolation]);

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
      // We close the modal anyway; if they are still not in FS, listener won't fire again 
      // immediately, but next exit attempt will trigger it.
      setIsFullScreenModalOpen(false);
    }
  };

  // No-Copy Shield
  useEffect(() => {
    const block = e => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
    };
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Test...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;
  }

  if (!test || !test.questions || test.questions.length === 0) {
    return <div className="flex h-screen items-center justify-center">Test data not available</div>;
  }



  if (loading) return <div className="flex h-screen items-center justify-center text-lg">Loading Test...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;

  const currentQuestion =
    test && test.questions && test.questions[currentQuestionIndex]
      ? test.questions[currentQuestionIndex]
      : null;
  if (!currentQuestion) {
    return <div className="flex h-screen items-center justify-center">Loading Question...</div>;
  }


  return (
    <div className="flex flex-col h-screen bg-gray-50 select-none">

      {/* Header / Timer */}
      {endTime && <TimerDisplay seconds={timeLeft} />}

      <WarningBanner count={warnings} />

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
                onClick={handleClearResponse}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium transition"
              >
                Clear Response
              </button>
              <button
                onClick={toggleMarkForReview}
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

              {currentQuestionIndex === test.questions.length - 1 ? (
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
            questions={test.questions}   // ✅ THIS LINE FIXES EVERYTHING
            totalQuestions={test.questions.length}
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
            You have exited full-screen mode. This has been recorded as a <span className="font-bold text-red-500">violation ({warnings}/{MAX_WARNINGS})</span>.
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
