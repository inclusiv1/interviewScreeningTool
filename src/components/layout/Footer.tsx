import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4 className="footer-title">Recruitment</h4>
          <a href="/" className="footer-link">Candidate Screening</a>
          <a href="/topics" className="footer-link">Role Categories</a>
        </div>
        <div className="footer-section">
          <h4 className="footer-title">HR Intelligence</h4>
          <a href="/generator" className="footer-link">Interview Question Generator</a>
          <a href="#" className="footer-link">Gemini HR Analysis</a>
          <a href="#" className="footer-link">Candidate Verification</a>
        </div>
        <div className="footer-section">
          <h4 className="footer-title">Method Resources</h4>
          <a href="https://www.method.me/blog/" target="_blank" className="footer-link">Method Blog</a>
          <a href="https://www.method.me/about/" target="_blank" className="footer-link">About Method</a>
          <a href="https://github.com/" target="_blank" className="footer-link">Internal Tools</a>
        </div>
      </div>
      <div className="copyright">
        &copy; {new Date().getFullYear()} Interviewing & Screening Tool. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
