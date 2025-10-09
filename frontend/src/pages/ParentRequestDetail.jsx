// src/pages/ParentRequestDetail.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useUser } from "../components/UserProvider";
import "../styles/TutorDashboard.css";

const ParentRequestDetail = () => {
  const { t } = useTranslation();
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [message, setMessage] = useState("");
  const [allReplies, setAllReplies] = useState([]);

  useEffect(() => {
    fetchRequestDetail();
  }, [requestId]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/requests/list/`);
      const allRequests = response.data || [];
      const foundRequest = allRequests.find(req => req.id.toString() === requestId);

      console.log('Found request:', foundRequest);
      console.log('User:', user);
      console.log('Request parent:', foundRequest?.parent);
      console.log('User account_id:', user?.account_id);
      console.log('User is_superuser:', user?.is_superuser);

      if (!foundRequest) {
        setError(t('dashboard.requestNotFound', 'Request not found'));
        return;
      }

      // Check if this request belongs to the current user or if user is a superuser
      // Convert both to strings for comparison to handle type mismatches
      const requestParent = foundRequest.parent?.toString();
      const userAccountId = user?.account_id?.toString();
      const isOwner = requestParent === userAccountId;
      const isSuperuser = user?.is_superuser === true || user?.is_superuser === 1;

      console.log('Is owner:', isOwner);
      console.log('Is superuser:', isSuperuser);
      console.log('Access granted:', isOwner || isSuperuser);

      if (!isOwner && !isSuperuser) {
        console.log('Access denied - not owner and not superuser');
        setError(t('dashboard.accessDenied', 'Access denied'));
        return;
      }

      setRequest(foundRequest);

      // If superadmin, fetch all replies for this request
      if (isSuperuser) {
        try {
          const repliesResponse = await api.get(`/api/requests/reply/?request=${requestId}`);
          setAllReplies(Array.isArray(repliesResponse.data) ? repliesResponse.data : []);
        } catch (err) {
          console.error('Error fetching replies:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      setError(t('dashboard.errorLoading', 'Error loading request'));
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = () => {
    setShowReplyBox(!showReplyBox);
    if (!showReplyBox) {
      setMessage("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const payload = {
        request: request.id,
        tutor: user.account_id,
        message: message,
      };

      await api.post("/api/requests/reply/", payload);
      setMessage("");
      setShowReplyBox(false);
      // Optionally refresh the request or show success message
      alert(t('dashboard.replySubmitted', 'Reply submitted successfully!'));
    } catch (error) {
      console.error("Error submitting reply:", error);
      alert(t('dashboard.errorSubmitting', 'Error submitting reply'));
    }
  };

  if (loading) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('dashboard.loadingRequest', 'Loading Request...')}</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('common.error', 'Error')}</h1>
          <p>{error}</p>
          <button onClick={() => navigate('/parent-dashboard')} className="reply-btn">
            {t('common.back', 'Back to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('dashboard.requestNotFound', 'Request Not Found')}</h1>
          <button onClick={() => navigate('/parent-dashboard')} className="reply-btn">
            {t('common.back', 'Back to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-wrapper">
      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#192A88' }}>
            {t('dashboard.requestDetail', 'Request Details')}
          </h1>
          <button
            onClick={() => navigate('/parent-dashboard')}
            className="reply-btn"
            style={{ backgroundColor: '#6c757d' }}
          >
            ← {t('common.back', 'Back to Dashboard')}
          </button>
        </div>

        <div className="request-detail-container" style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          border: '2px solid #e9ecef',
          marginBottom: '2rem'
        }}>
          <div className="request-info" style={{ lineHeight: '2', fontSize: '1.2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.4rem' }}>
                {t('dashboard.subject')}:
              </strong>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                {request.subject}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                {t('requests.gradeLevel')}:
              </strong>
              <span style={{ fontSize: '1.4rem', marginLeft: '1rem' }}>
                {request.grade}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                {t('common.service')}:
              </strong>
              <span style={{ fontSize: '1.4rem', marginLeft: '1rem' }}>
                {request.service}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                {t('common.description')}:
              </strong>
              <div style={{
                fontSize: '1.2rem',
                marginTop: '0.5rem',
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                lineHeight: '1.6'
              }}>
                {request.description}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                {t('dashboard.createdAt')}:
              </strong>
              <span style={{ fontSize: '1.2rem', marginLeft: '1rem' }}>
                {new Date(request.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                {t('dashboard.status')}:
              </strong>
              <span style={{
                fontSize: '1.2rem',
                marginLeft: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                backgroundColor: request.is_accepted === 'Accepted' ? '#d4edda' : '#fff3cd',
                color: request.is_accepted === 'Accepted' ? '#155724' : '#856404',
                border: `1px solid ${request.is_accepted === 'Accepted' ? '#c3e6cb' : '#ffeaa7'}`
              }}>
                {request.is_accepted === 'Accepted' ? t('dashboard.accepted', 'Accepted') : t('dashboard.pending', 'Pending')}
              </span>
            </div>

            {user?.is_superuser && request.is_accepted === 'Accepted' && request.accepted_tutor_name && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                    {t('dashboard.acceptedTutor', 'Accepted Tutor')}:
                  </strong>
                  <span style={{ fontSize: '1.4rem', marginLeft: '1rem', fontWeight: 'bold', color: '#28a745' }}>
                    {request.accepted_tutor_name}
                  </span>
                </div>

                {request.accepted_tutor_message && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <strong style={{ color: '#192A88', fontSize: '1.2rem' }}>
                      {t('dashboard.tutorMessage', "Tutor's Message")}:
                    </strong>
                    <div style={{
                      fontSize: '1.2rem',
                      marginTop: '0.5rem',
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6',
                      lineHeight: '1.6',
                      fontStyle: 'italic'
                    }}>
                      "{request.accepted_tutor_message}"
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Show all replies for superadmin */}
          {user?.is_superuser && allReplies.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #dee2e6' }}>
              <h3 style={{ color: '#192A88', marginBottom: '1rem' }}>
                {t('dashboard.allReplies', 'All Tutor Replies')} ({allReplies.length})
              </h3>
              {allReplies.map((reply) => (
                <div key={reply.id} style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  marginBottom: '1rem'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#192A88' }}>
                      {reply.tutor_firstName} {reply.tutor_lastName}
                    </strong>
                    <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '1rem' }}>
                      {new Date(reply.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                    {reply.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '2rem', borderTop: '2px solid #dee2e6', paddingTop: '2rem' }}>
            <button
              className="reply-btn"
              onClick={handleMessageClick}
              style={{
                fontSize: '1.1rem',
                padding: '1rem 2rem',
                minWidth: '200px'
              }}
            >
              {showReplyBox ? t('dashboard.cancel') : t('dashboard.reply')}
            </button>

            {showReplyBox && (
              <div style={{ marginTop: '1.5rem' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#192A88'
                    }}>
                      {t('dashboard.yourReply', 'Your Reply')}:
                    </label>
                    <textarea
                      className="reply-input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('dashboard.typeReply', 'Type your reply here...')}
                      required
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        fontSize: '1.1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '2px solid #192A88',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="reply-btn"
                    style={{
                      fontSize: '1.1rem',
                      padding: '1rem 2rem',
                      backgroundColor: '#28a745',
                      minWidth: '150px'
                    }}
                  >
                    {t('dashboard.submitReply', 'Submit Reply')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentRequestDetail;