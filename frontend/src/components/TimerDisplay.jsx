import React from 'react';

function TimerDisplay({ seconds }) {
    // 1. Format the time logic (Keep this as is)
    const formatTime = () => {
        const safeSeconds = Math.max(0, Math.floor(seconds || 0));
        const minutes = Math.floor(safeSeconds / 60);
        const remainingSeconds = safeSeconds % 60;
        const minStr = String(minutes).padStart(2, '0');
        const secStr = String(remainingSeconds).padStart(2, '0');
        return `${minStr}:${secStr}`;
    };

    // 2. Logic for Red Color when less than 60 seconds
    const isLowTime = seconds < 60;

    // 3. Return ONLY the time string. 
    // The parent component (TestPage) handles the background, icons, and layout.
    return (
        <span className={isLowTime ? 'text-red-600 animate-pulse' : 'text-inherit'}>
            {formatTime()}
        </span>
    );
}

export default TimerDisplay;