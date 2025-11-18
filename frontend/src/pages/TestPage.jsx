import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// This is the new page to take a test
function TestPage() {
  const { id } = useParams(); // Read the ':id' from the URL
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // This state will hold the student's answers
  // We'll store it as an object: { questionId: "selectedAnswer" }
  const [answers, setAnswers] = useState({});

  // 1. Fetch the test questions when the page loads
  useEffect(() => {
    const fetchTest = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/tests/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) throw new Error('Test not found');
        if (!response.ok) throw new Error('Failed to fetch test');
        
        const data = await response.json();
        setTest(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [id, navigate]);

  // 2. Handle when a student selects an answer
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value
    }));
  };

  // 3. Handle submission 
  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    if(!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/tests/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answers })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit');

      // Success! Navigate to the new results page
      alert('Test submitted successfully!');
      navigate(`/results/${data.submissionId}`);
    } catch (err) {
      setError(err.message);
      alert('Error submitting test: ' + err.message);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading Test...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Test Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-3xl font-bold mb-2">{test?.title}</h1>
        <p className="text-gray-600 mb-4">{test?.description}</p>
        <div className="text-blue-600 font-semibold">
          Time Limit: {test?.duration} minutes
        </div>
      </div>

      {/* Questions Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="space-y-6">
          {test?.questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">
                Question {index + 1}: {q.text}
              </h3>
              
              {/* Render options as radio buttons */}
              <div className="space-y-2">
                {q.options.map((option, oIndex) => (
                  <label key={oIndex} className="flex items-center p-3 rounded-lg border border-gray-200 has-checked:bg-blue-50 has-checked:border-blue-400 cursor-pointer">
                    <input
                      type="radio"
                      name={`question_${q.id}`}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => handleAnswerChange(q.id, option)}
                      className="mr-3"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 transition"
          >
            Submit Test
          </button>
        </div>
      </form>
    </div>
  );
}

export default TestPage;