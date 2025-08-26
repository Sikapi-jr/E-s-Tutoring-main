import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import "../styles/Modal.css";

const TutorReplyModal = ({ isOpen, onClose, hourData, onSubmitSuccess }) => {
  const { t } = useTranslation();
  const [tutorReply, setTutorReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hourData && isOpen) {
      setTutorReply(hourData.tutor_reply || "");
      setError("");
    }
  }, [hourData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!tutorReply.trim()) {
      setError(t('loggedHours.replyRequired'));
      setLoading(false);
      return;
    }

    try {
      await api.patch(`/api/hours/${hourData.id}/tutor-reply/`, {
        tutor_reply: tutorReply
      });
      onSubmitSuccess();
      onClose();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        setError(error.response.data.detail);
      } else if (error.response) {
        setError(t('errors.serverError'));
      } else if (error.request) {
        setError(t('errors.networkError'));
      } else {
        setError(t('loggedHours.replyFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{t('loggedHours.tutorReply')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="dispute-info">
            <h3>{t('loggedHours.disputedSession')}</h3>
            <p><strong>{t('common.date')}:</strong> {new Date(hourData.date).toLocaleDateString()}</p>
            <p><strong>{t('dashboard.student')}:</strong> {hourData.student_firstName} {hourData.student_lastName}</p>
            <p><strong>{t('events.time')}:</strong> {hourData.startTime} - {hourData.endTime}</p>
            <p><strong>{t('loggedHours.totalHours')}:</strong> {hourData.totalTime}h</p>
          </div>
          
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>{t('loggedHours.yourReply')} ({t('loggedHours.adminOnly')})</label>
              <textarea
                value={tutorReply}
                onChange={(e) => setTutorReply(e.target.value)}
                placeholder={t('loggedHours.explainDisputedSession')}
                rows="5"
                required
              />
              <small className="form-help">
                {t('loggedHours.replyHelp')}
              </small>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('common.loading') : t('loggedHours.submitReply')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TutorReplyModal;