import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { utcToLocal, localToUtc } from '../utils/datetime';

function EditTestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    scheduledStart: '',
    scheduledEnd: '',
  });

  const [questions, setQuestions] = useState([]);

  // UI-only state
  const [showStartOk, setShowStartOk] = useState(false);
  const [showEndOk, setShowEndOk] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      const token = localStorage.getItem('token');

      try {
        const res = await fetch(
          `http://localhost:8000/api/tests/${id}/admin`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error('Failed to fetch test');

        const data = await res.json();

        setTestData({
          title: data.title,
          description: data.description || '',
          duration: data.duration,
          scheduledStart: utcToLocal(data.scheduledStart),
          scheduledEnd: utcToLocal(data.scheduledEnd),
        });

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

  const handleTestChange = (e) => {
    setTestData({ ...testData, [e.target.name]: e.target.value });
  };

  const handleQuestionChange = (qi, field, value) => {
    const copy = [...questions];
    copy[qi][field] = value;
    setQuestions(copy);
  };

  const handleOptionChange = (qi, oi, value) => {
    const copy = [...questions];
    copy[qi].options[oi] = value;
    setQuestions(copy);
  };

  const addOption = (qi) => {
    const copy = [...questions];
    copy[qi].options.push('');
    setQuestions(copy);
  };

  const removeOption = (qi, oi) => {
    const copy = [...questions];
    if (copy[qi].options.length <= 2) return;
    copy[qi].options.splice(oi, 1);
    setQuestions(copy);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(
        `http://localhost:8000/api/tests/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...testData,
            scheduledStart: localToUtc(testData.scheduledStart),
            scheduledEnd: localToUtc(testData.scheduledEnd),
            questions,
          }),
        }
      );

      if (!res.ok) throw new Error('Failed to update test');

      alert('Test updated successfully');
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Edit Test</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* TEST DETAILS */}
        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-xl font-semibold">Test Details</h2>

          <input
            className="w-full p-2 border rounded"
            name="title"
            value={testData.title}
            onChange={handleTestChange}
            required
          />

          {/* ✅ Description with placeholder / blur */}
          <textarea
            className="w-full p-2 border rounded"
            name="description"
            placeholder="Description"
            value={testData.description}
            onChange={handleTestChange}
          />

          <input
            type="number"
            className="w-full p-2 border rounded"
            name="duration"
            value={testData.duration}
            onChange={handleTestChange}
            required
          />

          {/* ===== START TIME (floating OK) ===== */}
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
              onFocus={() => setShowStartOk(true)}
            />

            {showStartOk && (
              <button
                type="button"
                className="absolute right-2 top-8 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                onClick={() => setShowStartOk(false)}
              >
                OK
              </button>
            )}
          </div>

          {/* ===== END TIME (floating OK) ===== */}
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
              onFocus={() => setShowEndOk(true)}
            />

            {showEndOk && (
              <button
                type="button"
                className="absolute right-2 top-8 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
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
            <div key={qi} className="bg-white p-6 rounded-lg shadow-md">
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

              <div className="mt-3 bg-green-50 border border-green-200 p-2 rounded">
                Correct Answer: <b>{q.correctAnswer}</b>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
        >
          Update Test
        </button>
      </form>
    </div>
  );
}

export default EditTestPage;
