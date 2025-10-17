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
  const [showUnassignPrompt, setShowUnassignPrompt] = useState(false);
  const [unassignReason, setUnassignReason] = useState("");
  const [showKeepDeletePrompt, setShowKeepDeletePrompt] = useState(false);

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

  const handleUnassignClick = () => {
    setShowUnassignPrompt(true);
  };

  const handleUnassignSubmit = async () => {
    if (!unassignReason.trim()) {
      alert(t('requests.unassignReasonRequired', 'Please provide a reason for unassigning the tutor.'));
      return;
    }

    // Hide the reason prompt and show keep/delete prompt
    setShowUnassignPrompt(false);
    setShowKeepDeletePrompt(true);
  };

  const handleFinalUnassign = async (deleteRequest) => {
    try {
      const payload = {
        tutor_id: request.accepted_tutor_id,
        student_id: request.student,
        reason: unassignReason,
        delete_request: deleteRequest
      };

      const response = await api.post("/api/parent-unassign-tutor/", payload);

      alert(t('requests.unassignSuccess', 'Tutor has been successfully unassigned and notified.'));

      // Reset state
      setShowKeepDeletePrompt(false);
      setUnassignReason("");

      // Redirect to parent dashboard or refresh
      if (deleteRequest) {
        navigate('/parent-dashboard');
      } else {
        // Refresh the request detail to show updated status
        fetchRequestDetail();
      }
    } catch (error) {
      console.error("Error unassigning tutor:", error);
      alert(t('requests.unassignError', 'Error unassigning tutor. Please try again.'));
      setShowKeepDeletePrompt(false);
    }
  };

  const handleCancelUnassign = () => {
    setShowUnassignPrompt(false);
    setShowKeepDeletePrompt(false);
    setUnassignReason("");
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
            {t('navigation.dashboard', 'Dashboard')}
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
            {t('navigation.dashboard', 'Dashboard')}
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
            ← {t('navigation.dashboard', 'Dashboard')}
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
              <strong style={{ color: '#192A88', fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>
                {t('common.status')}:
              </strong>
              <span style={{
                fontSize: '1.2rem',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                backgroundColor: request.is_accepted === 'Accepted' ? '#d4edda' : '#fff3cd',
                color: request.is_accepted === 'Accepted' ? '#155724' : '#856404',
                border: `1px solid ${request.is_accepted === 'Accepted' ? '#c3e6cb' : '#ffeaa7'}`,
                display: 'inline-block'
              }}>
                {request.is_accepted === 'Accepted' ? t('dashboard.accepted', 'Accepted') : t('dashboard.pending', 'Pending')}
              </span>
            </div>

            {request.is_accepted === 'Accepted' && request.accepted_tutor_name && (
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

                {/* Unassign tutor button for parents */}
                {user?.roles === 'parent' && (
                  <div style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{
                      backgroundColor: '#fff3cd',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #ffc107',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ margin: 0, fontSize: '1rem', color: '#856404', lineHeight: '1.6' }}>
                        {t('requests.unassignDescription', 'If you need to change tutors or end this tutoring relationship, you can unassign the current tutor. You will be able to choose whether to keep the request active for other tutors or delete it completely.')}
                      </p>
                    </div>
                    <button
                      onClick={handleUnassignClick}
                      className="reply-btn"
                      style={{
                        backgroundColor: '#dc3545',
                        fontSize: '1.1rem',
                        padding: '1rem 2rem',
                        minWidth: '200px'
                      }}
                    >
                      {t('requests.unassignTutor', 'Unassign Tutor')}
                    </button>
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

        {/* Unassign reason prompt */}
        {showUnassignPrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#192A88' }}>
                {t('requests.unassignTutorTitle', 'Unassign Tutor')}
              </h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                {t('requests.unassignReasonPrompt', 'Please provide a reason for unassigning the tutor. This will be shared with the tutor.')}
              </p>
              <textarea
                value={unassignReason}
                onChange={(e) => setUnassignReason(e.target.value)}
                placeholder={t('requests.unassignReasonPlaceholder', 'Enter your reason here...')}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #192A88',
                  marginBottom: '1.5rem',
                  resize: 'vertical'
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancelUnassign}
                  className="reply-btn"
                  style={{
                    backgroundColor: '#6c757d',
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleUnassignSubmit}
                  className="reply-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  {t('common.continue', 'Continue')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keep or delete request prompt */}
        {showKeepDeletePrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ marginTop: 0, color: '#192A88' }}>
                {t('requests.requestActionTitle', 'What would you like to do with the request?')}
              </h2>
              <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
                {t('requests.requestActionPrompt', 'You can keep the request active so other tutors can respond, or delete it completely.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => handleFinalUnassign(false)}
                  className="reply-btn"
                  style={{
                    backgroundColor: '#28a745',
                    fontSize: '1.1rem',
                    padding: '1rem 1.5rem',
                    width: '100%'
                  }}
                >
                  {t('requests.keepRequestActive', 'Keep Request Active')}
                </button>
                <button
                  onClick={() => handleFinalUnassign(true)}
                  className="reply-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    fontSize: '1.1rem',
                    padding: '1rem 1.5rem',
                    width: '100%'
                  }}
                >
                  {t('requests.deleteRequest', 'Delete Request')}
                </button>
                <button
                  onClick={handleCancelUnassign}
                  className="reply-btn"
                  style={{
                    backgroundColor: '#6c757d',
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem',
                    width: '100%'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentRequestDetail;