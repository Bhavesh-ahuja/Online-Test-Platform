import React, { useState, useEffect } from 'react';

function QuestionPaletteComponent({
    questions,
    totalQuestions,
    currentQuestionIndex,
    answers,
    markedQuestions,
    visitedQuestions,
    onJump
}) {
    const ITEMS_PER_PAGE = 20;
    const [page, setPage] = useState(0);

    const totalPages = Math.ceil(totalQuestions / ITEMS_PER_PAGE);

    // Auto-Scroll Logic
    useEffect(() => {
        const correctPage = Math.floor(currentQuestionIndex / ITEMS_PER_PAGE);
        if (correctPage !== page) {
            setPage(correctPage);
        }
    }, [currentQuestionIndex]);

    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, totalQuestions);
    const visibleIndices = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);

    // Helper to determine styling
    const getButtonClass = (index) => {
        const questionId = questions[index]?.id;
        const isCurrent = index === currentQuestionIndex;
        const isAnswered = answers[questionId] !== undefined;
        const isMarked = markedQuestions.includes(index);
        const isVisited = visitedQuestions.includes(index);

        let baseClass = "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border transition-all transform hover:scale-105 ";

        if (isCurrent) return baseClass + "bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200 shadow-md";
        if (isMarked && isAnswered) return baseClass + "bg-purple-600 text-white border-purple-600 relative after:content-[''] after:absolute after:-top-1 after:-right-1 after:w-2 after:h-2 after:bg-green-400 after:rounded-full";
        if (isMarked) return baseClass + "bg-purple-50 text-purple-700 border-purple-300";
        if (isAnswered) return baseClass + "bg-green-100 text-green-700 border-green-300";
        if (isVisited) return baseClass + "bg-red-50 text-red-600 border-red-200";

        return baseClass + "bg-gray-50 text-gray-400 border-gray-100";
    };

    return (
        <div className="h-full flex flex-col">
            
            {/* 1. Grid of Questions */}
            <div className="flex-grow overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-3 content-start">
                    {visibleIndices.map((index) => (
                        <button
                            key={index}
                            onClick={() => onJump(index)}
                            className={getButtonClass(index)}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                {/* 2. Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4 mb-2 flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <button 
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-2 rounded-lg bg-white text-purple-600 shadow-sm border border-gray-200 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Set {page + 1} / {totalPages}
                        </span>

                        <button 
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            className="p-2 rounded-lg bg-white text-purple-600 shadow-sm border border-gray-200 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* 3. Enhanced Legend */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 bg-white pb-2">
                <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-green-100 border border-green-300"></div> Answered
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-red-50 border border-red-200"></div> Not Answered
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200"></div> Not Visited
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-purple-50 border border-purple-300"></div> Marked for Review
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                    <div className="w-5 h-5 rounded-full bg-purple-600 border border-purple-600 relative after:content-[''] after:absolute after:-top-0.5 after:-right-0.5 after:w-2 after:h-2 after:bg-green-400 after:rounded-full"></div> Ans & Marked
                </div>
            </div>
        </div>
    );
}

const QuestionPalette = React.memo(QuestionPaletteComponent);
export default QuestionPalette;