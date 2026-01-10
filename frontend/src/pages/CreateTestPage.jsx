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
    scheduledEnd: ''
  });

  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }
  ]);

  const handleTestChange = (e) =>
    setTestData({ ...testData, [e.target.name]: e.target.value });

  const handleQuestionChange = (i, f, v) => {
    const q = [...questions];
    q[i][f] = v;
    setQuestions(q);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:8000/api/tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...testData,
          scheduledStart: localToUtc(testData.scheduledStart),
          scheduledEnd: localToUtc(testData.scheduledEnd),
          questions
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
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <input
            className="w-full p-2 border rounded"
            placeholder="Test Title"
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

          <input
            type="number"
            className="w-full p-2 border rounded"
            name="duration"
            required
            value={testData.duration}
            onChange={handleTestChange}
          />

          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            name="scheduledStart"
            value={testData.scheduledStart}
            onChange={handleTestChange}
          />

          <input
            type="datetime-local"
            className="w-full p-2 border rounded"
            name="scheduledEnd"
            value={testData.scheduledEnd}
            onChange={handleTestChange}
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Test
        </button>
      </form>
    </div>
  );
}

export default CreateTestPage;
