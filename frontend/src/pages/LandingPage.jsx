import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          <h1>{t('landing.title')}</h1>
          <p className="landing-subtitle">{t('landing.subtitle')}</p>
        </header>

        <main className="landing-main">
          <section className="features-section">
            <h2>{t('landing.allInOnePlace')}</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>📅 {t('landing.features.scheduling.title')}</h3>
                <p>{t('landing.features.scheduling.description')}</p>
              </div>
              <div className="feature-card">
                <h3>📋 {t('landing.features.requests.title')}</h3>
                <p>{t('landing.features.requests.description')}</p>
              </div>
              <div className="feature-card">
                <h3>📊 {t('landing.features.reports.title')}</h3>
                <p>{t('landing.features.reports.description')}</p>
              </div>
              <div className="feature-card">
                <h3>💬 {t('landing.features.communication.title')}</h3>
                <p>{t('landing.features.communication.description')}</p>
              </div>
              <div className="feature-card">
                <h3>💰 {t('landing.features.invoicing.title')}</h3>
                <p>{t('landing.features.invoicing.description')}</p>
              </div>
              <div className="feature-card">
                <h3>🤖 {t('landing.features.aiSupport.title')}</h3>
                <p>{t('landing.features.aiSupport.description')}</p>
              </div>
            </div>
          </section>

          <section className="getting-started-section">
            <h2>{t('landing.gettingStarted')}</h2>
            <p className="steps-subtitle">{t('landing.stepsSubtitle')}</p>
            <div className="steps-container">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>📝 {t('landing.steps.step1.title')}</h3>
                <p>{t('landing.steps.step1.description')}</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>🔍 {t('landing.steps.step2.title')}</h3>
                <p>{t('landing.steps.step2.description')}</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>💬 {t('landing.steps.step3.title')}</h3>
                <p>{t('landing.steps.step3.description')}</p>
              </div>
            </div>
          </section>

          <section className="benefits-section">
            <h2>{t('landing.whyPortal')}</h2>
            <ul className="benefits-list">
              <li>✅ {t('landing.benefits.unified')}</li>
              <li>✅ {t('landing.benefits.support')}</li>
              <li>✅ {t('landing.benefits.realTime')}</li>
              <li>✅ {t('landing.benefits.secure')}</li>
              <li>✅ {t('landing.benefits.mobile')}</li>
              <li>✅ {t('landing.benefits.efficient')}</li>
            </ul>
          </section>
        </main>

        <footer className="landing-footer">
          <button 
            className="portal-button"
            onClick={handleGoToPortal}
          >
            {t('landing.goToPortal')}
          </button>
          <p className="landing-footer-text">
            {t('landing.footerText')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;