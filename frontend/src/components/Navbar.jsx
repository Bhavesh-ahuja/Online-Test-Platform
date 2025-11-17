import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {

    const navigate = useNavigate();

    // 1. Check if user is logged in by looking for the token 
    const token = localStorage.getItem('token');

    // 2. Check if user is Admin 
    // we use JSON.parse because we stored it as a string
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        // Clear all data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Go back to login
        navigate('/login');
    };

    return (
        <nav className="bg-gray-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="font-bold text-2xl test-blue-400">Mind Saga</Link>
                <div className='space-x-6 font-medium flex items-center'>
                    <Link to="/" className="hover:text-blue-400 transition">Home</Link>

                    {/* Conditionally Rendering: show different links if logged in */}
                    {token ? (
                        <>
                            <Link to="/dashboard" className="hover:text-blue-400 transition">DashBoard</Link>

                            {/* Only Admin see this button */}
                            {user.role === 'ADMIN' && (
                                <Link to="/create-test" className='text-green-400 hover:text-green-300 transition border border-green-400 px-3 py-1 rounded hover:bg-green-900'>+ Create Test</Link>
                            )}

                            <button onClick = {handleLogout} className='bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition text-sm ml-4'>Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-blue-400">Login</Link>
                            <Link to="/register" className="hover:text-blue-400">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;