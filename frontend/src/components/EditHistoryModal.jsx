import React from "react";
import { useTranslation } from "react-i18next";
import "../styles/Modal.css";

const EditHistoryModal = ({ isOpen, onClose, hourData }) => {
  const { t } = useTranslation();

  if (!isOpen || !hourData) return null;

  const editHistory = hourData.edit_history || {};
  const hasHistory = Object.keys(editHistory).length > 0;

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatFieldName = (fieldName) => {
    const fieldMap = {
      date: t('common.date'),
      startTime: t('events.startTime'),
      endTime: t('events.endTime'),
      totalTime: t('loggedHours.totalHours'),
      location: t('requests.location'),
      subject: t('logHours.subject'),
      notes: t('logHours.sessionDescription')
    };
    return fieldMap[fieldName] || fieldName;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{t('loggedHours.editHistory')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="edit-info">
            <p><strong>{t('loggedHours.originallyCreated')}:</strong> {formatDateTime(hourData.created_at)}</p>
            {hourData.edited_at && (
              <p><strong>{t('loggedHours.lastEdited')}:</strong> {formatDateTime(hourData.edited_at)}</p>
            )}
          </div>

          {hasHistory ? (
            <div className="edit-history">
              <h3>{t('loggedHours.changesHistory')}</h3>
              {Object.entries(editHistory).map(([field, change], index) => (
                <div key={index} className="change-item">
                  <h4>{formatFieldName(field)}</h4>
                  <div className="change-details">
                    <div className="original-value">
                      <strong>{t('loggedHours.originalValue')}:</strong> {change.old || "-"}
                    </div>
                    <div className="new-value">
                      <strong>{t('loggedHours.changedTo')}:</strong> {change.new || "-"}
                    </div>
                    <div className="change-date">
                      <em>{t('loggedHours.changedOn')}: {formatDateTime(change.timestamp)}</em>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-history">
              <p>{t('loggedHours.noEditsHistory')}</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditHistoryModal;