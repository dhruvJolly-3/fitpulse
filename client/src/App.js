import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NutritionPage from './pages/NutritionPage';
import TrainingPage from './pages/TrainingPage';
import WaterPage from './pages/WaterPage';
import SleepPage from './pages/SleepPage';
import StepsPage from './pages/StepsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="center-screen">
      <div className="brand-mark">F</div>
      <span className="label">Loading FitPulse…</span>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.profile?.age) return <Navigate to="/onboarding" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
      <Route path="/onboarding" element={user && !user.profile?.age ? <OnboardingPage /> : <Navigate to="/" />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="water" element={<WaterPage />} />
        <Route path="sleep" element={<SleepPage />} />
        <Route path="steps" element={<StepsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
