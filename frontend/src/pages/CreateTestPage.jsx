import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../utils/authFetch';

function CreateTestPage() {
  const navigate = useNavigate();

  // State for Test Details
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    showResult: true,
    scheduledStart: '',
    scheduledEnd: '',
    type: 'STANDARD', // 'STANDARD' | 'SWITCH'
    // For Switch
    switchConfig: {
      durationSeconds: 360,
      maxLevel: 5
    }
  });

  // Default start with one empty question
  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }
  ]);

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'questions'
  const [isUploading, setIsUploading] = useState(false);
  const [attemptType, setAttemptType] = useState('ONCE');
  const [maxAttempts, setMaxAttempts] = useState(1);

  // --- Helpers ---
  const handleTestChange = (e) => {
    setTestData({ ...testData, [e.target.name]: e.target.value });
  };

  // --- Question Management (Standard Only) ---
  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }]);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      alert("Test must have at least one question.");
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const handleQuestionKeyDown = (e, qi) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow default behavior (new line in textarea)
        return;
      } else {
        // Prevent new line and move to next field
        e.preventDefault();
        // Target the first option input of the current question index
        const nextField = document.querySelector(`input[name="q-${qi}-opt-0"]`);
        if (nextField) nextField.focus();
      }
    }
  };

  // --- Option Management ---
  const addOption = (qi) => {
    const newQuestions = [...questions];
    newQuestions[qi].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (qi, oIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qi].options.length <= 2) {
      alert("MCQ must have at least 2 options.");
      return;
    }
    newQuestions[qi].options.splice(oIndex, 1);
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qi, oi, value) => {
    const copy = [...questions];
    if (copy[qi].correctAnswer === copy[qi].options[oi]) {
      copy[qi].correctAnswer = value;
    }
    copy[qi].options[oi] = value;
    setQuestions(copy);
  };

  // --- PDF Auto-Import Feature ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await authFetch('/api/tests/upload-pdf', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload PDF');

      if (questions.length === 1 && questions[0].text === '') {
        setQuestions(data.questions);
      } else {
        if (window.confirm(`Found ${data.questions.length} questions. Append them?`)) {
          setQuestions([...questions, ...data.questions]);
        }
      }
      alert(`Successfully imported ${data.questions.length} questions! Review them below.`);
    } catch (error) {
      alert("Import Error: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrors([]);

    // Standard Validation
    if (testData.type === 'STANDARD') {
      for (const q of questions) {
        if (!q.text || q.text.trim() === '') {
          alert('Question text cannot be empty');
          return;
        }
        if (!q.correctAnswer) {
          alert(`Question "${q.text.substring(0, 20)}..." is missing a correct answer`);
          return;
        }
        if (q.type === 'MCQ' && q.options.length < 2) {
          alert("All MCQ questions must have at least 2 options.");
          return;
        }
      }
    }

    try {
      const payload = {
        ...testData,
        duration: parseInt(testData.duration, 10) || 30, // Fallback to 30 if NaN
        scheduledStart: testData.scheduledStart ? new Date(testData.scheduledStart).toISOString() : null,
        scheduledEnd: testData.scheduledEnd ? new Date(testData.scheduledEnd).toISOString() : null,
        maxAttempts: maxAttempts ? parseInt(maxAttempts, 10) : null,
        attemptType,
        questions: testData.type === 'STANDARD' ? questions : [], // Empty questions for Switch

        // Sync Switch Config Duration
        switchConfig: testData.type === 'SWITCH' ? {
          ...testData.switchConfig,
          durationSeconds: parseInt(testData.duration, 10) * 60
        } : undefined
      };

      const res = await authFetch('/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          setErrors(data.details);
          window.scrollTo(0, 0); // Scroll to top to see errors
        } else {
          setError(data.error || 'Failed to create test');
          window.scrollTo(0, 0);
        }
        return;
      }

      alert('Test Created Successfully!');
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Create New Assessment</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Error Banner */}
        {(error || errors.length > 0) && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">There were errors with your submission</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error && <p>{error}</p>}
                  {errors.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TYPE SELECTION (Dropdown + Info Card) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">

          <div>
            <label className="block text-gray-700 font-bold mb-2">Assessment Type</label>
            <div className="relative">
              <select
                value={testData.type}
                onChange={(e) => setTestData({ ...testData, type: e.target.value })}
                className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 pr-10 hover:bg-white transition-colors cursor-pointer"
              >
                <option value="STANDARD">📝 Standard Test (MCQ/Short Answer)</option>
                <option value="SWITCH">🔄 AON Switch Challenge (Cognitive Game)</option>
                {/* Future options can be easily added here */}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          </div>

          {/* Dynamic Info Card */}
          <div className={`p-4 rounded-lg border flex gap-4 items-start transition-all duration-300 ${testData.type === 'STANDARD'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-purple-50 border-purple-200 text-purple-900'
            }`}>
            <div className="text-3xl shrink-0">
              {testData.type === 'STANDARD' ? '📝' : '🔄'}
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">
                {testData.type === 'STANDARD' ? 'Standard Assessment' : 'AON Switch Challenge'}
              </h3>
              <p className="text-sm opacity-90 leading-relaxed">
                {testData.type === 'STANDARD'
                  ? 'Create a traditional quiz with custom questions. Supports Multiple Choice and Short Answer formats. Perfect for knowledge verification and exams.'
                  : 'An adaptive cognitive game based on the AON Switch Challenge. Tests logical reasoning and reaction speed using automatically generated shape-matching puzzles.'}
              </p>
            </div>
          </div>
        </div>

        {/* TABS (Only for Standard) */}
        {testData.type === 'STANDARD' && (
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Test Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'questions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Manage Questions ({questions.length})
            </button>
          </div>
        )}

        {/* DETAILS SECTION */}
        {(testData.type === 'SWITCH' || activeTab === 'details') && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4 animate-fadeIn">
            <input className="w-full p-2 border rounded" placeholder="Test Title" name="title" required value={testData.title} onChange={handleTestChange} />
            <textarea className="w-full p-2 border rounded" placeholder="Description" name="description" value={testData.description} onChange={handleTestChange} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input type="number" min="1" className="w-full p-2 border rounded" name="duration" value={testData.duration} onChange={handleTestChange} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Attempts</label>
                <div className="flex gap-4 items-center">
                  {['ONCE', 'LIMITED', 'UNLIMITED'].map((type) => (
                    <label key={type} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="radio" className="accent-blue-600" checked={attemptType === type} onChange={() => setAttemptType(type)} />
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
                {attemptType === 'LIMITED' && (
                  <input type="number" min={1} className="w-20 border rounded p-1 mt-2" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledStart" value={testData.scheduledStart} onChange={handleTestChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledEnd" value={testData.scheduledEnd} onChange={handleTestChange} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="showResult"
                checked={testData.showResult}
                onChange={(e) =>
                  setTestData({ ...testData, showResult: e.target.checked })
                }
              />
              <label htmlFor="showResult">
                Show result immediately after submission
              </label>
            </div>

            {testData.type === 'SWITCH' && (
              <div className="bg-purple-50 p-4 rounded text-sm text-purple-800">
                <h4 className="font-bold mb-1">Switch Challenge Configuration</h4>
                <p>This test will use the adaptive engine. Duration is set to 6 minutes by default but depends on the main timer.</p>
              </div>
            )}
          </div>
        )}

        {/* QUESTIONS SECTION (STANDARD ONLY) */}
        {testData.type === 'STANDARD' && activeTab === 'questions' && (
          <div className="space-y-6 animate-fadeIn">
            {/* PDF UPLOAD */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-800">Auto-Import from PDF</h3>
                <p className="text-xs text-blue-600">Upload a quiz PDF to auto-generate questions.</p>
              </div>
              <div className="relative">
                <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50">
                  {isUploading ? 'Processing...' : 'Upload PDF'}
                </button>

              </div>


            </div>



            {/* QUESTION LIST */}
            {questions.map((q, qi) => (
              <div key={qi} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 relative group">
                <button type="button" onClick={() => removeQuestion(qi)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 font-bold text-xl">×</button>


                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    Question {qi + 1}
                  </label>
                  <textarea
                    className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-400 outline-none bg-gray-50 focus:bg-white resize-none"
                    placeholder="Enter question text... "
                    value={q.text}
                    onChange={(e) => handleQuestionChange(qi, 'text', e.target.value)}
                    onKeyDown={(e) => handleQuestionKeyDown(e, qi)}
                    required
                  />
                </div>

                <div className="space-y-2 mb-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase">Options</label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2 items-center">
                      <span className="text-gray-400 font-mono text-sm w-4">{String.fromCharCode(65 + oi)}</span>
                      <input
                        name={`q-${qi}-opt-${oi}`} // Add this name attribute
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

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-1">Correct Answer</label>
                  <select className="w-full p-2 border rounded bg-green-50 text-sm" value={q.correctAnswer} onChange={(e) => handleQuestionChange(qi, 'correctAnswer', e.target.value)} required>
                    <option value="">-- Select Correct Option --</option>
                    {q.options.map((opt, oi) => (
                      <option key={oi} value={opt}>{opt || `Option ${oi + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button type="button" onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-blue-400 hover:text-blue-500">
              + Add New Question
            </button>
          </div>
        )}

        {/* SUBMIT */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
          <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transform active:scale-95 transition-all">
            Create Test
          </button>
        </div>

      </form>
    </div>
  );
}

export default CreateTestPage;