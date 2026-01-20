// TimerDisplay.jsx
import React from 'react';

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

export default TimerDisplay;
