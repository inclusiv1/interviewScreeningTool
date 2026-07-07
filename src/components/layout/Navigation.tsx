import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

interface NavigationProps {
  user: any;
  handleLogout: () => void;
  setShowAuthModal: (show: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, handleLogout, setShowAuthModal }) => {
  return (
    <nav className="navigation">
      <RouterNavLink 
        to="/" 
        end 
        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        title="Practice and review screening questions"
      >
        Candidate Screening
      </RouterNavLink>
      <RouterNavLink 
        to="/topics" 
        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        title="Browse questions by roles and skill categories"
      >
        Roles & Skills
      </RouterNavLink>
      <RouterNavLink 
        to="/generator" 
        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
        title="Create new interview questions using AI"
      >
        Question Generator
      </RouterNavLink>
      
      <div className="user-section">
        {user && user.username !== 'interviewer' ? (
          <>
            <span>Welcome, {user.username}</span>
            <button className="user-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <button className="user-button" onClick={() => setShowAuthModal(true)}>Login / Register</button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
