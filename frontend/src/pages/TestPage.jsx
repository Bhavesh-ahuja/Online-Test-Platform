import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';  // Adjust path (../ or ./) based on file location

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

function TimerDisplay({ seconds }) {
  const formatTime = () => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(remainingSeconds).padStart(2, '0');
    return `${minStr}:${secStr}`;
  };

  return (
    <div className="bg-gray-800 text-white p-3 px-6 flex justify-between items-center shadow-md">
      <span className="font-semibold text-gray-300 tracking-wide">Online Test Platform</span>
      <span className={`font-bold text-xl font-mono ${seconds < 60 ? 'text-red-400 animate-pulse' : 'text-blue-300'}`}>
        Time Left: {formatTime()}
      </span>
    </div>
  );
}

function WarningBanner({ count }) {
  if (!count) return null;
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-4 mt-4 text-sm font-medium" role="alert">
      Warning! Tab switching is prohibited. 
    </div>
  );
}

function QuestionPalette({
  questions,
  totalQuestions,
  currentQuestionIndex,
  answers,
  markedQuestions,
  visitedQuestions,
  onJump
}) {
  // Helper to determine color class
  const getButtonClass = (index) => {
  const questionId = questions[index].id;
  const isCurrent = index === currentQuestionIndex;
  const isAnswered = answers[questionId] !== undefined;
  const isMarked = markedQuestions.includes(index);
  const isVisited = visitedQuestions.includes(index);

  let baseClass =
    "w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold border transition-all ";

  if (isCurrent) return baseClass + "ring-2 ring-offset-2 ring-blue-500 bg-blue-100";
  if (isMarked && isAnswered) return baseClass + "bg-purple-600 text-white";
  if (isMarked) return baseClass + "bg-purple-200";
  if (isAnswered) return baseClass + "bg-green-500 text-white";
  if (isVisited) return baseClass + "bg-red-100";

  return baseClass + "bg-gray-100";
};


  

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full border border-gray-200">
      <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Question Palette</h3>
      <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[400px] p-1">
        {Array.from({ length: totalQuestions }).map((_, index) => (
          <button
            key={index}
            onClick={() => onJump(index)}
            className={getButtonClass(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 text-xs space-y-2 text-gray-600 border-t pt-4">
        <div className="flex items-center"><div className="w-3 h-3 bg-green-500 mr-2 rounded"></div> Answered</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-red-100 border border-red-300 mr-2 rounded"></div> Not Answered</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-gray-100 border border-gray-300 mr-2 rounded"></div> Not Visited</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-purple-200 border border-purple-300 mr-2 rounded"></div> Marked for Review</div>
        <div className="flex items-center"><div className="w-3 h-3 bg-purple-600 mr-2 rounded"></div> Ans & Marked</div>
      </div>
    </div>
  );
}

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
}



    if (loading) return;

   

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

  const interval = setInterval(() => {
    const autosaveKey = getAutosaveKey(id, submissionId);
    localStorage.setItem(
      autosaveKey,
      JSON.stringify({
        answers,
        markedQuestions,
        updatedAt: Date.now(),
      })
    );
  }, 10000);

  return () => clearInterval(interval);
}, [answers, markedQuestions, submissionId, id]);









 // Inside TestPage.jsx
useEffect(() => {
  if (submissionStatus !== 'IN_PROGRESS' || !submissionId) return;

  const examToken = sessionStorage.getItem('examSessionToken');
  if (!examToken) return;

  autosaveIntervalRef.current = setInterval(() => {
    // Change URL to /autosave and method to PATCH to match test.routes.js
    fetch(`${API_BASE_URL}/api/tests/${id}/autosave`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${examToken}`,
      },
      body: JSON.stringify({
        submissionId, // Ensure this matches the controller expectation
        answers,
        markedQuestions,
      }),
    }).catch((err) => console.error("Autosave failed:", err));
  }, 30000);

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

    console.log('✅ Autosave restored correctly');
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
    const loginToken = localStorage.getItem('token');
    if (!loginToken) {
      navigate('/login');
      return;
    }

    try {
      const startRes = await fetch(
        `http://localhost:8000/api/tests/${id}/start`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${loginToken}` },
        }
      );

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || 'Start failed');
      }

      const sessionData = await startRes.json();

      if (!isMounted) return;

      setSubmissionStatus(sessionData.status || 'IN_PROGRESS');
      setSubmissionId(sessionData.submissionId);
      sessionStorage.setItem('examSessionToken', sessionData.examSessionToken);

      const testRes = await fetch(`http://localhost:8000/api/tests/${id}`, {
        headers: {
          Authorization: `Bearer ${sessionData.examSessionToken}`,
        },
      });

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

      const data = await testRes.json();
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

  const interval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.floor((endTime - Date.now()) / 1000)
    );
    setTimeLeft(remaining);

    if (remaining === 0) {
      clearInterval(interval);
      handleSubmit('TIMEOUT');
    }
  }, 1000);

  return () => clearInterval(interval);
}, [endTime, submissionStatus, isSubmitted, handleSubmit]);



  


  // --- 2. Navigation Handlers ---
  const handleJump = (index) => {
    setCurrentQuestionIndex(index);
    if (!visitedQuestions.includes(index)) {
      setVisitedQuestions([...visitedQuestions, index]);
    }
  };

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
      if (!document.hidden) return;
      setWarnings(prev => {
        const updated = prev + 1;
        if (updated >= MAX_WARNINGS) {
          alert('Violation Limit Reached. Test Terminated');
          handleSubmit('TERMINATED');
        }
        return updated;
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSubmit]);
  

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
    </div>
  );
}

export default TestPage;
