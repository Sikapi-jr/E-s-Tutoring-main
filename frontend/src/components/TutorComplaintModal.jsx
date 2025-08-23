import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const TutorComplaintModal = ({ isOpen, onClose, tutorData, onSubmitSuccess }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !tutorData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/tutor-complaints/', {
        tutor: tutorData.id,
        message: message.trim()
      });

      // Reset form and close modal
      setMessage('');
      onClose();
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Show success message
      alert('Your concern has been submitted successfully. The administration will review it shortly.');
      
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setError('Failed to submit your concern. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setError('');
    onClose();
  };

  // Handle Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleCancel}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#192A88', fontSize: '1.5rem' }}>
              Report a Concern
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              About: <strong>{tutorData.firstName} {tutorData.lastName}</strong>
            </p>
          </div>
          <button 
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              marginLeft: '1rem'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Please describe your concern:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Please provide details about your concern. This will be reviewed by the administration."
              rows={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #E1E1E1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#192A88'}
              onBlur={(e) => e.target.style.borderColor = '#E1E1E1'}
              autoFocus
              required
            />
            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
              Tip: Press Ctrl+Enter to submit quickly
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '0.75rem 1.5rem',
                border: '2px solid #ddd',
                backgroundColor: 'transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isSubmitting || !message.trim() ? '#ccc' : '#ff8c00',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSubmitting || !message.trim() ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Concern 📝'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TutorComplaintModal;