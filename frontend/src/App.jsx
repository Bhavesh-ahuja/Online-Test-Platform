import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import the components we created
import Navbar from './components/Navbar';

// Import Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateTestPage from './pages/CreateTestPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<DashboardPage />}/>
            <Route path="/create-test" element={<CreateTestPage />}/>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
