import React, { useState, useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import RequestTutorModal from "../components/RequestTutorModal";
import "../styles/ViewReply.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ViewReply = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const parent = user.account_id;

  /* redirect non‑parents */
  if (user.roles !== "parent" && user.is_superuser === 0) {
    navigate("/login");
  }

  /* state */
  const [requests, setRequests] = useState([]);
  const [replies, setReplies] = useState([]);
  const [selectedRequestID, setSelectedRequestID] = useState(null);
  const [showReplies, setShowReplies] = useState(false);
  const [error, setError] = useState("");
  const [tutorDocuments, setTutorDocuments] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showUnassignPrompt, setShowUnassignPrompt] = useState(null);
  const [unassignReason, setUnassignReason] = useState("");
  const [showKeepDeletePrompt, setShowKeepDeletePrompt] = useState(null);

  /* fetch requests for parent */
  useEffect(() => {
    if (!parent) return;
    const fetchRequests = async () => {
      try {
        const res = await api.get(`/api/requests/PersonalList/?id=${parent}`);
        setRequests(res.data);
      } catch (err) {
        console.error("Error fetching user requests:", err);
        setError(t('errors.couldNotLoadRequests'));
      }
    };
    fetchRequests();
  }, [parent]);

  /* fetch tutor documents */
  const fetchTutorDocuments = async (tutorId) => {
    try {
      const res = await api.get(`/api/tutor/documents/?id=${tutorId}`);
      return res.data;
    } catch (err) {
      console.error("Error fetching tutor documents for tutor", tutorId, ":", err);
      return [];
    }
  };

  /* view replies for one request */
  const handleRequestSelection = async request => {
    const id = request.id;
    setSelectedRequestID(id);
    setShowReplies(prev => (id === selectedRequestID ? !prev : true));

    try {
      const res = await api.get(
        `/api/requests/ViewReply/?parent=${parent}&selectedRequestID=${id}`
      );
      setReplies(res.data);

      // Fetch documents for each tutor in the replies
      const documentPromises = res.data.map(async (reply) => {
        if (reply.tutor) {
          const docs = await fetchTutorDocuments(reply.tutor);
          return { tutorId: reply.tutor, documents: docs };
        }
        return { tutorId: reply.tutor, documents: [] };
      });

      const allDocuments = await Promise.all(documentPromises);
      
      const documentsMap = {};
      allDocuments.forEach(({ tutorId, documents }) => {
        documentsMap[tutorId] = documents;
      });
      setTutorDocuments(documentsMap);

    } catch (err) {
      console.error("Error fetching replies");
      setError(t('errors.couldNotLoadReplies'));
    }
  };

  /* accept / decline */
  const handleAcceptedReply = async (request, reply) => {
    const payload = {
      request: request.id,
      parent,
      student: request.student,
      tutor: reply.tutor,
    };
    try {
      await api.post(
        "/api/requests/AcceptReply/",
        payload
      );
      
      // Show success message or update UI to show acceptance
      // Remove this reply from the list since it's been accepted
      setReplies(prevReplies => prevReplies.filter(r => r.id !== reply.id));
      
      alert(t('replies.replyAccepted') || 'Reply accepted successfully!');
      
      // Force page refresh to prevent crashes when accepting multiple requests
      window.location.reload();
      
    } catch {
      console.error("Error creating relation");
      alert(t('errors.acceptReplyFailed') || 'Failed to accept reply. Please try again.');
    }
  };

  const handleDeniedReply = async (request, reply) => {
    try {
      await api.post(
        `/api/requests/RejectReply/?replyID=${reply.id}`
      );
      
      // Update the replies state to remove the rejected reply instead of refreshing
      setReplies(prevReplies => prevReplies.filter(r => r.id !== reply.id));
      
      // Also remove documents for this tutor if no other replies from same tutor
      const remainingRepliesFromSameTutor = replies.filter(r => r.id !== reply.id && r.tutor === reply.tutor);
      if (remainingRepliesFromSameTutor.length === 0) {
        setTutorDocuments(prev => {
          const updated = { ...prev };
          delete updated[reply.tutor];
          return updated;
        });
      }
      
    } catch {
      console.error("Error rejecting reply");
    }
  };

  /* delete request */
  const handleDeleteRequest = async (requestId) => {
    try {
      await api.delete(
        `/api/requests/PersonalList/?request_id=${requestId}&parent_id=${parent}`
      );

      // Remove the deleted request from the state
      setRequests(prevRequests => prevRequests.filter(req => req.id !== requestId));

      // Close confirmation dialog
      setShowDeleteConfirm(null);

      // Reset selected request if it was deleted
      if (selectedRequestID === requestId) {
        setSelectedRequestID(null);
        setShowReplies(false);
        setReplies([]);
      }

    } catch (err) {
      console.error("Error deleting request:", err);
      alert(t('errors.deleteRequestFailed') || 'Failed to delete request. Please try again.');
    }
  };

  /* handle successful request creation */
  const handleRequestSuccess = async () => {
    // Refresh the requests list
    try {
      const res = await api.get(`/api/requests/PersonalList/?id=${parent}`);
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching user requests:", err);
    }
  };

  /* handle unassign tutor */
  const handleUnassignClick = (request) => {
    setShowUnassignPrompt(request);
  };

  const handleUnassignSubmit = async () => {
    if (!unassignReason.trim()) {
      alert(t('requests.unassignReasonRequired', 'Please provide a reason for unassigning the tutor.'));
      return;
    }

    // Hide the reason prompt and show keep/delete prompt
    setShowUnassignPrompt(null);
    setShowKeepDeletePrompt(showUnassignPrompt);
  };

  const handleFinalUnassign = async (deleteRequest) => {
    const request = showKeepDeletePrompt;
    try {
      const payload = {
        tutor_id: request.accepted_tutor_id,
        student_id: request.student,
        reason: unassignReason,
        delete_request: deleteRequest
      };

      await api.post("/api/parent-unassign-tutor/", payload);

      alert(t('requests.unassignSuccess', 'Tutor has been successfully unassigned and notified.'));

      // Reset state
      setShowKeepDeletePrompt(null);
      setUnassignReason("");

      // Refresh the requests list
      if (deleteRequest) {
        setRequests(prevRequests => prevRequests.filter(req => req.id !== request.id));
      } else {
        // Refresh to show updated status
        const res = await api.get(`/api/requests/PersonalList/?id=${parent}`);
        setRequests(res.data);
      }
    } catch (error) {
      console.error("Error unassigning tutor:", error);
      alert(t('requests.unassignError', 'Error unassigning tutor. Please try again.'));
      setShowKeepDeletePrompt(null);
    }
  };

  const handleCancelUnassign = () => {
    setShowUnassignPrompt(null);
    setShowKeepDeletePrompt(null);
    setUnassignReason("");
  };

  /* render */
  return (
    <div className="view-reply-wrapper">
      <div className="reply-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>{t('requests.viewRequests', 'View Requests')}</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#192A88',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0d1654'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#192A88'}
          >
            + {t('requests.requestTutor')}
          </button>
        </div>

        {requests.length === 0 ? (
          <p>{t('requests.noRequestsMade')}</p>
        ) : (
          <ul className="requests-list">
            {requests.map(request => {
              const isAccepted = request.is_accepted === "Accepted";
              return (
              <li key={request.id} className={`request-box ${isAccepted ? 'accepted-request' : ''}`}>
                <strong>{t('dashboard.student')}:</strong> {request.student_details?.firstName} {request.student_details?.lastName} <br />
                <strong>{t('dashboard.subject')}:</strong> {request.subject} <br />
                <strong>{t('requests.gradeLevel')}:</strong> {request.grade} <br />
                <strong>{t('common.service')}:</strong> {request.service} <br />
                <strong>{t('requests.city')}:</strong> {request.city} <br />
                <strong>{t('common.description')}:</strong> {request.description} <br />
                <br />
                {isAccepted ? (
                  <div>
                    <div className="accepted-message">
                      <strong style={{ color: '#28a745' }}>
                        {request.accepted_tutor_name} {t('requests.hasAccepted')}
                      </strong>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{
                        backgroundColor: '#fff3cd',
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        border: '1px solid #ffc107',
                        marginBottom: '0.75rem',
                        fontSize: '0.9rem',
                        color: '#856404',
                        lineHeight: '1.5'
                      }}>
                        {t('requests.unassignDescription', 'If you need to change tutors or end this tutoring relationship, you can unassign the current tutor. You will be able to choose whether to keep the request active for other tutors or delete it completely.')}
                      </div>
                      <button
                        onClick={() => handleUnassignClick(request)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.6rem 1.2rem',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                      >
                        {t('requests.unassignTutor', 'Unassign Tutor')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="request-actions">
                    <button
                      className="toggle-btn"
                      onClick={() => handleRequestSelection(request)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      {selectedRequestID === request.id && showReplies ? t('common.close', 'Close') : t('dashboard.viewReplies', 'View Replies')}
                    </button>
                    <button
                      className="delete-request-btn"
                      onClick={() => setShowDeleteConfirm(request.id)}
                      title={t('common.delete')}
                    >
                      🗑️
                    </button>
                  </div>
                )}

                {/* Show replies inline when selected */}
                {selectedRequestID === request.id && showReplies && !isAccepted && (
                  <div className="replies-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e9ecef' }}>
                    <h3 style={{ color: '#192A88', marginBottom: '1rem' }}>{t('replies.title', 'Tutor Replies')}</h3>
                    {replies.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: '#6c757d' }}>{t('replies.noRepliesYet', 'No replies yet. Tutors will respond soon to your request.')}</p>
                    ) : (
                      <ul className="replies-list" style={{ listStyle: 'none', padding: 0 }}>
                        {replies.map(reply => (
                          <li key={reply.id} className="reply-box" style={{
                            backgroundColor: '#f8f9fa',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ marginBottom: '1rem' }}>
                              <strong style={{ fontSize: '1.2rem', color: '#192A88' }}>
                                {reply.tutor_firstName} {reply.tutor_lastName}
                              </strong>
                              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '0.25rem' }}>
                                📧 {reply.tutor_email}
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.25rem' }}>
                                {t('replies.sentAt', 'Sent at')}: {new Date(reply.created_at).toLocaleString()}
                              </div>
                            </div>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '1rem',
                              borderRadius: '6px',
                              marginBottom: '1rem',
                              border: '1px solid #dee2e6'
                            }}>
                              <strong>{t('replies.message', 'Message')}:</strong>
                              <p style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>{reply.message}</p>
                            </div>

                            {/* Tutor Documents */}
                            {tutorDocuments[reply.tutor] && tutorDocuments[reply.tutor].length > 0 && (
                              <div style={{ marginBottom: '1rem' }}>
                                <strong>{t('replies.tutorDocuments', 'Tutor Documents')}:</strong>
                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                  {tutorDocuments[reply.tutor].map(doc => (
                                    <li key={doc.id}>
                                      <a
                                        href={`${API_BASE_URL}${doc.file}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#192A88', textDecoration: 'underline' }}
                                      >
                                        {doc.name}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                              <button
                                className="toggle-btn"
                                onClick={() => handleAcceptedReply(request, reply)}
                                style={{
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {t('replies.accept', 'Accept')}
                              </button>
                              <button
                                className="toggle-btn"
                                onClick={() => handleDeniedReply(request, reply)}
                                style={{
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {t('replies.decline', 'Decline')}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}

        {error && <p className="error-message">{error}</p>}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="delete-confirm-overlay">
            <div className="delete-confirm-dialog">
              <h3>{t('requests.confirmDelete') || 'Are you sure you want to delete this request?'}</h3>
              <p>{t('requests.deleteWarning') || 'This action cannot be undone. All replies to this request will also be deleted.'}</p>
              <div className="delete-confirm-actions">
                <button
                  className="confirm-delete-btn"
                  onClick={() => handleDeleteRequest(showDeleteConfirm)}
                >
                  {t('common.yes')}
                </button>
                <button
                  className="cancel-delete-btn"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Tutor Modal */}
        <RequestTutorModal
          isOpen={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSuccess={handleRequestSuccess}
        />

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
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    fontSize: '1rem',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleUnassignSubmit}
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
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
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    fontSize: '1.1rem',
                    padding: '1rem 1.5rem',
                    width: '100%'
                  }}
                >
                  {t('requests.keepRequestActive', 'Keep Request Active')}
                </button>
                <button
                  onClick={() => handleFinalUnassign(true)}
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    fontSize: '1.1rem',
                    padding: '1rem 1.5rem',
                    width: '100%'
                  }}
                >
                  {t('requests.deleteRequest', 'Delete Request')}
                </button>
                <button
                  onClick={handleCancelUnassign}
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
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

export default ViewReply;
