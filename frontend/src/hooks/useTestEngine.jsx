import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { testsApi } from '../api/tests';
import { useAutosave } from './useAutosave';

export function useTestEngine(testId) {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [test, setTest] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const timerIntervalRef = useRef(null);
  const [warningCount, setWarningCount] = useState(0);

  // 1. Initial Load & Start
  useEffect(() => {
    const initTest = async () => {
      try {
        const sessionData = await testsApi.start(testId);

        setSubmissionId(sessionData.submissionId);
        setSubmissionStatus(sessionData.status || 'IN_PROGRESS');
        sessionStorage.setItem('examSessionToken', sessionData.examSessionToken);

        const testData = await testsApi.getById(testId, sessionData.examSessionToken);
        setTest(testData);
        setQuestions(testData.questions || []);

        if (sessionData.draft) {
          setAnswers(sessionData.draft.answers || {});
          setMarkedQuestions(sessionData.draft.markedQuestions || []);
        }

        const startTime = new Date(sessionData.startTime).getTime();
        const now = Date.now();
        const durationMs = testData.duration * 60 * 1000;
        const elapsed = now - startTime;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));

        setTimeLeft(remaining);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initTest();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [testId]);

  // 2. Timer Logic
  useEffect(() => {
    if (!loading && timeLeft > 0 && submissionStatus === 'IN_PROGRESS') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleSubmit('TIMEOUT');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [loading, submissionStatus]);

  // 3. Autosave
  const examToken = sessionStorage.getItem('examSessionToken');
  useAutosave(testId, submissionId, answers, markedQuestions, examToken);

  // 4. Actions
  const handleAnswerSelect = (option) => {
    const qId = questions[currentQuestionIndex].id;
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleClearAnswer = () => {
    const qId = questions[currentQuestionIndex].id;
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[qId];
      return newAnswers;
    });
  };

  const handleJump = (index) => {
    if (!visitedQuestions.includes(index)) {
      setVisitedQuestions(prev => [...prev, index]);
    }
    setCurrentQuestionIndex(index);
  };

  const toggleMark = () => {
    setMarkedQuestions(prev =>
      prev.includes(currentQuestionIndex)
        ? prev.filter(i => i !== currentQuestionIndex)
        : [...prev, currentQuestionIndex]
    );
  };

  // ✅ FIXED SUBMIT LOGIC (CORE FIX)
 const handleSubmit = async (statusOverride = 'COMPLETED') => {
  try {
    const res = await testsApi.submit(
      testId,
      { answers, status: statusOverride },
      examToken
    );

    // ✅ Don't remove token immediately - keep it for results fetch
    // sessionStorage.removeItem('examSessionToken');

    const finalSubmissionId =
      res?.submissionId ||
      res?.id ||
      submissionId;

    if (res?.showResult && finalSubmissionId) {
      navigate(`/results/${finalSubmissionId}`, { replace: true });
    } else {
      navigate('/test-submitted', { replace: true });
    }
  } catch (err) {
    console.error('Submit failed', err);
    setError('Submission failed. Please try again.');
  } finally {
    // ✅ Remove token after navigation
    sessionStorage.removeItem('examSessionToken');
  }
};

  // 5. Anti-Cheat
  const addWarning = useCallback(() => {
    setWarningCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        handleSubmit('TERMINATED');
      }
      return newCount;
    });
  }, [handleSubmit]);

  return {
    loading,
    error,
    test,
    questions,
    currentQuestionIndex,
    answers,
    markedQuestions,
    visitedQuestions,
    timeLeft,
    warningCount,
    handleAnswerSelect,
    handleClearAnswer,
    handleJump,
    toggleMark,
    handleSubmit,
    addWarning,
    navigate
  };
}
