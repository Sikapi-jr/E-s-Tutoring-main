// src/pages/Contact.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../styles/Contact.css';

export default function Contact() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="contact-wrapper">
      <div className="contact-container">
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#192A88',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0f1d5e'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#192A88'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 19V14H14V19C14 19.55 14.45 20 15 20H18C18.55 20 19 19.55 19 19V12H20.7C21.16 12 21.38 11.43 21.03 11.13L12.67 3.6C12.29 3.26 11.71 3.26 11.33 3.6L2.97 11.13C2.63 11.43 2.84 12 3.3 12H5V19C5 19.55 5.45 20 6 20H9C9.55 20 10 19.55 10 19Z" fill="currentColor"/>
          </svg>
          {t('contact.home')}
        </button>
        <h1 className="contact-title">{t('contact.title')}</h1>
        <p className="contact-subtitle">{t('contact.subtitle')}</p>

        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="contact-details">
                <h3>{t('contact.email')}</h3>
                <a href="mailto:support@egstutoring.ca" className="contact-link">
                  support@egstutoring.ca
                </a>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.09 8.32 8.82 8.59L6.62 10.79Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="contact-details">
                <h3>{t('contact.phone')}</h3>
                <a href="tel:289-423-8434" className="contact-link">
                  289-423-8434
                </a>
              </div>
            </div>
          </div>

          <div className="contact-links">
            <h3>{t('contact.quickLinks')}</h3>
            <ul>
              <li>
                <a href="https://egstutoring.ca/home" target="_blank" rel="noopener noreferrer" className="quick-link">
                  {t('contact.faq')}
                </a>
              </li>
              <li>
                <a href="/terms-of-use.pdf" download className="quick-link">
                  {t('contact.termsOfUse')}
                </a>
              </li>
              <li>
                <a href="/privacy-policy.pdf" download className="quick-link">
                  {t('contact.privacyPolicy')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}