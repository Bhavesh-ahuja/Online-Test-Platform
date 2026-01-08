import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config'; // ✅ FROM 1st VERSION
import Modal from '../components/Modal';

function DashboardPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  // 1. Fetch Tests
  const fetchTests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    try {
      const response = await fetch(`${API_BASE_URL}/api/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  useEffect(() => {
    fetchTests();
  }, [navigate]);

  // 2. Handle Delete Click (Opens Modal)
  const confirmDelete = (test) => {
    setTestToDelete(test);
    setIsDeleteModalOpen(true);
  };

  // 3. Perform Actual Delete
  const handleDelete = async () => {
    if (!testToDelete) return;

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tests/${testToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete test');
      }

      // Success: Remove from UI and close modal
      setTests(tests.filter(t => t.id !== testToDelete.id));
      setIsDeleteModalOpen(false);
      setTestToDelete(null);

    } catch (err) {
      alert(err.message);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading tests...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Available Tests</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tests.map((test) => (
          <div
            key={test.id}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200 flex flex-col"
          >
            <h2 className="text-xl font-bold text-gray-800">{test.title}</h2>
            <p className="text-gray-600 mt-2 mb-4 grow">
              {test.description}
            </p>

            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>⏱ {test.duration} mins</span>
              <span>❓ {test._count?.questions || 0} Questions</span>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to={`/test/${test.id}`}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition text-center"
              >
                Take Test
              </Link>

              {isAdmin && (
                <div className="flex gap-2">
                  <Link
                    to={`/tests/${test.id}/admin-results`}
                    className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-900 transition text-center border border-gray-600 text-sm flex items-center justify-center"
                  >
                    Results
                  </Link>

                  <Link
                    to={`/test/edit/${test.id}`}
                    className="bg-yellow-500 text-white py-2 px-3 rounded hover:bg-yellow-600 transition text-center"
                    title="Edit Test"
                  >
                    ✏️
                  </Link>

                  <button
                    onClick={() => confirmDelete(test)}
                    className="bg-red-500 text-white py-2 px-3 rounded hover:bg-red-600 transition text-center"
                    title="Delete Test"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {tests.length === 0 && (
          <p className="text-gray-500 col-span-3 text-center">
            No tests available yet.
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Test?"
        actions={
          <>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete{' '}
          <strong>{testToDelete?.title}</strong>?
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

export default DashboardPage;
