import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';

import AuthPage    from './pages/AuthPage';
import SetupPage   from './pages/SetupPage';
import SwipePage   from './pages/SwipePage';
import MatchesPage from './pages/MatchesPage';
import ChatPage    from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import Layout      from './components/Layout';
import Spinner     from './components/Spinner';

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={10} /></div>;
  if (!session) return <Navigate to="/auth" replace />;
  return children;
}

function SetupGuard({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={10} /></div>;
  if (!profile?.is_setup) return <Navigate to="/setup" replace />;
  return children;
}

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Spinner size={12} />
    </div>
  );

  return (
    <Routes>
      <Route path="/auth" element={session ? <Navigate to={profile?.is_setup ? '/swipe' : '/setup'} replace /> : <AuthPage />} />
      <Route path="/setup" element={<PrivateRoute><SetupPage /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><SetupGuard><Layout /></SetupGuard></PrivateRoute>}>
        <Route index element={<Navigate to="/swipe" replace />} />
        <Route path="swipe"            element={<SwipePage />} />
        <Route path="matches"          element={<MatchesPage />} />
        <Route path="chat/:matchId"    element={<ChatPage />} />
        <Route path="profile"          element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* CallProvider must be inside AuthProvider (needs user) but outside routes (needs to render over everything) */}
        <CallProvider>
          <AppRoutes />
        </CallProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
