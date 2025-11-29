import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';
import '../styles/Modal.css';
import '../styles/Form.css';

const AdminTestEmail = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  const [formData, setFormData] = useState({
    recipientEmail: '',
    subject: '',
    message: '',
    attachments: []
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Check if user is admin/superuser
  if (!user?.is_superuser) {
    return (
      <div className="form-container">
        <h1>{t('errors.unauthorizedError', 'Unauthorized Access')}</h1>
        <p>{t('admin.adminAccessRequired', 'Admin access required to view this page.')}</p>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: files
    }));
  };

  const removeFile = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.recipientEmail.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setResult({
        type: 'error',
        message: t('admin.testEmailRequired', 'All fields are required')
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('recipient_email', formData.recipientEmail);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('admin_email', 'elvissikapi@gmail.com');

      // Add attachments
      formData.attachments.forEach((file, index) => {
        formDataToSend.append(`attachment_${index}`, file);
      });

      const response = await api.post('/api/admin/test-email/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult({
        type: 'success',
        message: t('admin.testEmailSent', 'Test emails sent successfully!')
      });

      // Reset form
      setFormData({
        recipientEmail: '',
        subject: '',
        message: '',
        attachments: []
      });

      // Reset file input
      const fileInput = document.getElementById('attachments');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error sending test email:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.detail || t('admin.testEmailFailed', 'Failed to send test email')
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="form-container">
      <h1>{t('admin.testEmailTool', 'Admin Test Email Tool')}</h1>
      <p className="form-subtitle">
        {t('admin.testEmailDescription', 'Send a test email to any recipient with optional file attachments. A copy will also be sent to elvissikapi@gmail.com.')}
      </p>

      {result && (
        <div className={`form-message ${result.type === 'error' ? 'error' : 'success'}`}>
          {result.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="test-email-form">
        <div className="form-group">
          <label htmlFor="recipientEmail">
            {t('admin.recipientEmail', 'Recipient Email')} *
          </label>
          <input
            type="email"
            id="recipientEmail"
            name="recipientEmail"
            value={formData.recipientEmail}
            onChange={handleInputChange}
            placeholder={t('admin.recipientEmailPlaceholder', 'Enter recipient email address')}
            required
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="subject">
            {t('admin.emailSubject', 'Subject')} *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder={t('admin.emailSubjectPlaceholder', 'Enter email subject')}
            required
            disabled={sending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">
            {t('admin.emailMessage', 'Message')} *
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            placeholder={t('admin.emailMessagePlaceholder', 'Enter your message here...')}
            rows={10}
            required
            disabled={sending}
            style={{ minHeight: '200px', resize: 'vertical' }}
          />
          <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
            Write your message here. Line breaks will be preserved. Your message will be formatted with the EGS logo and contact information.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="attachments">
            {t('admin.attachments', 'Attachments')} ({t('admin.optional', 'optional')})
          </label>
          <input
            type="file"
            id="attachments"
            multiple
            onChange={handleFileChange}
            disabled={sending}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xlsx,.xls,.ppt,.pptx"
          />
          <div className="form-help">
            {t('admin.attachmentHelp', 'You can select multiple files. Supported formats: PDF, DOC, images, ZIP, etc.')}
          </div>
        </div>

        {formData.attachments.length > 0 && (
          <div className="form-group">
            <label>{t('admin.selectedFiles', 'Selected Files')}:</label>
            <div className="file-list">
              {formData.attachments.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="file-remove-btn"
                    disabled={sending}
                    title={t('admin.removeFile', 'Remove file')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className={`form-button ${sending ? 'sending' : ''}`}
            disabled={sending}
          >
            {sending
              ? t('admin.sendingEmail', 'Sending...')
              : t('admin.sendTestEmail', 'Send Test Email')
            }
          </button>
        </div>
      </form>

      <div className="test-email-info">
        <h3>{t('admin.emailPreview', 'Email Details')}</h3>
        <div className="email-preview">
          <p><strong>{t('admin.recipients', 'Recipients')}:</strong></p>
          <ul>
            <li>{formData.recipientEmail || t('admin.recipientNotSet', 'Not set')}</li>
            <li>elvissikapi@gmail.com {t('admin.adminCopy', '(Admin copy)')}</li>
          </ul>
          {formData.attachments.length > 0 && (
            <>
              <p><strong>{t('admin.attachmentCount', 'Attachments')}:</strong> {formData.attachments.length}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTestEmail;