import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGoToPortal = () => {
    // Check if user is already authenticated
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (token && refreshToken) {
      // User is authenticated, go to home
      navigate('/home');
    } else {
      // User not authenticated, go to login
      navigate('/login');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <h1>EGS Tutoring Portal</h1>
          <p className="landing-subtitle">Professional tutoring management made simple</p>
        </header>

        <main className="landing-main">
          <section className="features-section">
            <h2>Streamline Your Tutoring Business</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>📅 Schedule Management</h3>
                <p>Efficiently manage tutoring sessions and appointments with our integrated calendar system.</p>
              </div>
              <div className="feature-card">
                <h3>💰 Invoice Tracking</h3>
                <p>Generate professional invoices and track payments seamlessly.</p>
              </div>
              <div className="feature-card">
                <h3>📊 Progress Reports</h3>
                <p>Monitor student progress with detailed reports and analytics.</p>
              </div>
              <div className="feature-card">
                <h3>👨‍👩‍👧‍👦 Parent Portal</h3>
                <p>Keep parents informed with real-time updates and communication tools.</p>
              </div>
            </div>
          </section>

          <section className="benefits-section">
            <h2>Why Choose EGS Tutoring Portal?</h2>
            <ul className="benefits-list">
              <li>✅ Easy-to-use interface for tutors and parents</li>
              <li>✅ Secure payment processing and invoice management</li>
              <li>✅ Real-time communication and updates</li>
              <li>✅ Comprehensive reporting and analytics</li>
              <li>✅ Mobile-friendly design for on-the-go access</li>
            </ul>
          </section>
        </main>

        <footer className="landing-footer">
          <button 
            className="portal-button"
            onClick={handleGoToPortal}
          >
            Go to Portal
          </button>
          <p className="landing-footer-text">
            Ready to streamline your tutoring business? Access your portal now.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;