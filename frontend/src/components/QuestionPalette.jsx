// QuestionPalette.jsx
import React from 'react';

function QuestionPaletteComponent({
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

const QuestionPalette = React.memo(QuestionPaletteComponent);
export default QuestionPalette;
