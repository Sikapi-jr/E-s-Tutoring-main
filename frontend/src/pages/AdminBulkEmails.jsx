import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';
import '../styles/Modal.css';
import '../styles/Form.css';

const AdminBulkEmails = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [showParentModal, setShowParentModal] = useState(false);
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [parentEmailData, setParentEmailData] = useState({
    parentCount: 0,
    subject: '',
    messageBody: '',
    bccEmails: '',
    files: []
  });
  const [tutorEmailData, setTutorEmailData] = useState({
    tutorCount: 0,
    subject: '',
    body: '',
    bccEmails: '',
    files: []
  });
  const [customEmailData, setCustomEmailData] = useState({
    emailList: '',
    subject: '',
    messageBody: '',
    bccEmails: '',
    files: []
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

  // Fetch parent and tutor email counts
  const fetchEmailCounts = async () => {
    try {
      const [parentResponse, tutorResponse] = await Promise.all([
        api.get('/api/admin/send-parent-emails/'),
        api.get('/api/admin/send-tutor-emails/')
      ]);

      setParentEmailData(prev => ({
        ...prev,
        parentCount: parentResponse.data.count
      }));

      setTutorEmailData(prev => ({
        ...prev,
        tutorCount: tutorResponse.data.count
      }));
    } catch (error) {
      console.error('Error fetching email counts:', error);
      setResult({
        type: 'error',
        message: 'Failed to fetch email counts'
      });
    }
  };

  useEffect(() => {
    fetchEmailCounts();
  }, []);

  const handleOpenParentModal = () => {
    setShowParentModal(true);
    setResult(null);
  };

  const handleOpenTutorModal = () => {
    setShowTutorModal(true);
    setResult(null);
  };

  const handleOpenCustomModal = () => {
    setShowCustomModal(true);
    setResult(null);
  };

  const handleCloseParentModal = () => {
    setShowParentModal(false);
  };

  const handleCloseTutorModal = () => {
    setShowTutorModal(false);
  };

  const handleCloseCustomModal = () => {
    setShowCustomModal(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setTutorEmailData(prev => ({
      ...prev,
      files: files
    }));
  };

  const removeFile = (indexToRemove) => {
    setTutorEmailData(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleParentFileChange = (e) => {
    const files = Array.from(e.target.files);
    setParentEmailData(prev => ({
      ...prev,
      files: files
    }));
  };

  const removeParentFile = (indexToRemove) => {
    setParentEmailData(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSendParentEmails = async () => {
    if (!parentEmailData.subject.trim() || !parentEmailData.messageBody.trim()) {
      setResult({
        type: 'error',
        message: 'Subject and body are required'
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('subject', parentEmailData.subject);
      formData.append('message_body', parentEmailData.messageBody);
      formData.append('bcc_emails', parentEmailData.bccEmails);

      // Add files
      parentEmailData.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await api.post('/api/admin/send-parent-emails/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { sent_count, failed_count, failed_emails } = response.data;
      let message = response.data.detail || `Emails sent to ${sent_count} parents`;

      if (failed_count > 0) {
        message += `\n\nFailed to send to ${failed_count} recipients`;
        if (failed_emails && failed_emails.length > 0) {
          message += `:\n${failed_emails.join(', ')}`;
        }
      }

      setResult({
        type: failed_count > 0 ? 'warning' : 'success',
        message: message
      });

      setTimeout(() => {
        if (failed_count === 0) {
          handleCloseParentModal();
          // Reset form
          setParentEmailData(prev => ({
            ...prev,
            subject: '',
            messageBody: '',
            bccEmails: '',
            files: []
          }));
        }
      }, 3000);

    } catch (error) {
      console.error('Error sending parent emails:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.error || 'Failed to send parent emails'
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendTutorEmails = async () => {
    if (!tutorEmailData.subject.trim() || !tutorEmailData.body.trim()) {
      setResult({
        type: 'error',
        message: 'Subject and body are required'
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('subject', tutorEmailData.subject);
      formData.append('body', tutorEmailData.body);
      formData.append('bcc_emails', tutorEmailData.bccEmails);

      // Add files
      tutorEmailData.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await api.post('/api/admin/send-tutor-emails/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { sent_count, failed_count, failed_emails } = response.data;
      let message = response.data.detail || `Emails sent to ${sent_count} tutors`;

      if (failed_count > 0) {
        message += `\n\nFailed to send to ${failed_count} recipients`;
        if (failed_emails && failed_emails.length > 0) {
          message += `:\n${failed_emails.join(', ')}`;
        }
      }

      setResult({
        type: failed_count > 0 ? 'warning' : 'success',
        message: message
      });

      setTimeout(() => {
        if (failed_count === 0) {
          handleCloseTutorModal();
          // Reset form
          setTutorEmailData(prev => ({
            ...prev,
            subject: '',
            body: '',
            bccEmails: '',
            files: []
          }));
        }
      }, 3000);

    } catch (error) {
      console.error('Error sending tutor emails:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.error || 'Failed to send tutor emails'
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendCustomEmails = async () => {
    if (!customEmailData.subject.trim() || !customEmailData.messageBody.trim()) {
      setResult({
        type: 'error',
        message: 'Subject and body are required'
      });
      return;
    }

    if (!customEmailData.emailList.trim()) {
      setResult({
        type: 'error',
        message: 'Email list is required'
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('subject', customEmailData.subject);
      formData.append('message_body', customEmailData.messageBody);
      formData.append('email_list', customEmailData.emailList);
      formData.append('bcc_emails', customEmailData.bccEmails);

      // Add files
      customEmailData.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await api.post('/api/admin/send-custom-emails/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { sent_count, failed_count, failed_emails } = response.data;
      let message = response.data.detail || `Emails sent to ${sent_count} recipients`;

      if (failed_count > 0) {
        message += `\n\nFailed to send to ${failed_count} recipients`;
        if (failed_emails && failed_emails.length > 0) {
          message += `:\n${failed_emails.join(', ')}`;
        }
      }

      setResult({
        type: failed_count > 0 ? 'warning' : 'success',
        message: message
      });

      setTimeout(() => {
        if (failed_count === 0) {
          handleCloseCustomModal();
          // Reset form
          setCustomEmailData(prev => ({
            ...prev,
            emailList: '',
            subject: '',
            messageBody: '',
            bccEmails: '',
            files: []
          }));
        }
      }, 3000);

    } catch (error) {
      console.error('Error sending custom emails:', error);
      setResult({
        type: 'error',
        message: error.response?.data?.error || 'Failed to send custom emails'
      });
    } finally {
      setSending(false);
    }
  };

  const handleCustomFileChange = (e) => {
    const files = Array.from(e.target.files);
    setCustomEmailData(prev => ({
      ...prev,
      files: files
    }));
  };

  const removeCustomFile = (indexToRemove) => {
    setCustomEmailData(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }));
  };

  return (
    <div className="form-container">
      <h1>Admin Bulk Email Tools</h1>
      <p className="form-subtitle">
        Send bulk emails to all parents or tutors in the system.
      </p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '30px', flexWrap: 'wrap' }}>
        {/* Parent Email Button */}
        <div style={{ flex: '1', minWidth: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Send to All Parents</h3>
          <p>Send an email to all {parentEmailData.parentCount} unique parent emails</p>
          <ul style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            <li>Custom subject and body</li>
            <li>Attach files (optional)</li>
            <li>Add BCC recipients (optional)</li>
          </ul>
          <button
            onClick={handleOpenParentModal}
            className="form-button"
            style={{ width: '100%' }}
          >
            Send Parent Emails ({parentEmailData.parentCount} recipients)
          </button>
        </div>

        {/* Tutor Email Button */}
        <div style={{ flex: '1', minWidth: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Send to All Tutors</h3>
          <p>Send a custom email to all {tutorEmailData.tutorCount} tutors</p>
          <ul style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            <li>Custom subject and body</li>
            <li>Attach files (optional)</li>
            <li>Add BCC recipients (optional)</li>
          </ul>
          <button
            onClick={handleOpenTutorModal}
            className="form-button"
            style={{ width: '100%' }}
          >
            Send Tutor Emails ({tutorEmailData.tutorCount} recipients)
          </button>
        </div>

        {/* Custom Email List Button */}
        <div style={{ flex: '1', minWidth: '300px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Send to Custom List</h3>
          <p>Send an email to your own custom list of recipients</p>
          <ul style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            <li>Paste your email list (comma or newline separated)</li>
            <li>Custom subject and HTML body</li>
            <li>Attach files (optional)</li>
            <li>Add BCC recipients (optional)</li>
          </ul>
          <button
            onClick={handleOpenCustomModal}
            className="form-button"
            style={{ width: '100%' }}
          >
            Send Custom List Emails
          </button>
        </div>
      </div>

      {/* Parent Email Modal */}
      {showParentModal && (
        <div className="modal-overlay" onClick={handleCloseParentModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Email to All Parents</h2>
              <button className="modal-close" onClick={handleCloseParentModal}>×</button>
            </div>

            <div className="modal-body">
              {result && (
                <div className={`form-message ${result.type === 'error' ? 'error' : 'success'}`}>
                  {result.message}
                </div>
              )}

              <div className="form-group">
                <label>Recipients: {parentEmailData.parentCount} unique parent emails</label>
              </div>

              <div className="form-group">
                <label htmlFor="parentSubject">
                  Subject *
                </label>
                <input
                  type="text"
                  id="parentSubject"
                  value={parentEmailData.subject}
                  onChange={(e) => setParentEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  disabled={sending}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentBody">
                  Email Message *
                </label>
                <textarea
                  id="parentBody"
                  value={parentEmailData.messageBody}
                  onChange={(e) => setParentEmailData(prev => ({ ...prev, messageBody: e.target.value }))}
                  rows={10}
                  disabled={sending}
                  placeholder="Write your message here. Line breaks will be preserved in the email."
                  required
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Your message will be formatted with the EGS logo and contact information
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="parentFiles">
                  Attachments (optional)
                </label>
                <input
                  type="file"
                  id="parentFiles"
                  multiple
                  onChange={handleParentFileChange}
                  disabled={sending}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xlsx,.xls,.ppt,.pptx"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Supported formats: PDF, DOC, images, ZIP, etc.
                </small>
              </div>

              {parentEmailData.files.length > 0 && (
                <div className="form-group">
                  <label>Selected Files:</label>
                  <div className="file-list">
                    {parentEmailData.files.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeParentFile(index)}
                          className="file-remove-btn"
                          disabled={sending}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="parentBcc">
                  BCC Emails (optional)
                </label>
                <input
                  type="text"
                  id="parentBcc"
                  value={parentEmailData.bccEmails}
                  onChange={(e) => setParentEmailData(prev => ({ ...prev, bccEmails: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                  disabled={sending}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Separate multiple emails with commas
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCloseParentModal}
                className="modal-button cancel"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendParentEmails}
                className="modal-button confirm"
                disabled={sending}
              >
                {sending ? 'Sending...' : `Send to ${parentEmailData.parentCount} Parents`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Email Modal */}
      {showTutorModal && (
        <div className="modal-overlay" onClick={handleCloseTutorModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Email to All Tutors</h2>
              <button className="modal-close" onClick={handleCloseTutorModal}>×</button>
            </div>

            <div className="modal-body">
              {result && (
                <div className={`form-message ${result.type === 'error' ? 'error' : 'success'}`}>
                  {result.message}
                </div>
              )}

              <div className="form-group">
                <label>Recipients: {tutorEmailData.tutorCount} tutors</label>
              </div>

              <div className="form-group">
                <label htmlFor="tutorSubject">
                  Subject *
                </label>
                <input
                  type="text"
                  id="tutorSubject"
                  value={tutorEmailData.subject}
                  onChange={(e) => setTutorEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  disabled={sending}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tutorBody">
                  Message Body (HTML Supported) *
                </label>
                <textarea
                  id="tutorBody"
                  value={tutorEmailData.body}
                  onChange={(e) => setTutorEmailData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter your message here (HTML supported)..."
                  rows={10}
                  disabled={sending}
                  required
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="tutorFiles">
                  Attachments (optional)
                </label>
                <input
                  type="file"
                  id="tutorFiles"
                  multiple
                  onChange={handleFileChange}
                  disabled={sending}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xlsx,.xls,.ppt,.pptx"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Supported formats: PDF, DOC, images, ZIP, etc.
                </small>
              </div>

              {tutorEmailData.files.length > 0 && (
                <div className="form-group">
                  <label>Selected Files:</label>
                  <div className="file-list">
                    {tutorEmailData.files.map((file, index) => (
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
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="tutorBcc">
                  BCC Emails (optional)
                </label>
                <input
                  type="text"
                  id="tutorBcc"
                  value={tutorEmailData.bccEmails}
                  onChange={(e) => setTutorEmailData(prev => ({ ...prev, bccEmails: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                  disabled={sending}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Separate multiple emails with commas
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCloseTutorModal}
                className="modal-button cancel"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendTutorEmails}
                className="modal-button confirm"
                disabled={sending}
              >
                {sending ? 'Sending...' : `Send to ${tutorEmailData.tutorCount} Tutors`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Email Modal */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={handleCloseCustomModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Email to Custom List</h2>
              <button className="modal-close" onClick={handleCloseCustomModal}>×</button>
            </div>

            <div className="modal-body">
              {result && (
                <div className={`form-message ${result.type === 'error' ? 'error' : 'success'}`}>
                  {result.message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="customEmailList">
                  Email List *
                </label>
                <textarea
                  id="customEmailList"
                  value={customEmailData.emailList}
                  onChange={(e) => setCustomEmailData(prev => ({ ...prev, emailList: e.target.value }))}
                  placeholder="Enter email addresses separated by commas or new lines&#10;example@email.com, another@email.com&#10;or&#10;example@email.com&#10;another@email.com"
                  rows={5}
                  disabled={sending}
                  required
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Separate emails with commas or new lines
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="customSubject">
                  Subject *
                </label>
                <input
                  type="text"
                  id="customSubject"
                  value={customEmailData.subject}
                  onChange={(e) => setCustomEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                  disabled={sending}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="customBody">
                  Email Message *
                </label>
                <textarea
                  id="customBody"
                  value={customEmailData.messageBody}
                  onChange={(e) => setCustomEmailData(prev => ({ ...prev, messageBody: e.target.value }))}
                  rows={10}
                  disabled={sending}
                  placeholder="Write your message here. Line breaks will be preserved in the email."
                  required
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Your message will be formatted with the EGS logo and contact information
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="customFiles">
                  Attachments (optional)
                </label>
                <input
                  type="file"
                  id="customFiles"
                  multiple
                  onChange={handleCustomFileChange}
                  disabled={sending}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.xlsx,.xls,.ppt,.pptx"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Supported formats: PDF, DOC, images, ZIP, etc.
                </small>
              </div>

              {customEmailData.files.length > 0 && (
                <div className="form-group">
                  <label>Selected Files:</label>
                  <div className="file-list">
                    {customEmailData.files.map((file, index) => (
                      <div key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCustomFile(index)}
                          className="file-remove-btn"
                          disabled={sending}
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="customBcc">
                  BCC Emails (optional)
                </label>
                <input
                  type="text"
                  id="customBcc"
                  value={customEmailData.bccEmails}
                  onChange={(e) => setCustomEmailData(prev => ({ ...prev, bccEmails: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                  disabled={sending}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Separate multiple emails with commas
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCloseCustomModal}
                className="modal-button cancel"
                disabled={sending}
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomEmails}
                className="modal-button confirm"
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send Emails'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBulkEmails;
