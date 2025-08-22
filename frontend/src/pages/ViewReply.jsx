import React, { useState, useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/ViewReply.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ViewReply = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const parent = user.account_id;
  const navigate = useNavigate();

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

  /* render */
  return (
    <div className="view-reply-wrapper">
      <div className="reply-card">
        <h1>{t('dashboard.viewReplies')}</h1>

        {requests.length === 0 ? (
          <p>{t('requests.noRequestsMade')}</p>
        ) : (
          <ul className="requests-list">
            {requests.map(request => {
              const isAccepted = request.is_accepted === "Accepted";
              return (
              <li key={request.id} className={`request-box ${isAccepted ? 'accepted-request' : ''}`}>
                <strong>{t('dashboard.student')}:</strong> {request.student.firstName} {request.student.lastName} <br />
                <strong>{t('dashboard.subject')}:</strong> {request.subject} <br />
                <strong>{t('requests.gradeLevel')}:</strong> {request.grade} <br />
                <strong>{t('common.service')}:</strong> {request.service} <br />
                <strong>{t('requests.city')}:</strong> {request.city} <br />
                <strong>{t('common.description')}:</strong> {request.description} <br />
                <br />
                {isAccepted ? (
                  <div className="accepted-message">
                    <strong style={{ color: '#28a745' }}>
                      {request.accepted_tutor_name} has accepted!
                    </strong>
                  </div>
                ) : (
                  <button
                    className="toggle-btn"
                    onClick={() => handleRequestSelection(request)}
                  >
                    {selectedRequestID === request.id && showReplies
                      ? t('common.cancel')
                      : t('dashboard.viewReplies')}
                  </button>
                )}

                {selectedRequestID === request.id && showReplies && !isAccepted && (
                  <ul className="replies-list">
                    {replies.length === 0 ? (
                      <li className="no-replies-message">
                        <p style={{ fontStyle: 'italic', color: '#666', textAlign: 'center', padding: '1rem' }}>
                          No replies yet. Tutors will respond to your request soon.
                        </p>
                      </li>
                    ) : (
                      replies.map(reply => (
                      <li key={reply.id} className="reply-item">
                        <strong>{t('replies.message')}:</strong> {reply.message} <br />
                        <strong>{t('replies.sentAt')}:</strong>{" "}
                        {new Date(reply.created_at).toLocaleString()} <br />
                        <strong>{t('replies.emailQuestions')}:</strong>{" "}
                        {reply.email || reply.tutor_email || "—"} <br />
                        
                        {/* Display tutor documents */}
                        <div className="tutor-documents-section">
                          <strong>{t('replies.tutorDocuments')}:</strong>
                          {(
                            tutorDocuments[reply.tutor] && tutorDocuments[reply.tutor].length > 0 ? (
                              <div className="tutor-documents">
                                <ul className="documents-list">
                                  {tutorDocuments[reply.tutor].map((doc) => (
                                    <li key={doc.id} className="document-item">
                                      <a 
                                        href={`${API_BASE_URL}${doc.file}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="document-link"
                                      >
                                        📄 {doc.file.split('/').pop()}
                                      </a>
                                      <span className="document-date">
                                        ({new Date(doc.uploaded_at).toLocaleDateString()})
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="no-documents">
                                <span style={{ color: '#666', fontStyle: 'italic' }}>
                                  {t('replies.noDocuments')}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                        
                        <div className="reply-actions">
                          <button
                            className="accept-btn"
                            onClick={() => handleAcceptedReply(request, reply)}
                          >
                            {t('replies.accept')}
                          </button>
                          <button
                            className="decline-btn"
                            onClick={() => handleDeniedReply(request, reply)}
                          >
                            {t('replies.decline')}
                          </button>
                        </div>
                      </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
              );
            })}
          </ul>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default ViewReply;
