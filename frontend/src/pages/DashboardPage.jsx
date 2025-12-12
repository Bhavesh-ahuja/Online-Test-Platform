import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';  // Adjust path (../ or ./) based on file location

function DashboardPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check role
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

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
        const response = await fetch('${API_BASE_URL}/api/tests', {
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
            {/* only if admin */}
            {isAdmin && (
              <Link to={`/tests/${test.id}/admin-results`} className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 transition text-center border border-gray-600">View Student Result</Link>
            )}
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