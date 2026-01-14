import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localToUtc } from '../utils/datetime';
import { API_BASE_URL } from '../../config'; 

function CreateTestPage() {
  const navigate = useNavigate();

  // --- State Management ---
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    scheduledStart: '',
    scheduledEnd: '',
  });

  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' },
  ]);

  // UI & Feature States
  const [showStartOk, setShowStartOk] = useState(false);
  const [showEndOk, setShowEndOk] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
 
  const [attemptType, setAttemptType] = useState('ONCE');
  const [maxAttempts, setMaxAttempts] = useState(1);

  // --- Helpers ---
  const markDirty = () => setHasUnsavedChanges(true);

  const handleTestChange = (e) => {
    setTestData({ ...testData, [e.target.name]: e.target.value });
    markDirty();
  };

  const handleQuestionChange = (qi, field, value) => {
    const copy = [...questions];
    copy[qi][field] = value;
    setQuestions(copy);
    markDirty();
  };

  const handleOptionChange = (qi, oi, value) => {
    const copy = [...questions];
    // Sync correctAnswer if the text of the currently selected correct option changes
    if (copy[qi].correctAnswer === copy[qi].options[oi]) {
      copy[qi].correctAnswer = value;
    }
    copy[qi].options[oi] = value;
    setQuestions(copy);
    markDirty();
  };

  // --- PDF Auto-Import Feature ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tests/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload PDF');

      // If only one empty question exists, replace it; otherwise, append
      if (questions.length === 1 && questions[0].text.trim() === '') {
        setQuestions(data.questions);
      } else {
        if (window.confirm(`Found ${data.questions.length} questions. Append them to existing list?`)) {
          setQuestions([...questions, ...data.questions]);
        }
      }
      alert(`Successfully imported ${data.questions.length} questions`);
    } catch (error) {
      alert('Import Error: ' + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  // --- Question Management ---
  const addOption = (qi) => {
    const copy = [...questions];
    copy[qi].options.push('');
    setQuestions(copy);
    markDirty();
  };

  const removeOption = (qi, oi) => {
    const copy = [...questions];
    if (copy[qi].options.length <= 2) return;
    copy[qi].options.splice(oi, 1);
    setQuestions(copy);
    markDirty();
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }]);
    markDirty();
  };

  const removeQuestion = (qi) => {
    if (questions.length === 1) {
      alert('At least one question is required');
      return;
    }
    setQuestions(questions.filter((_, index) => index !== qi));
    markDirty();
  };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    for (const q of questions) {
      if (!q.text || q.text.trim() === '') {
        alert('Question text cannot be empty');
        return;
      }
      if (!q.correctAnswer) {
        alert(`Question "${q.text.substring(0,20)}..." is missing a correct answer selection`);
        return;
      }
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/api/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...testData,
          attemptType,
          maxAttempts: attemptType === 'LIMITED' ? maxAttempts : null,
          scheduledStart: localToUtc(testData.scheduledStart),
          scheduledEnd: localToUtc(testData.scheduledEnd),
          questions,
        }),
      });

      if (!res.ok) throw new Error('Failed to create test');

      alert('Test created successfully');
      setHasUnsavedChanges(false);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Create New Test</h1>

      {/* --- AI PDF IMPORT SECTION  --- */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-8 flex flex-col sm:flex-row items-center justify-between shadow-sm">
        <div className="mb-4 sm:mb-0">
          <h3 className="font-bold text-blue-800 text-lg flex items-center">
            <span className="text-2xl mr-2">✨</span> Auto-Import
          </h3>
          <p className="text-sm text-blue-600 mt-1">
            Upload a PDF quiz. We’ll extract questions & answers for you to review.
          </p>
        </div>

        <div className="relative group">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button
            type="button"
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow transition-all transform
              ${isUploading ? 'bg-gray-400 text-gray-100 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'}`}
          >
            {isUploading ? 'Processing…' : '📂 Upload PDF'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TEST DETAILS SECTION */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Test Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
            <input
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              name="title"
              value={testData.title}
              onChange={handleTestChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              name="description"
              rows="3"
              value={testData.description}
              onChange={handleTestChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                name="duration"
                value={testData.duration}
                onChange={handleTestChange}
                required
              />
            </div>

            {/* ATTEMPT SETTINGS [cite: 2] */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Attempts</label>
              <div className="flex gap-4 items-center h-10">
                {['ONCE', 'LIMITED', 'UNLIMITED'].map((type) => (
                  <label key={type} className="flex items-center gap-1 text-sm cursor-pointer">
                    <input
                      type="radio"
                      className="accent-blue-600"
                      checked={attemptType === type}
                      onChange={() => { setAttemptType(type); markDirty(); }}
                    />
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
              {attemptType === 'LIMITED' && (
                <div className="mt-2 flex items-center gap-2 animate-fadeIn">
                  <span className="text-sm text-gray-500">Max:</span>
                  <input
                    type="number"
                    min={1}
                    className="w-20 border rounded p-1 text-center"
                    value={maxAttempts}
                    onChange={(e) => { setMaxAttempts(Number(e.target.value)); markDirty(); }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SCHEDULING WITH "OK" BUTTONS [cite: 2] */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (Local)</label>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded pr-14 focus:ring-2 focus:ring-blue-500 outline-none"
                name="scheduledStart"
                value={testData.scheduledStart}
                onChange={(e) => { handleTestChange(e); setShowStartOk(true); }}
              />
              {showStartOk && (
                <button
                  type="button"
                  className="absolute right-1 top-7 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-sm hover:bg-green-700"
                  onClick={() => setShowStartOk(false)}
                >
                  OK
                </button>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (Local)</label>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded pr-14 focus:ring-2 focus:ring-blue-500 outline-none"
                name="scheduledEnd"
                value={testData.scheduledEnd}
                onChange={(e) => { handleTestChange(e); setShowEndOk(true); }}
              />
              {showEndOk && (
                <button
                  type="button"
                  className="absolute right-1 top-7 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-sm hover:bg-green-700"
                  onClick={() => setShowEndOk(false)}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QUESTIONS SECTION */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Questions ({questions.length})</h2>

          {questions.map((q, qi) => (
            <div key={qi} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 relative group animate-fadeIn">
              <button
                type="button"
                onClick={() => removeQuestion(qi)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white flex items-center justify-center"
                title="Remove Question"
              >
                🗑️
              </button>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Question {qi + 1}</label>
                <input
                  className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-400 outline-none bg-gray-50 focus:bg-white"
                  placeholder="Enter question text..."
                  value={q.text}
                  onChange={(e) => handleQuestionChange(qi, 'text', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 mb-4">
                <label className="block text-xs font-bold text-gray-400 uppercase">Options</label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <span className="text-gray-400 font-mono text-sm w-4">{String.fromCharCode(65 + oi)}</span>
                    <input
                      className="grow p-2 border rounded text-sm outline-none focus:border-blue-400"
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(qi, oi, e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="text-gray-300 hover:text-red-500 transition"
                      onClick={() => removeOption(qi, oi)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-blue-600 text-xs font-semibold hover:underline mt-1 ml-6"
                  onClick={() => addOption(qi)}
                >
                  + Add Option
                </button>
              </div>

              <div className="pt-4 border-t">
                <label className="block text-xs font-bold text-green-600 uppercase mb-2">Set Correct Answer</label>
                <select
                  className="w-full p-2 border rounded bg-green-50 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  value={q.correctAnswer}
                  onChange={(e) => handleQuestionChange(qi, 'correctAnswer', e.target.value)}
                  required
                >
                  <option value="">-- Select the correct option --</option>
                  {q.options.map((opt, oi) => (
                    <option key={oi} value={opt}>
                      {opt || `Option ${oi + 1} (Empty)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-blue-400 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> Add New Question
          </button>
        </div>

        {/* FINAL ACTION BUTTONS [cite: 2] */}
        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => {
              if (!hasUnsavedChanges || window.confirm('You have unsaved changes. Discard them?')) {
                navigate('/dashboard');
              }
            }}
            className="w-1/3 bg-gray-100 py-3 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-2/3 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition transform active:scale-95"
          >
            Create Test
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTestPage;