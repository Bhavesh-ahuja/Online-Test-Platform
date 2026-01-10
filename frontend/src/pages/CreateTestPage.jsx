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

  const [attemptType, setAttemptType] = useState('ONCE');
  const [maxAttempts, setMaxAttempts] = useState(1);

  const [questions, setQuestions] = useState([
    { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }
  ]);

  const handleTestChange = (e) =>
    setTestData({ ...testData, [e.target.name]: e.target.value });

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
          attemptType,
          maxAttempts: attemptType === 'LIMITED' ? maxAttempts : null,
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

          <input className="w-full p-2 border rounded"
            placeholder="Test Title"
            name="title"
            required
            value={testData.title}
            onChange={handleTestChange}
          />

          <textarea className="w-full p-2 border rounded"
            placeholder="Description"
            name="description"
            value={testData.description}
            onChange={handleTestChange}
          />

          <input type="number"
            className="w-full p-2 border rounded"
            name="duration"
            value={testData.duration}
            onChange={handleTestChange}
          />

          {/* ATTEMPT SETTINGS */}
          <div>
            <label className="font-semibold">Allowed Attempts</label>
            <div className="space-y-2 mt-2">
              <label>
                <input type="radio" checked={attemptType === 'ONCE'}
                  onChange={() => setAttemptType('ONCE')} /> One attempt
              </label>

              <label>
                <input type="radio" checked={attemptType === 'LIMITED'}
                  onChange={() => setAttemptType('LIMITED')} /> Limited
              </label>

              {attemptType === 'LIMITED' && (
                <input type="number" min={1}
                  className="border p-2 rounded w-full"
                  value={maxAttempts}
                  onChange={e => setMaxAttempts(e.target.value)}
                />
              )}

              <label>
                <input type="radio" checked={attemptType === 'UNLIMITED'}
                  onChange={() => setAttemptType('UNLIMITED')} /> Unlimited
              </label>
            </div>
          </div>

          <input type="datetime-local"
            className="w-full p-2 border rounded"
            name="scheduledStart"
            value={testData.scheduledStart}
            onChange={handleTestChange}
          />

          <input type="datetime-local"
            className="w-full p-2 border rounded"
            name="scheduledEnd"
            value={testData.scheduledEnd}
            onChange={handleTestChange}
          />
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded">
          Create Test
        </button>
      </form>
    </div>
  );
}

export default CreateTestPage;
