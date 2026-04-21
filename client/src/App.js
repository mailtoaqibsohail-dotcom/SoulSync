import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatPopupProvider } from './context/ChatPopupContext';
import FloatingInbox from './components/FloatingInbox';
import ChatPopupManager from './components/ChatPopupManager';
import IncomingCallModal from './components/IncomingCallModal';
import './components/FloatingInbox.css';

import Navbar       from './components/Navbar';
import Login        from './pages/Login';
import Register     from './pages/Register';
import VerifyOtp    from './pages/VerifyOtp';
import SetupProfile from './pages/SetupProfile';
import Discover     from './pages/Discover';
import Matches      from './pages/Matches';
import Inbox        from './pages/Inbox';

import Chat         from './pages/Chat';
import Search       from './pages/Search';
import MyProfile    from './pages/MyProfile';
import ViewProfile  from './pages/ViewProfile';
import Call         from './pages/Call';

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
      <main style={{ paddingBottom: user && !hideNav ? 64 : 0 }}>
        {children}
      </main>
      {user && !hideNav && <FloatingInbox />}
      {user && <ChatPopupManager />}
      {user && <IncomingCallModal />}
    </>
  );
};

const AppRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/verify-otp"    element={<VerifyOtp />} />
      <Route path="/setup-profile" element={<PrivateRoute><SetupProfile /></PrivateRoute>} />

      <Route path="/discover"         element={<PrivateRoute><Discover /></PrivateRoute>} />
      <Route path="/matches"          element={<PrivateRoute><Matches /></PrivateRoute>} />
      <Route path="/inbox"            element={<PrivateRoute><Inbox /></PrivateRoute>} />
      <Route path="/inbox/:matchId"   element={<PrivateRoute><Inbox /></PrivateRoute>} />
      <Route path="/chat/:matchId"    element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/search"           element={<PrivateRoute><Search /></PrivateRoute>} />
      <Route path="/profile/me"       element={<PrivateRoute><MyProfile /></PrivateRoute>} />
      <Route path="/profile/:id"      element={<PrivateRoute><ViewProfile /></PrivateRoute>} />
      <Route path="/call/:matchId"    element={<PrivateRoute><Call /></PrivateRoute>} />

      <Route path="/" element={<Navigate to="/discover" replace />} />
      <Route path="*" element={<Navigate to="/discover" replace />} />
    </Routes>
  </Layout>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <ChatPopupProvider>
            <AppRoutes />
          </ChatPopupProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
