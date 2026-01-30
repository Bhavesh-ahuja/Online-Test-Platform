import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ExamLayout from './layouts/ExamLayout';

// Import Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateTestPage from './pages/CreateTestPage';
import EditTestPage from './pages/EditTestPage';
import TestPage from './pages/TestPage';
import ResultsPage from './pages/ResultsPage';
import MyResultsPage from './pages/MyResultsPage';
import AdminResultsPage from './pages/AdminResultsPage';
import TestInstructions from './pages/TestInstructions';
import ProfilePage from './pages/ProfilePage';
import SwitchChallengePage from './pages/SwitchChallengePage';
import DigitChallengePage from './pages/DigitChallengePage';
import GeoSudoChallengePage from './pages/GeoSudoChallengePage';
import MotionChallengePage from './pages/MotionChallengePage';
import TestSubmitted from "./pages/TestSubmitted";


function AppRoutes() {
  const location = useLocation();

  return (
    <Routes>
      {/* Public & Admin Routes (Wrapped in MainLayout) */}
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/login" element={<MainLayout><LoginPage /></MainLayout>} />
      <Route path="/register" element={<MainLayout><RegisterPage /></MainLayout>} />
      <Route path="/dashboard" element={<MainLayout><DashboardPage /></MainLayout>} />
      <Route path="/create-test" element={<MainLayout><CreateTestPage /></MainLayout>} />
      <Route path="/test/edit/:id" element={<MainLayout><EditTestPage /></MainLayout>} />
      <Route path="/tests/:id/admin-results" element={<MainLayout><AdminResultsPage /></MainLayout>} />
      <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
      <Route path="/test/:id/instructions" element={<MainLayout><TestInstructions /></MainLayout>} />
      <Route path="/test/results/:submissionId" element={<MainLayout><ResultsPage /></MainLayout>} />
      <Route path="/results/:submissionId" element={<MainLayout><ResultsPage /></MainLayout>} />
      <Route path="/my-results" element={<MainLayout><MyResultsPage /></MainLayout>} />
      <Route path="/test-submitted" element={<TestSubmitted />} />
      {/* Exam Route (Wrapped in ExamLayout) */}
      <Route
        path="/test/:id"
        element={<ExamLayout><TestPage key={location.pathname} /></ExamLayout>}
      />

      {/* Switch Challenge Route */}
      <Route
        path="/switch-challenge/:id"
        element={<SwitchChallengePage />} /* Use ExamLayout? The page has its own layout logic */
      />



      {/* Digit Challenge Route */}
      <Route
        path="/digit-challenge/:id"
        element={<DigitChallengePage />}
      />

      {/* GeoSudo Challenge Route */}
      <Route
        path="/geosudo-challenge/:id"
        element={<GeoSudoChallengePage />}
      />

      {/* Motion Challenge Route */}
      <Route
        path="/motion-challenge/:id"
        element={<MotionChallengePage />}
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
