// src/pages/MailingList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEOHead';
import { getSEOData } from '../config/seoConfig';
import api from '../api';
import '../styles/MailingList.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MailingList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const seoData = getSEOData('mailingList');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | already | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setStatus('error');
      setErrorMessage(t('mailingList.errorInvalidEmail'));
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await api.post('/api/mailing-list/subscribe/', {
        email: trimmedEmail,
        language: i18n.language?.startsWith('fr') ? 'fr' : 'en',
      });

      if (response.data?.detail === 'already_subscribed') {
        setStatus('already');
      } else {
        setStatus('success');
      }
      setEmail('');
    } catch (err) {
      console.error('Mailing list subscription failed:', err);
      setStatus('error');
      setErrorMessage(t('mailingList.errorGeneric'));
    }
  };

  return (
    <div className="mailing-list-wrapper">
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={seoData.canonical}
      />
      <div className="mailing-list-container">
        <h1 className="mailing-list-title">{t('mailingList.title')}</h1>
        <p className="mailing-list-subtitle">{t('mailingList.subtitle')}</p>

        {(status === 'success' || status === 'already') ? (
          <div className="mailing-list-success">
            <h2>{t('mailingList.successTitle')}</h2>
            <p>
              {status === 'already'
                ? t('mailingList.alreadySubscribedMessage')
                : t('mailingList.successMessage')}
            </p>
            <button type="button" className="mailing-list-back-btn" onClick={() => navigate('/')}>
              {t('mailingList.backToHome')}
            </button>
          </div>
        ) : (
          <form className="mailing-list-form" onSubmit={handleSubmit}>
            <label htmlFor="mailing-list-email" className="mailing-list-label">
              {t('mailingList.emailLabel')}
            </label>
            <input
              id="mailing-list-email"
              type="email"
              className="mailing-list-input"
              placeholder={t('mailingList.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'submitting'}
              required
            />

            {status === 'error' && (
              <p className="mailing-list-error" role="alert">{errorMessage}</p>
            )}

            <button type="submit" className="mailing-list-submit-btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? t('mailingList.submitting') : t('mailingList.submitButton')}
            </button>

            <p className="mailing-list-privacy-note">{t('mailingList.privacyNote')}</p>
          </form>
        )}
      </div>
    </div>
  );
}
