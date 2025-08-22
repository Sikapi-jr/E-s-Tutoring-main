import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const DisputeModal = ({ isOpen, onClose, hourData, onSubmitSuccess }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please describe the issue with this session.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/disputes/create/', {
        hour: hourData.id,
        message: message.trim()
      });
      
      // Success - call the success callback and close modal
      onSubmitSuccess();
      onClose();
      setMessage('');
    } catch (error) {
      if (error.response?.status === 400) {
        setError('You have already disputed this session.');
      } else {
        setError('Failed to submit dispute. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <h2 style={{ 
          marginTop: 0, 
          marginBottom: '1rem',
          color: '#333',
          fontSize: '1.5rem'
        }}>
          Doesn't Look Right?
        </h2>
        
        {/* Session Details */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1.5rem',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#495057' }}>
            Session Details:
          </h4>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Student:</strong> {hourData.student_firstName} {hourData.student_lastName}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Tutor:</strong> {hourData.tutor_firstName} {hourData.tutor_lastName}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Date:</strong> {hourData.date}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Time:</strong> {hourData.startTime} - {hourData.endTime}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Duration:</strong> {hourData.totalTime} hours
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Location:</strong> {hourData.location}
            </p>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>Subject:</strong> {hourData.subject}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Describe the issue:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (message.trim()) {
                    handleSubmit(e);
                  }
                }
              }}
              placeholder="Please explain what seems incorrect about this session... (Ctrl+Enter to submit)"
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '0.9rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          {error && (
            <div style={{
              color: '#dc3545',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            gap: '0.5rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #6c757d',
                backgroundColor: 'white',
                color: '#6c757d',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              autoFocus
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                backgroundColor: isSubmitting || !message.trim() ? '#6c757d' : '#dc3545',
                color: 'white',
                borderRadius: '4px',
                cursor: isSubmitting || !message.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeModal;