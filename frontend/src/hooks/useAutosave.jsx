import { useRef, useEffect } from 'react';
import { testsApi } from '../api/tests';

export function useAutosave(testId, submissionId, answers, markedQuestions, examToken) {
    const autosaveIntervalRef = useRef(null);

    useEffect(() => {
        if (!submissionId || !examToken) return;

        // Jitter: Add random offset (0-5s) to prevent "thundering herd"
        const jitter = Math.floor(Math.random() * 5000);

        autosaveIntervalRef.current = setInterval(() => {
            // Logic Check: Only save if there are actual answers/marks
            if (Object.keys(answers).length === 0 && markedQuestions.length === 0) return;

            testsApi.autosave(testId, { submissionId, answers, markedQuestions }, examToken)
                .catch(err => console.error("Autosave failed:", err));

        }, 30000 + jitter);

        return () => {
            if (autosaveIntervalRef.current) clearInterval(autosaveIntervalRef.current);
        };
    }, [testId, submissionId, answers, markedQuestions, examToken]);
}
