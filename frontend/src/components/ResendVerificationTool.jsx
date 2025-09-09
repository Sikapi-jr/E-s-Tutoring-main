// src/components/ResendVerificationTool.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const ResendVerificationTool = ({ onClose }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await api.post('/api/admin/resendVerification/', {
        email: email.trim()
      });
      
      const userData = response.data;
      setMessage(t('admin.verificationEmailSent', 
        `Verification email sent successfully to {{email}}. User: {{userName}} ({{userRole}})`, {
        email: email,
        userName: userData.user_name,
        userRole: userData.user_role
      }));
      
      // Clear form after success
      setEmail('');
      
    } catch (error) {
      console.error('Error resending verification email:', error);
      
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error || 
                           error.response.data.message || 
                           t('admin.verificationEmailFailed', 'Failed to send verification email');
        setError(errorMessage);
      } else if (error.response) {
        setError(t('admin.serverError', 'Server error occurred. Please try again later.'));
      } else if (error.request) {
        setError(t('admin.networkError', 'Network error. Please check your connection.'));
      } else {
        setError(t('admin.unexpectedError', 'An unexpected error occurred.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        {t('admin.resendVerificationDescription', 
          'Enter the email address of the user to resend their verification email. The system will send the appropriate email based on their role (tutor, parent, or student).'
        )}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label 
            htmlFor="email" 
            style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}
          >
            {t('admin.emailAddress', 'Email Address')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t('admin.enterEmailPlaceholder', 'Enter user email address')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            color: '#155724'
          }}>
            <strong>{t('common.success', 'Success')}:</strong> {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            color: '#721c24'
          }}>
            <strong>{t('common.error', 'Error')}:</strong> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #ccc',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#333',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || !email.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isSubmitting || !email.trim() ? '#ccc' : '#6f42c1',
              color: 'white',
              cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting 
              ? t('admin.sending', 'Sending...') 
              : t('admin.sendVerificationEmail', 'Send Verification Email')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResendVerificationTool;