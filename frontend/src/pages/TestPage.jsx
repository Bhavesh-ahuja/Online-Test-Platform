import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import { useTestEngine } from '../hooks/useTestEngine';
import TimerDisplay from '../components/TimerDisplay';
import QuestionPalette from '../components/QuestionPalette';

const MAX_WARNINGS = 3;

function WarningBanner({ count }) {
  if (!count) return null;
  return (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mx-6 mt-4 rounded-r shadow-sm flex items-center justify-between animate-pulse">
      <span className="font-medium flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Warning! Tab switching is prohibited.
      </span>
      <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">
        {count}/{MAX_WARNINGS}
      </span>
    </div>
  );
}

function TestPage() {
  const { id } = useParams();

  const {
    test,
    questions,
    currentQuestionIndex,
    answers,
    markedQuestions,
    visitedQuestions,
    timeLeft,
    warningCount,
    loading,
    error,
    handleAnswerSelect,
    handleClearAnswer,
    handleJump,
    toggleMark,
    handleSubmit,
    addWarning
  } = useTestEngine(id);

  const [isFullScreenModalOpen, setIsFullScreenModalOpen] = useState(false);

  // --- Proctoring Logic ---
  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) addWarning(); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addWarning]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        addWarning();
        setIsFullScreenModalOpen(true);
      }
    };
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
      event => document.addEventListener(event, handleFullScreenChange)
    );
    return () => {
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
        event => document.removeEventListener(event, handleFullScreenChange)
      );
    };
  }, [addWarning]);

  useEffect(() => {
    const block = e => e.preventDefault();
    ['contextmenu', 'copy', 'cut', 'paste'].forEach(event => document.addEventListener(event, block));
    return () => ['contextmenu', 'copy', 'cut', 'paste'].forEach(event => document.removeEventListener(event, block));
  }, []);

  const handleFixFullScreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else if (document.documentElement.webkitRequestFullscreen) await document.documentElement.webkitRequestFullscreen();
      setIsFullScreenModalOpen(false);
    } catch (err) {
      console.error("Failed to re-enter full screen", err);
      setIsFullScreenModalOpen(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500 font-medium animate-pulse">Loading...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!test || !questions || questions.length === 0) return <div className="flex h-screen items-center justify-center">No Data</div>;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) handleJump(currentQuestionIndex + 1);
  };
  const handlePrev = () => {
    if (currentQuestionIndex > 0) handleJump(currentQuestionIndex - 1);
  };

  return (
    <div className="h-screen bg-[#F3F4F6] flex flex-col font-sans select-none overflow-hidden">
      
      {/* --- HEADER --- */}
      {/* Used 'relative' on header and 'absolute' on child items to force positioning */}
      <header className="bg-white shadow-sm flex-none z-20 h-20 w-full relative flex items-center justify-center px-6">
        
        {/* 1. LEFT: Logo & Branding (Pinned Left) */}
        <div className="absolute left-6 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
   {/* Logo Image */}
   <div className="w-10 h-10 flex items-center justify-center">
      <img 
        src="/img/Original Logo.PNG" 
        alt="Team Mavericks Logo" 
        className="w-full h-full object-contain" 
      />
   </div>
   
   {/* Branding Text */}
   <div className="flex flex-col hidden md:flex">
      <span className="font-black text-gray-800 text-lg uppercase tracking-widest leading-none">Team</span>
      <span className="font-black text-blue-600 text-lg uppercase tracking-widest leading-none">Mavericks</span>
   </div>
   </div>

        {/* 2. CENTER: Test Name (Centered absolutely) */}
        <div className="text-center">
           <h1 className="text-xl font-bold text-gray-900">Online Test Platform</h1>
           <p className="text-xs text-gray-500 font-medium mt-0.5">{test?.title || 'Session 1'}</p>
        </div>
        
        {/* 3. RIGHT: Timer (Pinned Right) */}
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center">
           <div className="bg-white px-5 py-2 rounded-full border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                 <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div className="flex flex-col items-start justify-center leading-none">
                 <span className="text-lg font-bold text-gray-800 font-mono">
                    {timeLeft !== null && <TimerDisplay seconds={timeLeft} />}
                 </span>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Time Left</span>
              </div>
           </div>
        </div>
      </header>

      {/* --- PROGRESS BAR --- */}
      <div className="w-full bg-gray-200 h-1 flex-none">
        <div 
          className="bg-purple-600 h-1 transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <WarningBanner count={warningCount} />

      {/* --- MAIN LAYOUT --- */}
      <div className="flex-grow p-4 md:p-6 overflow-hidden">
        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Question Card */}
          <div className="lg:col-span-9 h-full flex flex-col">
            <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8 flex flex-col h-full">
              
              {/* Question Content */}
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-gray-400 font-medium text-lg">Question {currentQuestionIndex + 1}</h2>
                </div>

                <div className="mb-8">
                   <p className="text-xl font-bold text-gray-800 leading-relaxed">{currentQuestion.text}</p>
                </div>

                <div className="space-y-4 mb-4">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = answers[currentQuestion.id] === option;
                    return (
                      <div 
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        className={`group flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                          ${isSelected 
                            ? 'border-purple-500 bg-purple-50/50 shadow-sm' 
                            : 'border-gray-100 bg-white hover:border-purple-200 hover:bg-gray-50'
                          }`}
                      >
                        <span className={`text-lg font-medium ${isSelected ? 'text-purple-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                          {option}
                        </span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'border-purple-500' : 'border-gray-300 group-hover:border-purple-300'}`}>
                          {isSelected && <div className="w-3 h-3 rounded-full bg-purple-600"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOOTER */}
              <div className="mt-4 pt-6 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4 flex-none">
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleMark}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border
                      ${markedQuestions.includes(currentQuestionIndex)
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                     {markedQuestions.includes(currentQuestionIndex) ? 'Marked' : 'Review'}
                  </button>

                  <button 
                    onClick={handleClearAnswer}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium"
                  >
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-3">
                   <button
                      onClick={handlePrev}
                      disabled={currentQuestionIndex === 0}
                      className={`px-6 py-2.5 rounded-full font-bold transition-all
                         ${currentQuestionIndex === 0 
                           ? 'text-gray-300 cursor-not-allowed' 
                           : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                   >
                      Previous
                   </button>

                   {currentQuestionIndex === questions.length - 1 ? (
                      <button
                         onClick={() => {
                           if (window.confirm("Are you sure you want to submit the test?")) handleSubmit('COMPLETED');
                         }}
                         className="px-8 py-2.5 rounded-full bg-purple-600 text-white font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95"
                      >
                         Finish Test
                      </button>
                   ) : (
                      <button
                         onClick={handleNext}
                         className="px-8 py-2.5 rounded-full bg-gray-900 text-white font-bold shadow-lg hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                      >
                         Next <span className="text-xl leading-none">&rsaquo;</span>
                      </button>
                   )}
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT: Palette */}
          <div className="lg:col-span-3 h-full">
             <div className="bg-white rounded-3xl shadow-sm p-6 h-full flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex-none">Question Palette</h3>
                <div className="flex-grow overflow-hidden">
                  <QuestionPalette
                    questions={questions}
                    totalQuestions={questions.length}
                    currentQuestionIndex={currentQuestionIndex}
                    answers={answers}
                    markedQuestions={markedQuestions}
                    visitedQuestions={visitedQuestions}
                    onJump={handleJump}
                  />
                </div>
             </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isFullScreenModalOpen} onClose={handleFixFullScreen} title="Security Alert">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Full Screen Required</h3>
          <p className="text-gray-500 mb-6">You exited full-screen mode. <span className="font-bold text-red-600">Warning {warningCount}/{MAX_WARNINGS}</span></p>
          <button onClick={handleFixFullScreen} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition">Return to Test</button>
        </div>
      </Modal>

    </div>
  );
}

export default TestPage;