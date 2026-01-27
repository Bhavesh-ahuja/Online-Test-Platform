import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { API_BASE_URL } from "../../config";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionExpired = params.get("reason") === "session_expired";

  useEffect(() => {
    if (sessionExpired) {
      window.history.replaceState({}, "", "/login");
    }
  }, [sessionExpired]);

  // State
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState([]);

  // Handle Input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          setErrors(data.details);
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }

      // --- SUCCESS ---
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden font-general">
      {/* --- BACKGROUND GLOW EFFECTS --- */}
      {/* Purple blob top left */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/30 rounded-full blur-[100px]" />
      {/* Blue blob bottom right */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px]" />

      {/* --- MAIN CONTAINER --- */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 p-6 md:p-12 items-center">

        {/* --- LEFT SIDE: TEXT & ACTIONS --- */}
        <div className="space-y-8 text-white">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
              LOGIN
            </h1>
            <p className="text-gray-400 text-lg">
              Hey welcome back! <br /> We hope you had a great day.
            </p>
          </div>

          {/* Register Link */}
          <div className="text-sm text-gray-400">
            Not yet a member?{" "}
            <Link
              to="/register"
              className="text-white font-bold underline decoration-violet-500 underline-offset-4 hover:text-violet-400 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* --- RIGHT SIDE: FORM (GLASS CARD) --- */}
        <div className="relative">
          {/* Subtle border gradient using a pseudo-element or container */}
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

            {/* Session Expired Alert */}
            {sessionExpired && (
              <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded-lg text-sm">
                Your session has expired. Please log in again.
              </div>
            )}

            {/* Error Alert */}
            {(error || errors.length > 0) && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error && <div>{error}</div>}
                {errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                )}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. user@example.com"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-600/20 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                LOGIN
              </button>
            </form>
          </div>

          {/* Decorative Glow behind the form */}
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl blur-2xl opacity-20 -z-10" />
        </div>

      </div>

      {/* Copyright Footer */}
      <div className="absolute bottom-6 text-gray-600 text-xs">
        &copy; Copyright 2026 Team Mavericks
      </div>
    </div>
  );
}

export default LoginPage;