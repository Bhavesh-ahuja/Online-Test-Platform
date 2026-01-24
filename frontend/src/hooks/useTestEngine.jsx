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
                // 1. Start/Resume Session FIRST (to get access token)
                const sessionData = await testsApi.start(testId);

                setSubmissionId(sessionData.submissionId);
                setSubmissionStatus(sessionData.status || 'IN_PROGRESS');
                sessionStorage.setItem('examSessionToken', sessionData.examSessionToken);

                // 2. Fetch Test Content (using the session token)
                const testData = await testsApi.getById(testId, sessionData.examSessionToken);
                setTest(testData);
                setQuestions(testData.questions || []);

                // Resume state if exists
                if (sessionData.draft) {
                    setAnswers(sessionData.draft.answers || {});
                    setMarkedQuestions(sessionData.draft.markedQuestions || []);
                }

                // Calculate Time Left
                const startTime = new Date(sessionData.startTime).getTime();
                // Decode token expiration would be better, but we use strict duration from DB + buffer
                // For simplicity reusing strict calculation:
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

    // 2. Timer Logic (Delta Calculation)
    const localTimerRef = useRef(null);

    useEffect(() => {
        // Clear any existing timer to avoid duplicates when dependencies change
        if (localTimerRef.current) clearInterval(localTimerRef.current);

        if (!loading && timeLeft > 0 && submissionStatus === 'IN_PROGRESS') {
            const terminationTime = Date.now() + (timeLeft * 1000);

            localTimerRef.current = setInterval(() => {
                const now = Date.now();
                const remainingRaw = Math.ceil((terminationTime - now) / 1000);
                const remaining = Math.max(0, remainingRaw);

                setTimeLeft(remaining);

                if (remaining <= 0) {
                    clearInterval(localTimerRef.current);
                    handleSubmit('TIMEOUT');
                }
            }, 1000);
        }

        return () => {
            if (localTimerRef.current) clearInterval(localTimerRef.current);
        };
    }, [loading, submissionStatus]); // Removed timeLeft dependency to prevent infinite re-creation loop

    // 3. Autosave Hook
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

    const handleSubmit = async (statusOverride = 'COMPLETED') => {
        try {
            await testsApi.submit(testId, { answers, status: statusOverride }, examToken);
            sessionStorage.removeItem('examSessionToken');
            navigate(`/test/results/${submissionId}`);
        } catch (err) {
            console.error("Submit failed", err);
            setError("Submission failed. Please try again.");
        }
    };

    // 5. Anti-Cheat (Warning) Logic
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
        navigate // Expose navigate for "Exit" button
    };
}
