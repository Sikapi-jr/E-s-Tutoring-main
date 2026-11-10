import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/GoogleReviewsButton.css';

const StarIcon = () => (
  <svg className="grb-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7-5.4-4.7 7.1-.6z" />
  </svg>
);

const GoogleReviewsButton = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="grb-button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <StarIcon />
        <span>{t('landing.googleReviews.buttonLabel')}</span>
      </button>

      {isOpen && (
        <div
          className="grb-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('landing.googleReviews.modalTitle')}
          onClick={() => setIsOpen(false)}
        >
          <div className="grb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="grb-modal-header">
              <h2>{t('landing.googleReviews.modalTitle')}</h2>
              <button
                className="grb-close"
                onClick={() => setIsOpen(false)}
                aria-label={t('landing.googleReviews.close')}
              >
                &times;
              </button>
            </div>
            <div className="grb-modal-body">
              <div
                className="elfsight-app-4329a78c-8f51-42dc-baa3-2fda0b934e4c"
                data-elfsight-app-lazy
              ></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleReviewsButton;
