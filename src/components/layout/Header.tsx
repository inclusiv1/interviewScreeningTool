import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="header">
      <img
        src="/method-logo.svg"
        alt="Method Logo"
        className="logo"
        onClick={() => window.location.href = '/'}
      />
      <h1 className="header-title">Method HR Interview Tool</h1>
    </header>
  );
};

export default Header;
