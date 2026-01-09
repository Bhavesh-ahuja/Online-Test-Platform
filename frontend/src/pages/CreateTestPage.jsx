// CreateTestPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config'; // Adjust path (../ or ./) based on file location

function CreateTestPage() {
  const navigate = useNavigate();

  // State for Test Details
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    scheduledStart: '',
    scheduledEnd: '',
  });

  // Default start with one empty question
  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }
  ]);

  const [isUploading, setIsUploading] = useState(false);

  // Helper: Update Test Details
  const handleTestChange = (e) => {
    setTestData({ ...testData, [e.target.name]: e.target.value });
  };

  // --- Question Management ---
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

  // --- Option Management ---
  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length <= 2) {
      alert("MCQ must have at least 2 options.");
      return;
    }
    newQuestions[qIndex].options.splice(oIndex, 1);
    setQuestions(newQuestions);
  };

  // --- PDF Management ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:8000/api/tests/upload-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do not set Content-Type for FormData
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload PDF');

      // Logic: If the current form has only 1 empty question, replace it.
      // Otherwise, append the new questions to the bottom.
      if (questions.length === 1 && questions[0].text === '') {
        setQuestions(data.questions);
      } else {
        // Confirmation before appending
        if (window.confirm(`Found ${data.questions.length} questions. Append them to your existing list?`)) {
          setQuestions([...questions, ...data.questions]);
        }
      }

      alert(`Successfully imported ${data.questions.length} questions! Review them below.`);

    } catch (error) {
      alert("Import Error: " + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset input
    }
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // Validation: Check for empty options
    const invalidMCQ = questions.find(q => q.type === 'MCQ' && q.options.length < 2);
    if (invalidMCQ) {
      alert("All MCQ questions must have at least 2 options.");
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...testData,
          questions: questions
        })
      });

      if (!response.ok) throw new Error('Failed to create test');

      alert('Test Created Successfully!');
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Create New Test</h1>

      {/* --- AI IMPORT SECTION --- */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-8 flex flex-col sm:flex-row items-center justify-between shadow-sm">
        <div className="mb-4 sm:mb-0">
          <h3 className="font-bold text-blue-800 text-lg flex items-center">
            <span className="text-2xl mr-2">✨</span> Auto-Import
          </h3>
          <p className="text-sm text-blue-600 mt-1">
            Upload a PDF quiz. We'll extract questions & answers for you to review.
          </p>
        </div>
        <div className="relative group">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={isUploading}
          />
          <button
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow transition-all transform
              ${isUploading
                ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'}
            `}
          >
            {isUploading ? (
              <>Processing...</>
            ) : (
              <>
                <span>📂</span> Upload PDF
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Info */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Test Details</h2>
          <input className="w-full p-2 border rounded" placeholder="Test Title" name="title" required value={testData.title} onChange={handleTestChange} />
          <textarea className="w-full p-2 border rounded" placeholder="Description" name="description" value={testData.description} onChange={handleTestChange} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Duration (minutes)</label>
              <input type="number" className="w-full p-2 border rounded" name="duration" required value={testData.duration} onChange={handleTestChange} />
            </div>


            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Window (Optional)</label>
              <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledStart" value={testData.scheduledStart} onChange={handleTestChange} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Window (Optional)</label>
              <input type="datetime-local" className="w-full p-2 border rounded" name="scheduledEnd" value={testData.scheduledEnd} onChange={handleTestChange} />
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium bg-gray-100 px-3 py-1 rounded text-sm">Question {qIndex + 1}</h3>
                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
              </div>

              <input
                className="w-full p-3 border rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter Question Text"
                value={q.text}
                required
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
              />

              <div className="mb-4 pl-4 border-l-2 border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Options</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex gap-2 mb-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                      {String.fromCharCode(65 + oIndex)}
                    </div>
                    <input
                      className="grow p-2 border rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                      placeholder={`Option ${oIndex + 1}`}
                      value={opt}
                      required
                      onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                    />
                    <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-red-400 hover:text-red-600 px-2 text-lg">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIndex)} className="text-sm text-blue-600 hover:underline mt-1 ml-8">+ Add Option</button>
              </div>

              <div>
                <label className="text-xs font-bold text-green-600 uppercase block mb-1">Correct Answer</label>
                <input
                  className="w-full p-2 border rounded border-green-200 bg-green-50 focus:ring-1 focus:ring-green-500 outline-none"
                  placeholder="Paste the correct answer here (must match an option exactly)"
                  value={q.correctAnswer}
                  required
                  onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Make sure this text matches one of the options above exactly.</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <button type="button" onClick={addQuestion} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition">+ Add Blank Question</button>
          <button type="submit" className="grow px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg transition transform active:scale-95">Save Test</button>
        </div>
      </form>
    </div>
  );
}

export default CreateTestPage;
