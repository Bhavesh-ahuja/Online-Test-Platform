import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { utcToLocal, localToUtc } from '../utils/datetime';
import { API_BASE_URL } from '../../config';

function EditTestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // --- State Management ---
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Test Data State
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    scheduledStart: '',
    scheduledEnd: ''
  });

  const [questions, setQuestions] = useState([]);

  // Attempt Configuration State
  const [attemptType, setAttemptType] = useState('ONCE');
  const [maxAttempts, setMaxAttempts] = useState(1);

  // UI State for Time Pickers
  const [showStartOk, setShowStartOk] = useState(false);
  const [showEndOk, setShowEndOk] = useState(false);

  // --- Fetch Existing Data ---
  useEffect(() => {
    const fetchTest = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/tests/${id}/admin`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error('Failed to fetch test');

        const data = await res.json();
        // Format dates for input[type="datetime-local"] (YYYY-MM-DDTHH:mm)
        const formatDate = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toISOString().slice(0, 16);
        };

        // Map data and convert UTC from DB to Local for the input fields
        setTestData({
          title: data.title,
          description: data.description || '',
          duration: data.duration,
          scheduledStart: formatDate(data.scheduledStart),
          scheduledEnd: formatDate(data.scheduledEnd)
        });

        // Load Attempt Config
        setAttemptType(data.attemptType || 'ONCE');
        setMaxAttempts(data.maxAttempts || 1);
        setQuestions(data.questions);
      } catch (err) {
        alert(err.message);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [id, navigate]);

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

    // Sync correctAnswer if the text of the currently selected correct option is being edited
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
  const handleTestChange = (e) => setTestData({ ...testData, [e.target.name]: e.target.value });

  // (Keep Question/Option Handlers exactly the same as CreatePage)
  const handleQuestionChange = (index, field, value) => { const newQuestions = [...questions]; newQuestions[index][field] = value; setQuestions(newQuestions); };
  const addQuestion = () => setQuestions([...questions, { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }]);
  const removeQuestion = (index) => { if (questions.length === 1) return alert("Min 1 question."); setQuestions(questions.filter((_, i) => i !== index)); };
  const handleOptionChange = (qIndex, oIndex, value) => { const newQuestions = [...questions]; newQuestions[qIndex].options[oIndex] = value; setQuestions(newQuestions); };
  const addOption = (qIndex) => { const newQuestions = [...questions]; newQuestions[qIndex].options.push(''); setQuestions(newQuestions); };
  const removeOption = (qIndex, oIndex) => { const newQuestions = [...questions]; if (newQuestions[qIndex].options.length <= 2) return alert("Min 2 options."); newQuestions[qIndex].options.splice(oIndex, 1); setQuestions(newQuestions); };

  // --- Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation logic
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

    const invalidMCQ = questions.find(q => q.type === 'MCQ' && q.options.length < 2);
    if (invalidMCQ) return alert("All MCQ questions must have at least 2 options.");

    try {
      const res = await fetch(`${API_BASE_URL}/api/tests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

      if (!response.ok) throw new Error('Failed to update test.');

      alert('Test Updated Successfully!');
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading Test Data...</div>;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Edit Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* --- TEST DETAILS SECTION --- */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Test Details</h2>
          <input className="w-full p-2 border rounded" placeholder="Test Title" name="title" required value={testData.title} onChange={handleTestChange} />
          <textarea className="w-full p-2 border rounded" placeholder="Description" name="description" value={testData.description} onChange={handleTestChange} />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Duration (minutes)</label>
              <input type="number" className="w-full p-2 border rounded" name="duration" required value={testData.duration} onChange={handleTestChange} />
            </div>
            
            {/* --- NEW SCHEDULED FIELDS --- */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Window</label>
              <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledStart" value={testData.scheduledStart} onChange={handleTestChange} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Window</label>
              <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledEnd" value={testData.scheduledEnd} onChange={handleTestChange} />
            </div>
          </div>
        </div>

        {/* --- QUESTIONS SECTION --- */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Questions ({questions.length})</h2>

          {questions.map((q, qi) => (
            <div key={qi} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 relative group">
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
                  value={q.text}
                  onChange={(e) =>
                    handleQuestionChange(qi, 'text', e.target.value)
                  }
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
                      onChange={(e) =>
                        handleOptionChange(qi, oi, e.target.value)
                      }
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
                  onChange={(e) =>
                    handleQuestionChange(qi, 'correctAnswer', e.target.value)
                  }
                  required
                >
                  <option value="">-- Select correct answer --</option>
                  {q.options.map((opt, oi) => (
                    <option key={oi} value={opt}>
                      {opt || `Option ${oi + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <input className="w-full p-2 border rounded border-green-200 bg-green-50" placeholder="Correct Answer" value={q.correctAnswer} required onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)} />
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

        {/* --- FINAL ACTION BUTTONS --- */}
        <div className="flex gap-4 pt-6">
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
            className="w-1/3 bg-gray-100 py-3 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-2/3 bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition transform active:scale-95"
          >
            Update Test
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditTestPage;