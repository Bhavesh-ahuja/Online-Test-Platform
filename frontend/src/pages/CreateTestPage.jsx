import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateTestPage() {
  const navigate = useNavigate();
  
  // State for Test Details
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30
  });

  // State for Questions
  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', '', '', ''], correctAnswer: '' }
  ]);

  // Helper: Update Test Details
  const handleTestChange = (e) => {
    setTestData({ ...testData, [e.target.name]: e.target.value });
  };

  // Helper: Update a specific Question
  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  // Helper: Update an Option inside a Question
  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  // Helper: Add a new blank question
  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'MCQ', options: ['', '', '', ''], correctAnswer: '' }]);
  };

  // Submit to Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

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
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Info Section */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Test Details</h2>
          <input
            className="w-full p-2 border rounded"
            placeholder="Test Title (e.g. React Basics)"
            name="title"
            required
            value={testData.title}
            onChange={handleTestChange}
          />
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Description"
            name="description"
            value={testData.description}
            onChange={handleTestChange}
          />
          <div>
            <label className="block text-sm text-gray-600">Duration (minutes)</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              name="duration"
              required
              value={testData.duration}
              onChange={handleTestChange}
            />
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative">
              <h3 className="font-medium mb-2">Question {qIndex + 1}</h3>
              
              <input
                className="w-full p-2 border rounded mb-3"
                placeholder="Question Text"
                value={q.text}
                required
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
              />

              {/* Options (Hardcoded to 4 for simplicity) */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {q.options.map((opt, oIndex) => (
                  <input
                    key={oIndex}
                    className="p-2 border rounded bg-gray-50"
                    placeholder={`Option ${oIndex + 1}`}
                    value={opt}
                    required
                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                  />
                ))}
              </div>

              {/* Correct Answer */}
              <input
                className="w-full p-2 border rounded border-green-200 bg-green-50"
                placeholder="Correct Answer (Must match one option exactly)"
                value={q.correctAnswer}
                required
                onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={addQuestion} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            + Add Question
          </button>
          <button type="submit" className="grow px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Save Test
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTestPage;