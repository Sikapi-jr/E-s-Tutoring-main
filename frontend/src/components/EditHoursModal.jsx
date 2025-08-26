import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import "../styles/Modal.css";

const EditHoursModal = ({ isOpen, onClose, hourData, onSubmitSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    totalTime: "",
    location: "",
    subject: "",
    notes: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hourData && isOpen) {
      setFormData({
        date: hourData.date || "",
        startTime: hourData.startTime || "",
        endTime: hourData.endTime || "",
        totalTime: hourData.totalTime || "",
        location: hourData.location || "",
        subject: hourData.subject || "",
        notes: hourData.notes || ""
      });
    }
  }, [hourData, isOpen]);

  const getTotalTime = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);

    const start = startHours * 60 + startMinutes;
    const end = endHours * 60 + endMinutes;
    const diffMinutes = end - start;
    
    return diffMinutes < 0 ? 0 : (diffMinutes / 60).toFixed(2);
  };

  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const calculatedTotal = getTotalTime(formData.startTime, formData.endTime);
      setFormData(prev => ({ ...prev, totalTime: calculatedTotal }));
    }
  }, [formData.startTime, formData.endTime]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentWeekDates = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Monday is day 1
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      min: monday.toISOString().split('T')[0],
      max: sunday.toISOString().split('T')[0]
    };
  };

  const weekDates = getCurrentWeekDates();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.patch(`/api/hours/${hourData.id}/edit/`, formData);
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
        setError(t('errors.editFailed'));
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
          <h2>{t('loggedHours.editHours')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>{t('common.date')}</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              min={weekDates.min}
              max={weekDates.max}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('events.startTime')}</label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('events.endTime')}</label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('loggedHours.totalHours')}</label>
            <input
              type="text"
              name="totalTime"
              value={formData.totalTime}
              readOnly
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>{t('requests.location')}</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            >
              <option value="">{t('logHours.selectLocation')}</option>
              <option value="Online">{t('logHours.online')}</option>
              <option value="In-Person">{t('logHours.inPerson')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('logHours.subject')}</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder={t('logHours.subject')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('logHours.sessionDescription')}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder={t('logHours.sessionDescription')}
              rows="3"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditHoursModal;