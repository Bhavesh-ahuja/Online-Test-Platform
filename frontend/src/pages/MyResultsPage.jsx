import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { authFetch } from "../utils/authFetch";


function MyResultsPage() {
    const [Submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSubmissions = async () => {
            const token = localStorage.getItem('token');
            if (!token) return navigate('/login');

            try {
                const response = await authFetch("/api/tests/my-submissions");

                if (!response.ok) throw new Error('Failed to fetch results');
                const data = await response.json();
                setSubmissions(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [navigate]);

    if (loading) return <div className="text-center mt-10">Loading history...</div>;
    if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">My Results History</h1>

            {Submissions.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <p className="text-gray-500 mb-4">You haven't taken any tests yet.</p>
                    <Link to="/dashboard" className="text-blue-600 hover:underline">Go to Dashboard</Link>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Submissions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Use Switch Result timestamp if available (Completion Time), else fallback to Start Time */}
                                        {new Date(sub.switchResult?.createdAt || sub.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {sub.test.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {sub.test.type === 'SWITCH' ? (
                                            <span className="font-bold text-blue-600">{sub.switchResult?.score || sub.score} (Switch)</span>
                                        ) : sub.test.type === 'DIGIT' ? (
                                            <span className="font-bold text-purple-600">{sub.digitResult?.score?.toFixed(2) || sub.score} (Digit)</span>
                                        ) : (
                                            <>
                                                <span className="font-bold text-blue-600">{sub.score}</span> / {sub.test._count?.questions || '-'}
                                            </>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link to={`/test/results/${sub.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default MyResultsPage;