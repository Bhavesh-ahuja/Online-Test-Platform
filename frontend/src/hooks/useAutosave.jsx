import { useRef, useEffect } from 'react';
import { testsApi } from '../api/tests';

export function useAutosave(testId, submissionId, answers, markedQuestions, examToken) {
    const autosaveIntervalRef = useRef(null);
    const latestDataRef = useRef({ answers, markedQuestions });

    // 1. Keep ref backed up with latest data on every render being fast
    useEffect(() => {
        latestDataRef.current = { answers, markedQuestions };
    }, [answers, markedQuestions]);

    // 2. Setup Timer ONCE (independent of data changes)
    useEffect(() => {
        if (!submissionId || !examToken) return;

        // Jitter: Add random offset (0-5s) to prevent "thundering herd"
        const jitter = Math.floor(Math.random() * 5000);

        autosaveIntervalRef.current = setInterval(() => {
            const currentData = latestDataRef.current;

            // Logic Check: Only save if there are actual answers/marks
            if (Object.keys(currentData.answers).length === 0 && currentData.markedQuestions.length === 0) return;

            testsApi.autosave(testId, {
                submissionId,
                answers: currentData.answers,
                markedQuestions: currentData.markedQuestions
            }, examToken)
                .catch(err => console.error("Autosave failed:", err));

        }, 30000 + jitter);

        return () => {
            if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
        };
    }, [testId, submissionId, examToken]); // Removed 'answers' and 'markedQuestions' dependencies
}
