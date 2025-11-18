import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function ResultsPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/tests/results/${submissionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 404) throw new Error('Results not found');
        if (!response.ok) throw new Error('Failed to fetch results');

        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [submissionId, navigate]);

  if (loading) return <div className="text-center mt-10">Loading Results...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;
  if (!result) return null;

  //   Helper to detemine tailwind classes
  const getAnswerClass = (answer, option) => {
    const isSelected = answer.slectedAnswer === option;
    const isCorrect = answer.question.correctAnswer === option;

    if (isCorrect) {
      return 'bg-green-100 border-green-300'; // Always show correct answer
    }
    if (isSelected && !answer.isCorrect) {
      return 'bg-red-100 border-red-300'; // Show user's wrong choice
    }
    return 'bg-gray-50 border-gray-200'; // Default
  };


  return (
    <div className="container mx-auto p-6 max-w-3xl">
      {/* Score Header */}
      <div className="bg-white p-8 rounded-lg shadow-md mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Results for {result.test.title}</h1>
        <p className="text-5xl font-extrabold text-blue-600">
          {result.score} / {result.test._count.questions}
        </p>
        <p className="text-gray-600 mt-2">
          You scored {((result.score / result.test._count.questions) * 100).toFixed(0)}%
        </p>
      </div>

      {/* Detailed Answers */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Detailed Review</h2>
        {result.answers.map((answer, index) => (
          <div key={answer.id} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">
              Question {index + 1}: {answer.question.text}
            </h3>

            <div className="space-y-2">
              {answer.question.options.map((option, oIndex) => (
                <div
                  key={oIndex}
                  className={`p-3 rounded-lg border ${getAnswerClass(answer, option)}`}
                >
                  {option}
                  {answer.question.correctAnswer === option && <span className="font-bold ml-2">(Correct)</span>}
                  {answer.selectedAnswer === option && !answer.isCorrect && <span className="font-bold ml-2">(Your Answer)</span>}
                </div>
              ))}
            </div>

            {!answer.isCorrect && (
              <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
                <strong>Correct Answer:</strong> {answer.question.correctAnswer}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link to="/dashboard" className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default ResultsPage;
