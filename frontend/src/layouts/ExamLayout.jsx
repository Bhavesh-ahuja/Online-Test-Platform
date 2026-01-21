import React from 'react';

function ExamLayout({ children }) {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* 
         Exam Layout is simpler: No Navbar to prevent distraction. 
         Ideally, it handles the fullscreen prompt here, but for now just container style.
       */}
            {children}
        </div>
    );
}

export default ExamLayout;
