import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { authFetch } from "../utils/authFetch";
import { testsApi } from '../api/tests';

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
    // If we're not logged in, redirection might happen by authFetch or we check here
    if (!localStorage.getItem('token')) return navigate('/login');

    try {
      const data = await testsApi.getAll();
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
      const response = await authFetch(`/api/tests/${testToDelete.id}`, {
        method: "DELETE",
      });


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
              {/* SMART DASHBOARD LOGIC */}
              {(() => {
                const status = test.userStatus?.status;
                const submissionId = test.userStatus?.submissionId;
                const attempts = test.userStatus?.attemptCount || 0;

                const isResume = status === 'IN_PROGRESS';
                const isCompleted = ['COMPLETED', 'TIMEOUT', 'TERMINATED'].includes(status);
                const maxReached = test.attemptType === 'LIMITED' && attempts >= (test.maxAttempts || 1);

                // 1. RESUME
                if (isResume) {
                  return (
                    <button
                      onClick={() => {
                        if (test.type === 'SWITCH') {
                          navigate(`/switch-challenge/${test.id}`);
                        } else {
                          navigate(`/test/${test.id}`);
                        }
                      }}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      ▶ Resume Test
                    </button>
                  );
                }

                // 2. VIEW RESULTS
                if (isCompleted) {
                  return (
                    <div className="flex gap-2">
                      <Link
                        to={`/test/results/${submissionId}`}
                        className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition text-center flex items-center justify-center text-sm font-medium"
                      >
                        📊 View Results
                      </Link>

                      {!maxReached && (
                        <button
                          onClick={() => {
                            if (window.confirm("Start a new attempt?")) {
                              if (test.type === 'SWITCH') {
                                navigate(`/switch-challenge/${test.id}`);
                              } else {
                                navigate(`/test/${test.id}/instructions`);
                              }
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                          title="Start New Attempt"
                        >
                          ↻
                        </button>
                      )}
                    </div>
                  );
                }

                // 3. LOCKED
                if (maxReached) {
                  return (
                    <div className="w-full py-2 bg-gray-100 text-gray-500 rounded text-center text-sm font-medium cursor-not-allowed border border-gray-200">
                      🔒 Max Attempts Reached
                    </div>
                  );
                }

                // 4. START (Default)
                return (
                  <button
                    onClick={() => {
                      if (test.type === 'SWITCH') {
                        navigate(`/switch-challenge/${test.id}`);
                      } else {
                        navigate(`/test/${test.id}/instructions`);
                      }
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Start Test {test.type === 'SWITCH' && '🔄'}
                  </button>
                );
              })()}

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
