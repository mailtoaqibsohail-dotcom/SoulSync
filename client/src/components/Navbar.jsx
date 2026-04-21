import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiInbox, FiSearch, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationBell from './NotificationBell';
import Logo from './Logo';
import './Logo.css';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadNotifications, totalUnreadMessages } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__logo">
        <Logo size={28} />
      </div>

      <div className="navbar__links">
        <NavLink to="/discover" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <FiHome size={22} />
          <span>Discover</span>
        </NavLink>
        <NavLink to="/inbox" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <div className="navbar__link-icon-wrap">
            <FiInbox size={22} />
            {totalUnreadMessages > 0 && <span className="navbar__badge">{totalUnreadMessages}</span>}
          </div>
          <span>Inbox</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <FiSearch size={22} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/profile/me" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <FiUser size={22} />
          <span>Profile</span>
        </NavLink>
      </div>

      <div className="navbar__right">
        <NotificationBell />
        <button className="navbar__logout" onClick={handleLogout} title="Logout">Sign out</button>
      </div>
    </nav>
  );
};

export default Navbar;
