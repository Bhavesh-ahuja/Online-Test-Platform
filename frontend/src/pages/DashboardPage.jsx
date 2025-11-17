import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function DashboardPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // This "Effect" runs when the component loads
  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('token');
      // Security check: Redirect to login if no token
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/tests', {
          headers: {
            'Authorization': `Bearer ${token}` // Attach the ID badge
          }
        });

        if (!response.ok) throw new Error('Failed to fetch tests');

        const data = await response.json();
        setTests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [navigate]);

  if (loading) return <div className="text-center mt-10">Loading tests...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Available Tests</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => (
          <div key={test.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200 flex flex-col ">
            <h2 className="text-xl font-bold text-gray-800">{test.title}</h2>
            <p className="text-gray-600 mt-2 mb-4">{test.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>⏱ {test.duration} mins</span>
              <span>❓ {test._count?.questions || 0} Questions</span>
            </div>
            <Link to={`/test/${test.id}`} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition text-center"> Take Test </Link>
          </div>
        ))}

        {tests.length === 0 && (
          <p className="text-gray-500 col-span-3 text-center">No tests available yet.</p>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;