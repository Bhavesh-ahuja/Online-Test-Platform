import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/* --------------------------------------------------------
   Global Constants
---------------------------------------------------------*/
const MAX_WARNINGS = 3; // Auto-submit after 3 tab switches


// Fisher-Yates Shuffle Algorithm
// Takes an array and returns a New shuffled array
function shuffledArray(array) {
  const shuffled = [...array];   //Create a copy
  for (let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];  //Swap
  }
  return shuffled
}
/* --------------------------------------------------------
   TimerDisplay Component
   - Converts seconds → MM:SS
   - Turns red when < 60 seconds left
---------------------------------------------------------*/
function TimerDisplay({ seconds }) {
  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(remainingSeconds).padStart(2, '0');

    return `${minStr}:${secStr}`;
  };

  return (
    <div className="sticky top-0 z-10">
      <div className="bg-gray-800 text-white p-3 shadow-lg flex justify-between items-center px-6">
        <span className="font-semibold text-gray-300">Online Test Platform</span>

        <span className={`font-bold text-lg ${seconds < 60 ? 'text-red-400' : ''}`}>
          Time Left: {formatTime()}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------
   WarningBanner Component
   - Visible after first tab switch
---------------------------------------------------------*/
function WarningBanner({ count }) {
  if (!count) return null;

  return (
    <div
      className="bg-red-100 border-1-4 border-red-500 text-red-700 p-4 mb-6 mx-auto max-w-3xl mt-4"
      role="alert"
    >
      <p className="font-bold">Warning!</p>
      <p>Tab switching is prohibited. On the 3rd violation, the test auto-submits.</p>
    </div>
  );
}

/* --------------------------------------------------------
   TestPage Component
   - Fetches test
   - Renders questions
   - Starts countdown timer
   - Auto-submits when:
        ✔ Time runs out
        ✔ User switches tab 3 times
   - Prevents copying, cutting, pasting, right-click
---------------------------------------------------------*/
function TestPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* --------------------------------------------------------
     State
  ---------------------------------------------------------*/
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [answers, setAnswers] = useState({});
  const [warnings, setWarnings] = useState(0);

  /* --------------------------------------------------------
     1. Fetch & Shuffle test when component loads
  ---------------------------------------------------------*/
  useEffect(() => {
    const loadTest = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      try {
        const response = await fetch(`http://localhost:8000/api/tests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 404) throw new Error('Test not found');
        if (!response.ok) throw new Error('Failed to fetch test');

        const data = await response.json();

        // Shuffle Questions
        if (data.questions && Array.isArray(data.questions)) {
          data.questions = shuffledArray(data.questions);
        }

        setTest(data);
        setTimeLeft(data.duration * 60);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [id, navigate]);

  /* --------------------------------------------------------
     2. Save answer selection
  ---------------------------------------------------------*/
  const handleAnswerChange = (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  /* --------------------------------------------------------
     3. Submit handler
  ---------------------------------------------------------*/
  const handleSubmit = useCallback(async () => {
    if (loading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/tests/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');

      alert('Test submitted successfully!');
      navigate(`/results/${data.submissionId}`);
    } catch (err) {
      setError(err.message);
      alert('Error submitting test: ' + err.message);
    }
  }, [id, answers, navigate, loading]);

  /* --------------------------------------------------------
     4. Timer countdown
  ---------------------------------------------------------*/
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  /* --------------------------------------------------------
     5. Auto-submit on timeout
  ---------------------------------------------------------*/
  useEffect(() => {
    if (timeLeft === 0) {
      alert("Time's up! Submitting your test...");
      handleSubmit();
    }
  }, [timeLeft, handleSubmit]);

  /* --------------------------------------------------------
     6. Tab-switch detection
  ---------------------------------------------------------*/
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) return;

      setWarnings(prev => {
        const updated = prev + 1;

        if (updated >= MAX_WARNINGS) {
          alert('Violation Limit Reached. Test Terminated');
          handleSubmit();
        } else {
          alert('Warning: Tab switch detected! After 3 switches, the test will auto-submit.');
        }

        return updated;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleSubmit]);

  /* --------------------------------------------------------
     7. Disable cheat actions
  ---------------------------------------------------------*/
  useEffect(() => {
    const blockContextMenu = e => e.preventDefault();

    const blockCopyCutPaste = e => {
      e.preventDefault();
      alert('Copying/Pasting content is prohibited during the exam!');
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('copy', blockCopyCutPaste);
    document.addEventListener('cut', blockCopyCutPaste);
    document.addEventListener('paste', blockCopyCutPaste);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('copy', blockCopyCutPaste);
      document.removeEventListener('cut', blockCopyCutPaste);
      document.removeEventListener('paste', blockCopyCutPaste);
    };
  }, []);

  /* --------------------------------------------------------
     UI rendering
  ---------------------------------------------------------*/
  if (loading) return <div className="text-center mt-10">Loading Test...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <>
      {timeLeft !== null && <TimerDisplay seconds={timeLeft} />}
      <WarningBanner count={warnings} />

      <div className="container mx-auto p-6 max-w-3xl select-none">
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h1 className="text-3xl font-bold mb-2">{test?.title}</h1>
          <p className="text-gray-600 mb-4">{test?.description}</p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-6">
            {test?.questions.map((q, index) => (
              <div key={q.id} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold mb-4">
                  Question {index + 1}: {q.text}
                </h3>

                <div className="space-y-2">
                  {q.options.map((option, oIndex) => (
                    <label
                      key={oIndex}
                      className="flex items-center p-3 rounded-lg border border-gray-200 
                                 has-checked:bg-blue-50 has-checked:border-blue-400 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question_${q.id}`}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={() => handleAnswerChange(q.id, option)}
                        className="mr-3"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
            >
              Submit Test
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default TestPage;
