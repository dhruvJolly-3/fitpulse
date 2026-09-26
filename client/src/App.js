import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import Splash from './components/Splash';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NutritionPage from './pages/NutritionPage';
import TrainingPage from './pages/TrainingPage';
import WaterPage from './pages/WaterPage';
import SleepPage from './pages/SleepPage';
import StepsPage from './pages/StepsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import RecipesPage from './pages/RecipesPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SpotifyCallbackPage from './pages/SpotifyCallbackPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.profile?.age) return <Navigate to="/onboarding" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
      {/* Password reset: public; reset stays reachable even if a session exists */}
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Spotify OAuth redirect target; must match a Redirect URI in the Spotify dashboard */}
      <Route path="/spotify-callback" element={user ? <SpotifyCallbackPage /> : <Navigate to="/auth" />} />
      <Route path="/onboarding" element={user && !user.profile?.age ? <OnboardingPage /> : <Navigate to="/" />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="water" element={<WaterPage />} />
        <Route path="sleep" element={<SleepPage />} />
        <Route path="steps" element={<StepsPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
