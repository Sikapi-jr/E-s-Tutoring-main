// src/pages/Contact.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Contact.css';

export default function Contact() {
  const { t } = useTranslation();

  return (
    <div className="contact-wrapper">
      <div className="contact-container">
        <h1 className="contact-title">Contact Us</h1>
        <p className="contact-subtitle">Get in touch with our support team</p>

        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="contact-details">
                <h3>Email</h3>
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
                <h3>Phone</h3>
                <a href="tel:289-423-8434" className="contact-link">
                  289-423-8434
                </a>
              </div>
            </div>
          </div>

          <div className="contact-links">
            <h3>Quick Links</h3>
            <ul>
              <li>
                <a href="https://egstutoring.ca/home" target="_blank" rel="noopener noreferrer" className="quick-link">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/terms-of-use.pdf" download className="quick-link">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="/privacy-policy.pdf" download className="quick-link">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}