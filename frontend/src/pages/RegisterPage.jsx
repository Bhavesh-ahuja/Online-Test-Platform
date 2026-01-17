import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
// Ensure react-icons is installed: npm install react-icons
import { FcGoogle } from 'react-icons/fc'; 

function RegisterPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'STUDENT'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success!
      alert('Registration successful! Please log in.');
      navigate('/login');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* --- Background Ambient Glows --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-900 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

      {/* --- Main Content Container --- */}
      <div className="flex-grow flex items-center justify-center px-4 sm:px-12 lg:px-24 z-10 relative">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT SIDE: Branding Text */}
          <div className="space-y-8 text-center lg:text-left">
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 uppercase">
                Create <br/>Account
              </h1>
              <p className="text-gray-400 text-lg">
                Join our community! <br/>
                Start your journey today.
              </p>
            </div>

            {/* Google Sign Up Button */}
            <div className="flex justify-center lg:justify-start">
               <button 
                type="button" 
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-full transition-all duration-300 backdrop-blur-sm group"
              >
                <FcGoogle className="text-2xl group-hover:scale-110 transition-transform" /> 
                <span className="font-medium tracking-wide">Sign up with Google</span>
              </button>
            </div>

            {/* Login Link */}
            <p className="text-gray-500 mt-6">
               Already have an account?{' '}
               <Link to="/login" className="text-white font-bold underline decoration-purple-500 decoration-2 underline-offset-4 hover:text-purple-400 transition">
                 Log In
               </Link>
            </p>
          </div>

          {/* RIGHT SIDE: The Registration Form */}
          <div className="w-full max-w-md mx-auto lg:ml-auto">
            <div className="bg-[#111111] border border-gray-800 p-8 rounded-2xl shadow-2xl shadow-purple-900/20 backdrop-blur-xl relative">
              
              {/* Top Gradient Border Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent opacity-50"></div>

              <h2 className="text-2xl font-bold mb-1 text-gray-200">Register</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your details to create an account</p>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded mb-6 text-sm flex items-center">
                   <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                   {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                
                {/* Email Field */}
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-xs font-mono text-gray-400 uppercase tracking-wider">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. user@example.com"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label htmlFor="password" className="block text-xs font-mono text-gray-400 uppercase tracking-wider">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                {/* Role Selection */}
                <div className="space-y-1">
                  <label htmlFor="role" className="block text-xs font-mono text-gray-400 uppercase tracking-wider">I am a...</label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none transition-colors"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="STUDENT">Student</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                    {/* Custom Dropdown Arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg shadow-purple-600/20 transition-all duration-200 transform active:scale-[0.98] uppercase tracking-wider ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Creating...' : 'Sign Up'}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 text-gray-600 text-xs font-mono">
        © Copyright 2026 Team Mavericks
      </div>

    </div>
  );
}

export default RegisterPage;