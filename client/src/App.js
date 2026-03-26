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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, background:'var(--accent)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <span style={{ color:'var(--text-3)', fontSize:'0.85rem' }}>Loading FitPulse…</span>
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
