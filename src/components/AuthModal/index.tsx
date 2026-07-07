import React, { useState } from 'react';
import { login, register } from '../../services/api';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    try {
      let result;
      if (isLogin) {
        result = await login(trimmedUsername, trimmedPassword);
      } else {
        result = await register(trimmedUsername, trimmedPassword);
      }
      onLoginSuccess(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="selector-title">{isLogin ? 'Login' : 'Register'}</h2>
        {error && <div className="error-message" style={{ marginBottom: '15px', textAlign: 'center' }}>{error}</div>}
        <form className="ai-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              className="form-input"
              type="text"
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              className="form-input"
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-full-width" type="submit">
            {isLogin ? 'Login' : 'Register'}
          </button>
          <div className="flex-center-gap" style={{ marginTop: '15px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
