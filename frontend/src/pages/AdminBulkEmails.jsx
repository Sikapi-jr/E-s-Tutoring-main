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
  const [parentEmailData, setParentEmailData] = useState({
    parentCount: 0,
    bccEmails: '',
    htmlBody: ''
  });
  const [tutorEmailData, setTutorEmailData] = useState({
    tutorCount: 0,
    subject: '',
    body: '',
    bccEmails: '',
    files: []
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Default HTML template for parent emails
  const defaultParentHTML = `<!doctype html>
<html>
<body style="margin:0; padding:0; background:#f4f4f4;">
  <center style="width:100%; padding:20px 0; background:#f4f4f4;">
    <table width="100%" style="max-width:600px; background:#ffffff; border-radius:8px; padding:32px; font-family:Arial, Helvetica, sans-serif;">
      <tr>
        <td style="text-align:center;">
          <img src="https://static.wixstatic.com/media/b72034_63e58f49589147d987fde676e33ffef0~mv2.jpg" alt="EGS Tutoring" style="width:100%; max-height:260px; object-fit:cover; border-radius:6px; display:block; margin-bottom:16px;">
        </td>
      </tr>

      <tr>
        <td style="font-size:15px; line-height:1.5; color:#333333;">

          <p>Hello,</p>

          <p>I hope this message finds you well. My name is <strong>Elvis Sikapi</strong>, and I represent EGS Tutoring. We offer bilingual (English/French) tutoring services to students across the GTA, from Toronto to Bowmanville.</p>

          <p>Our program provides both in-person and online support, guided by a qualified child psychologist. We are proud to have helped over 50 students achieve significant academic improvement, including students progressing from C to A grades. EGS Tutoring is also approved by a school director and a member of Conseil Scolaire Viamonde.</p>

          <p>We would like to kindly ask for your support in one of the following ways:</p>

          <ul style="margin:0 0 16px 24px; padding:0;">
            <li style="margin-bottom:8px;">Would you consider including EGS Tutoring as a recommended resource in your school newsletter or newspaper?</li>
            <li>Alternatively, could we schedule a brief call or meeting to discuss how our services can be a safe, effective option for your students?</li>
          </ul>

          <p>Our mission is to support student learning while keeping families connected with the trusted schools in their communities.</p>

          <p>Thank you very much for your time and consideration. I look forward to hearing from you.</p>

          <p><strong>Best regards,</strong><br><br>Elvis Sikapi<br>EGS Tutoring<br>289-423-8434<br>info@egstutoring.ca</p>

          <div style="text-align:center; margin:22px 0;">
            <a href="tel:+12894238434" style="display:inline-block; background:#0b63d6; color:#ffffff; padding:12px 18px; border-radius:6px; text-decoration:none; font-weight:600; margin-right:8px;">Call Us</a>
            <a href="https://egstutoring.ca" style="display:inline-block; background:#eeeeee; color:#333333; padding:12px 18px; border-radius:6px; text-decoration:none; font-weight:600;">Visit Website</a>
          </div>

          <p style="font-size:12px; color:#777777; text-align:center; margin-top:20px;">
            EGS Tutoring · Bilingual Tutoring Across the GTA<br>
            Phone: 289-423-8434 · Email: info@egstutoring.ca
          </p>

        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;

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
        parentCount: parentResponse.data.count,
        htmlBody: defaultParentHTML
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

  const handleCloseParentModal = () => {
    setShowParentModal(false);
  };

  const handleCloseTutorModal = () => {
    setShowTutorModal(false);
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

  const handleSendParentEmails = async () => {
    if (!parentEmailData.htmlBody.trim()) {
      setResult({
        type: 'error',
        message: 'Email body cannot be empty'
      });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await api.post('/api/admin/send-parent-emails/', {
        subject: 'Message from EGS Tutoring',
        html_body: parentEmailData.htmlBody,
        bcc_emails: parentEmailData.bccEmails
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
            <li>Pre-filled template for school outreach</li>
            <li>Add BCC recipients (optional)</li>
            <li>Edit email body as needed</li>
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

              <div className="form-group">
                <label htmlFor="parentBody">
                  Email Body (HTML) *
                </label>
                <textarea
                  id="parentBody"
                  value={parentEmailData.htmlBody}
                  onChange={(e) => setParentEmailData(prev => ({ ...prev, htmlBody: e.target.value }))}
                  rows={15}
                  disabled={sending}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  required
                />
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
                  Message Body *
                </label>
                <textarea
                  id="tutorBody"
                  value={tutorEmailData.body}
                  onChange={(e) => setTutorEmailData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter your message here..."
                  rows={10}
                  disabled={sending}
                  required
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
    </div>
  );
};

export default AdminBulkEmails;
