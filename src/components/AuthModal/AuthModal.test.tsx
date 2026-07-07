import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthModal from './index';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

describe('AuthModal', () => {
  const mockOnClose = vi.fn();
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('toggles between login and register', () => {
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    
    const toggleButton = screen.getByText('Register');
    fireEvent.click(toggleButton);
    
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('calls login api and onLoginSuccess on form submission in login mode', async () => {
    const mockUser = { username: 'test', token: '123' };
    vi.mocked(api.login).mockResolvedValue(mockUser);
    
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    expect(api.login).toHaveBeenCalledWith('testuser', 'password123');
    await waitFor(() => expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser));
  });

  it('calls register api and onLoginSuccess on form submission in register mode', async () => {
    const mockUser = { username: 'test', token: '123' };
    vi.mocked(api.register).mockResolvedValue(mockUser);
    
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    
    fireEvent.click(screen.getByText('Register')); // Switch to register
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    expect(api.register).toHaveBeenCalledWith('newuser', 'password123');
    await waitFor(() => expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser));
  });

  it('displays error message when api fails', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('Invalid credentials'));
    
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
  });

  it('calls onClose when clicking Cancel button', () => {
    render(<AuthModal onClose={mockOnClose} onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
