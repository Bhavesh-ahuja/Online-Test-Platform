import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { localToUtc } from '../utils/datetime';


function CreateTestPage() {
  const navigate = useNavigate();

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

  const [showStartOk, setShowStartOk] = useState(false);
  const [showEndOk, setShowEndOk] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // ATTEMPT CONFIG
  const [attemptType, setAttemptType] = useState('ONCE');
  const [maxAttempts, setMaxAttempts] = useState(1);

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
  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setIsUploading(true);
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(
      'http://localhost:8000/api/tests/upload-pdf',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload PDF');

    // If only one empty question exists → replace
    if (questions.length === 1 && questions[0].text.trim() === '') {
      setQuestions(data.questions);
    } else {
      if (
        window.confirm(
          `Found ${data.questions.length} questions. Append them to existing questions?`
        )
      ) {
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

  const handleOptionChange = (qi, oi, value) => {
    const copy = [...questions];

    if (copy[qi].correctAnswer === copy[qi].options[oi]) {
      copy[qi].correctAnswer = value;
    }

    copy[qi].options[oi] = value;
    setQuestions(copy);
    markDirty();
  };

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
    setQuestions([
      ...questions,
      { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' },
    ]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const q of questions) {
      if (!q.text || q.text.trim() === '') {
        alert('Question text cannot be empty');
        return;
      }
      if (!q.correctAnswer) {
        alert('Each question must have a correct answer');
        return;
      }
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:8000/api/tests', {
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
      <h1 className="text-3xl font-bold mb-6">Create Test</h1>
        {/* --- AI PDF IMPORT SECTION --- */}
<div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-8 flex flex-col sm:flex-row items-center justify-between shadow-sm">
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
        ${
          isUploading
            ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
        }`}
    >
      {isUploading ? 'Processing…' : '📂 Upload PDF'}
    </button>
  </div>
</div>
 
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TEST DETAILS */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Test Details</h2>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Test Name
            </label>
            <input
              className="w-full p-2 border rounded"
              name="title"
              value={testData.title}
              onChange={handleTestChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Description
            </label>
            <textarea
              className="w-full p-2 border rounded"
              name="description"
              placeholder="Description"
              value={testData.description}
              onChange={handleTestChange}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              className="w-full p-2 border rounded"
              name="duration"
              value={testData.duration}
              onChange={handleTestChange}
              required
            />
          </div>
          {/* ATTEMPT SETTINGS */}
<div className="mt-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Allowed Attempts
  </label>

  <div className="flex gap-6 items-center">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={attemptType === 'ONCE'}
        onChange={() => setAttemptType('ONCE')}
      />
      One attempt
    </label>

    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={attemptType === 'LIMITED'}
        onChange={() => setAttemptType('LIMITED')}
      />
      Limited
    </label>

    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={attemptType === 'UNLIMITED'}
        onChange={() => setAttemptType('UNLIMITED')}
      />
      Unlimited
    </label>
  </div>

  {attemptType === 'LIMITED' && (
    <input
      type="number"
      min={1}
      className="mt-2 w-32 border rounded p-2"
      value={maxAttempts}
      onChange={(e) => setMaxAttempts(Number(e.target.value))}
    />
  )}
</div>


          {/* START TIME */}
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded pr-16"
              name="scheduledStart"
              value={testData.scheduledStart}
              onChange={(e) => {
                handleTestChange(e);
                setShowStartOk(true);
              }}
            />
            {showStartOk && (
              <button
                type="button"
                className="absolute right-2 top-8 px-3 py-1 bg-green-600 text-white text-sm rounded"
                onClick={() => setShowStartOk(false)}
              >
                OK
              </button>
            )}
          </div>

          {/* END TIME */}
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded pr-16"
              name="scheduledEnd"
              value={testData.scheduledEnd}
              onChange={(e) => {
                handleTestChange(e);
                setShowEndOk(true);
              }}
            />
            {showEndOk && (
              <button
                type="button"
                className="absolute right-2 top-8 px-3 py-1 bg-green-600 text-white text-sm rounded"
                onClick={() => setShowEndOk(false)}
              >
                OK
              </button>
            )}
          </div>
        </div>

        {/* QUESTIONS */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Questions</h2>

          {questions.map((q, qi) => (
            <div key={qi} className="bg-white p-6 rounded-lg shadow-md relative">
              <button
                type="button"
                onClick={() => removeQuestion(qi)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
              >
                🗑️
              </button>

              <label className="block text-sm text-gray-600 mb-1">
                Question {qi + 1}
              </label>
              <input
                className="w-full p-2 border rounded mb-3"
                value={q.text}
                onChange={(e) =>
                  handleQuestionChange(qi, 'text', e.target.value)
                }
              />

              {q.options.map((opt, oi) => (
                <div key={oi} className="flex gap-2 mb-2">
                  <input
                    className="grow p-2 border rounded"
                    placeholder={`Option ${oi + 1}`}
                    value={opt}
                    onChange={(e) =>
                      handleOptionChange(qi, oi, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => removeOption(qi, oi)}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="text-blue-600 text-sm"
                onClick={() => addOption(qi)}
              >
                + Add Option
              </button>

              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">
                  Correct Answer
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={q.correctAnswer}
                  onChange={(e) =>
                    handleQuestionChange(qi, 'correctAnswer', e.target.value)
                  }
                  required
                >
                  <option value="">Select correct answer</option>
                  {q.options.map((opt, oi) => (
                    <option key={oi} value={opt}>
                      {opt || `Option ${oi + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            + Add Question
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              if (
                !hasUnsavedChanges ||
                window.confirm('You have unsaved changes. Discard them?')
              ) {
                navigate('/dashboard');
              }
            }}
            className="w-1/3 bg-gray-200 py-3 rounded hover:bg-gray-300 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-2/3 bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
          >
            Create Test
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTestPage;
