// src/components/Footer.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/Footer.css";
import api from "../api";
import { useUser } from "../components/UserProvider";


export default function Footer() {
  
  const { user } = useUser();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDownload = (filename) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("user", user.account_id); 
      if (file) formData.append("file", file);

      // do NOT set Content-Type; Axios will set proper multipart boundary
      await api.post("/api/errorTicket/", formData);

      setShowModal(false);
      setMessage("");
      setFile(null);
      alert("Ticket submitted!");
    } catch (err) {
      console.error("Ticket submission failed:", err);
      alert("Error submitting ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-column">
            <h4>{t('footer.company')}</h4>
            <ul>
              <li><a href="/">{t('navigation.home')}</a></li>
              <li><a href="/settings">{t('navigation.settings')}</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>{t('footer.help')}</h4>
            <ul>
              <li><a href="https://egstutoring.ca/home" target="_blank" rel="noopener noreferrer">{t('footer.faq')}</a></li>
              <li><a href="/contact">{t('footer.contact')}</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>{t('footer.legal')}</h4>
            <ul>
              <li><button onClick={() => handleDownload('terms-of-use.pdf')} className="footer-link-button">{t('footer.terms')}</button></li>
              <li><button onClick={() => handleDownload('privacy-policy.pdf')} className="footer-link-button">{t('footer.privacy')}</button></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>{t('footer.dispute')}</h4>
            <button
              className="report-warning"
              onClick={() => setShowModal(true)}
            >
              {t('footer.reportIssue')}
            </button>
            <p className="screenshot-tip">
              {t('footer.screenshotTip')}
            </p>
          </div>
        </div>
      </footer>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('footer.reportIssue')}</h2>
            <textarea
              rows={4}
              placeholder={t('disputes.disputeReason')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="save" onClick={handleSubmit} disabled={submitting}>
                {submitting ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
