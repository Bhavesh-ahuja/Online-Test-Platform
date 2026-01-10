import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function EditTestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    duration: 30,
    scheduledStart: '',
    scheduledEnd: ''
  });

  const [questions, setQuestions] = useState([]);

  // Load existing data
  useEffect(() => {
    const fetchTest = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`http://localhost:8000/api/tests/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch test');
        const data = await response.json();
        
        // Format dates for input[type="datetime-local"] (YYYY-MM-DDTHH:mm)
        const formatDate = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toISOString().slice(0, 16);
        };

        setTestData({
          title: data.title,
          description: data.description || '',
          duration: data.duration,
          scheduledStart: formatDate(data.scheduledStart),
          scheduledEnd: formatDate(data.scheduledEnd)
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

  const handleTestChange = (e) => setTestData({ ...testData, [e.target.name]: e.target.value });

  // (Keep Question/Option Handlers exactly the same as CreatePage)
  const handleQuestionChange = (index, field, value) => { const newQuestions = [...questions]; newQuestions[index][field] = value; setQuestions(newQuestions); };
  const addQuestion = () => setQuestions([...questions, { text: '', type: 'MCQ', options: ['', ''], correctAnswer: '' }]);
  const removeQuestion = (index) => { if (questions.length === 1) return alert("Min 1 question."); setQuestions(questions.filter((_, i) => i !== index)); };
  const handleOptionChange = (qIndex, oIndex, value) => { const newQuestions = [...questions]; newQuestions[qIndex].options[oIndex] = value; setQuestions(newQuestions); };
  const addOption = (qIndex) => { const newQuestions = [...questions]; newQuestions[qIndex].options.push(''); setQuestions(newQuestions); };
  const removeOption = (qIndex, oIndex) => { const newQuestions = [...questions]; if (newQuestions[qIndex].options.length <= 2) return alert("Min 2 options."); newQuestions[qIndex].options.splice(oIndex, 1); setQuestions(newQuestions); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const invalidMCQ = questions.find(q => q.type === 'MCQ' && q.options.length < 2);
    if (invalidMCQ) return alert("All MCQ questions must have at least 2 options.");

    try {
      const response = await fetch(`http://localhost:8000/api/tests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...testData, questions })
      });

      if (!response.ok) throw new Error('Failed to update test.');

      alert('Test Updated Successfully!');
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Edit Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Question {qIndex + 1}</h3>
                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700 text-sm">Remove Question</button>
              </div>
              
              <input className="w-full p-2 border rounded mb-3" placeholder="Question Text" value={q.text} required onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} />

              <div className="mb-3">
                <p className="text-sm font-semibold mb-2">Options</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex gap-2 mb-2">
                    <input className="grow p-2 border rounded bg-gray-50" placeholder={`Option ${oIndex + 1}`} value={opt} required onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} />
                    <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-red-500 px-2 hover:bg-red-50 rounded">×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIndex)} className="text-sm text-blue-600 hover:underline">+ Add Option</button>
              </div>

              <input className="w-full p-2 border rounded border-green-200 bg-green-50" placeholder="Correct Answer" value={q.correctAnswer} required onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={addQuestion} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">+ Add Question</button>
          <button type="submit" className="grow px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update Test</button>
        </div>
      </form>
    </div>
  );
}

export default EditTestPage;
