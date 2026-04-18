import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Navbar       from './components/Navbar';
import Login        from './pages/Login';
import Register     from './pages/Register';
import SetupProfile from './pages/SetupProfile';
import Discover     from './pages/Discover';
import Matches      from './pages/Matches';
import Chat         from './pages/Chat';
import Search       from './pages/Search';

// Redirect to login if not authenticated
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Hide navbar on auth pages
const Layout = ({ children }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const hideNav = ['/login', '/register', '/setup-profile'].includes(pathname);

  return (
    <>
      {user && !hideNav && <Navbar />}
      <main style={{ paddingBottom: user && !hideNav ? 64 : 0, paddingTop: user && !hideNav ? 0 : 0 }}>
        {children}
      </main>
    </>
  );
};

const AppRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/setup-profile" element={<PrivateRoute><SetupProfile /></PrivateRoute>} />

      <Route path="/discover" element={<PrivateRoute><Discover /></PrivateRoute>} />
      <Route path="/matches"  element={<PrivateRoute><Matches /></PrivateRoute>} />
      <Route path="/chat/:matchId" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/search"   element={<PrivateRoute><Search /></PrivateRoute>} />

      <Route path="/" element={<Navigate to="/discover" replace />} />
      <Route path="*" element={<Navigate to="/discover" replace />} />
    </Routes>
  </Layout>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
