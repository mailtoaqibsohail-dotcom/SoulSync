import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiHeart, FiMessageCircle, FiSearch, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar__logo">
        <span className="gradient-text">💫 Spark</span>
      </div>

      <div className="navbar__links">
        <NavLink to="/discover" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <FiHome size={22} />
          <span>Discover</span>
        </NavLink>
        <NavLink to="/matches" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
          <FiHeart size={22} />
          <span>Matches</span>
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

      <button className="navbar__logout" onClick={handleLogout} title="Logout">
        Sign out
      </button>
    </nav>
  );
};

export default Navbar;
