import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config';  // Adjust path (../ or ./) based on file location

function AdminResultsPage() {
  const { id } = useParams(); // Test ID
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'

  useEffect(() => {
    const fetchSubmissions = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      try {
        const response = await fetch(`${API_BASE_URL}/api/tests/${id}/submissions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch submissions');
        const data = await response.json();
        setSubmissions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [id, navigate]);

  // Sorting Logic
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (sortOrder === 'desc') return b.score - a.score;
    return a.score - b.score;
  });

  // Badge Logic
  const getStatusBadge = (status) => {
    switch (status) {
      case 'TERMINATED':
        return <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-red-400">TERMINATED (Malpractice)</span>;
      case 'TIMEOUT':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-yellow-400">TIMEOUT</span>;
      default:
        return <span className="bg-green-100 text-green-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-green-400">COMPLETED</span>;
    }
  };

  if (loading) return <div className="text-center mt-10">Loading data...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Test Results</h1>
        <Link to="/dashboard" className="text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      <div className="mb-4 flex justify-end">
        <select 
          className="p-2 border rounded shadow-sm bg-white"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="desc">Sort by Score (High to Low)</option>
          <option value="asc">Sort by Score (Low to High)</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSubmissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sub.student.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-bold">{sub.score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(sub.status)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(sub.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link to={`/results/${sub.id}`} className="text-indigo-600 hover:text-indigo-900">View Full Answer</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSubmissions.length === 0 && (
          <div className="p-6 text-center text-gray-500">No submissions yet.</div>
        )}
      </div>
    </div>
  );
}

export default AdminResultsPage;
