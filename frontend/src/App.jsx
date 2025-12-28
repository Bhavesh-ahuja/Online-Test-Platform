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
import EditTestPage from './pages/EditTestPage';
import TestPage from './pages/TestPage';
import ResultsPage from './pages/ResultsPage';
// import MyResultsPage from './pages/MyResultsPage';
import AdminResultsPage from './pages/AdminResultsPage';

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

            {/* Admin-Only Routes (Protected Routes) */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create-test" element={<CreateTestPage />} />
            <Route path="/test/edit/:id" element={<EditTestPage />} />
            <Route path="/tests/:id/admin-results" element={<AdminResultsPage />} />

            {/* Test Taking & Result Routes (Accessible to Logged-in Users) */}
            <Route path="/test/:id" element={<TestPage />} />
            <Route path="results/:submissionId" element={<ResultsPage />} />

            {/* User Result Routes */}
            {/* <Route path="/my-results" element={<MyResultsPage />} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
