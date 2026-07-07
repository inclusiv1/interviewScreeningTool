import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navigation from './Navigation';

describe('Navigation', () => {
  const mockHandleLogout = vi.fn();
  const mockSetShowAuthModal = vi.fn();

  const renderNav = (user: any = null) => {
    return render(
      <BrowserRouter>
        <Navigation 
          user={user} 
          handleLogout={mockHandleLogout} 
          setShowAuthModal={mockSetShowAuthModal} 
        />
      </BrowserRouter>
    );
  };

  it('renders all navigation links', () => {
    renderNav();
    expect(screen.getByText('Candidate Screening')).toBeInTheDocument();
    expect(screen.getByText('Roles & Skills')).toBeInTheDocument();
    expect(screen.getByText('Question Generator')).toBeInTheDocument();
  });

  it('shows Login button when user is not logged in', () => {
    renderNav(null);
    const loginButton = screen.getByText('Login / Register');
    expect(loginButton).toBeInTheDocument();
    
    fireEvent.click(loginButton);
    expect(mockSetShowAuthModal).toHaveBeenCalledWith(true);
  });

  it('shows Welcome message and Logout button when user is logged in', () => {
    renderNav({ username: 'testuser' });
    expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
    const logoutButton = screen.getByText('Logout');
    expect(logoutButton).toBeInTheDocument();
    
    fireEvent.click(logoutButton);
    expect(mockHandleLogout).toHaveBeenCalled();
  });
});
