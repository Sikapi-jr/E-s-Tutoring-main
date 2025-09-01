// src/pages/AdminStaleRequests.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const AdminStaleRequests = () => {
  const { t } = useTranslation();
  const [requestsWithoutReplies, setRequestsWithoutReplies] = useState([]);
  const [requestsWithoutAcceptance, setRequestsWithoutAcceptance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStaleRequests();
  }, []);

  const fetchStaleRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date 1 week ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Fetch all tutoring requests
      const requestsRes = await api.get('/api/parentRequests/');
      const allRequests = requestsRes.data || [];

      // Fetch all replies
      const repliesRes = await api.get('/api/replies/');
      const allReplies = repliesRes.data || [];

      // Create a map of request IDs to their replies
      const requestRepliesMap = {};
      allReplies.forEach(reply => {
        if (!requestRepliesMap[reply.request_id || reply.request]) {
          requestRepliesMap[reply.request_id || reply.request] = [];
        }
        requestRepliesMap[reply.request_id || reply.request].push(reply);
      });

      // Filter requests posted more than 1 week ago
      const staleRequests = allRequests.filter(request => {
        const requestDate = new Date(request.date_created || request.created_at);
        return requestDate < oneWeekAgo;
      });

      // Separate into two categories
      const withoutReplies = [];
      const withoutAcceptance = [];

      staleRequests.forEach(request => {
        const replies = requestRepliesMap[request.id] || [];
        
        if (replies.length === 0) {
          // No replies at all
          withoutReplies.push({
            ...request,
            replies: []
          });
        } else {
          // Has replies but none accepted
          const hasAcceptedReply = replies.some(reply => 
            reply.status === 'accepted' || reply.accepted === true
          );
          
          if (!hasAcceptedReply) {
            withoutAcceptance.push({
              ...request,
              replies: replies
            });
          }
        }
      });

      setRequestsWithoutReplies(withoutReplies);
      setRequestsWithoutAcceptance(withoutAcceptance);
    } catch (error) {
      console.error('Error fetching stale requests:', error);
      setError('Failed to load stale requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactParent = (parentInfo) => {
    if (parentInfo.phone_number) {
      window.open(`tel:${parentInfo.phone_number}`);
    } else {
      alert(t('admin.noPhoneNumber', 'No phone number available for this parent.'));
    }
  };

  const handleEmailParent = (parentInfo) => {
    if (parentInfo.email) {
      window.open(`mailto:${parentInfo.email}`);
    } else {
      alert(t('admin.noEmail', 'No email available for this parent.'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysOld = (dateString) => {
    const requestDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - requestDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        <div>
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>🔄</div>
          Loading stale requests...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      fontFamily: '"Segoe UI", sans-serif'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        borderBottom: '2px solid #192A88',
        paddingBottom: '1rem'
      }}>
        <h1 style={{ 
          margin: 0, 
          color: '#192A88',
          fontSize: '2rem'
        }}>
          {t('admin.staleRequests', 'Stale Tutoring Requests')}
        </h1>
        <button
          onClick={fetchStaleRequests}
          style={{
            backgroundColor: '#192A88',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {t('common.refresh', 'Refresh')}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '2rem',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Requests Without Any Replies */}
        <div>
          <div style={{ 
            backgroundColor: '#fff3cd',
            padding: '1rem',
            borderRadius: '8px 8px 0 0',
            border: '1px solid #ffeaa7',
            borderBottom: 'none'
          }}>
            <h2 style={{ 
              margin: 0, 
              color: '#856404',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📭</span>
              {t('admin.noRepliesTitle', 'Requests Without Replies')}
              <span style={{ 
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                marginLeft: '0.5rem'
              }}>
                {requestsWithoutReplies.length}
              </span>
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#856404' }}>
              {t('admin.noRepliesDesc', 'Requests posted over 1 week ago with no tutor responses')}
            </p>
          </div>
          
          <div style={{ 
            border: '1px solid #ffeaa7',
            borderRadius: '0 0 8px 8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {requestsWithoutReplies.length > 0 ? (
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffeaa7' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#856404' }}>Request</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#856404' }}>Parent Info</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#856404' }}>Age</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#856404' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsWithoutReplies.map((request, index) => (
                    <tr key={request.id} style={{ 
                      borderBottom: '1px solid #ffeaa7',
                      backgroundColor: index % 2 === 0 ? '#fffbf0' : 'white'
                    }}>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', color: '#192A88', marginBottom: '0.25rem' }}>
                          {request.subject || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          <strong>Student:</strong> {request.student_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          <strong>Grade:</strong> {request.grade || 'N/A'} | 
                          <strong> Service:</strong> {request.service || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          <strong>Description:</strong> {request.description ? 
                            (request.description.length > 50 ? 
                              request.description.substring(0, 50) + '...' : 
                              request.description) : 'No description'
                          }
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {request.parent_firstName || ''} {request.parent_lastName || ''}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          📧 {request.parent_email || 'No email'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          📞 {request.parent_phone_number || 'No phone'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ 
                          color: getDaysOld(request.date_created || request.created_at) > 14 ? '#dc3545' : '#856404',
                          fontWeight: 'bold'
                        }}>
                          {getDaysOld(request.date_created || request.created_at)} days
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>
                          {formatDate(request.date_created || request.created_at)}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleContactParent(request)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            📞 Call
                          </button>
                          <button
                            onClick={() => handleEmailParent(request)}
                            style={{
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            📧 Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#666',
                backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <div>No requests without replies found!</div>
              </div>
            )}
          </div>
        </div>

        {/* Requests With Replies But No Acceptance */}
        <div>
          <div style={{ 
            backgroundColor: '#d1ecf1',
            padding: '1rem',
            borderRadius: '8px 8px 0 0',
            border: '1px solid #bee5eb',
            borderBottom: 'none'
          }}>
            <h2 style={{ 
              margin: 0, 
              color: '#0c5460',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💬</span>
              {t('admin.noAcceptanceTitle', 'Requests Without Acceptance')}
              <span style={{ 
                backgroundColor: '#ffc107',
                color: '#212529',
                padding: '0.25rem 0.5rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                marginLeft: '0.5rem'
              }}>
                {requestsWithoutAcceptance.length}
              </span>
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#0c5460' }}>
              {t('admin.noAcceptanceDesc', 'Requests with tutor replies but no accepted offers')}
            </p>
          </div>
          
          <div style={{ 
            border: '1px solid #bee5eb',
            borderRadius: '0 0 8px 8px',
            maxHeight: '600px',
            overflowY: 'auto'
          }}>
            {requestsWithoutAcceptance.length > 0 ? (
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#d1ecf1', borderBottom: '2px solid #bee5eb' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#0c5460' }}>Request</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#0c5460' }}>Parent Info</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#0c5460' }}>Replies</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#0c5460' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requestsWithoutAcceptance.map((request, index) => (
                    <tr key={request.id} style={{ 
                      borderBottom: '1px solid #bee5eb',
                      backgroundColor: index % 2 === 0 ? '#f0f9ff' : 'white'
                    }}>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', color: '#192A88', marginBottom: '0.25rem' }}>
                          {request.subject || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          <strong>Student:</strong> {request.student_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          <strong>Grade:</strong> {request.grade || 'N/A'} | 
                          <strong> Service:</strong> {request.service || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>
                          {getDaysOld(request.date_created || request.created_at)} days old
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {request.parent_firstName || ''} {request.parent_lastName || ''}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          📧 {request.parent_email || 'No email'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          📞 {request.parent_phone_number || 'No phone'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {request.replies.length} replies
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          {request.replies.slice(0, 2).map((reply, idx) => (
                            <div key={idx} style={{ marginBottom: '0.25rem' }}>
                              • {reply.tutor_firstName || 'Tutor'} {reply.tutor_lastName || ''}
                            </div>
                          ))}
                          {request.replies.length > 2 && (
                            <div style={{ fontStyle: 'italic' }}>
                              +{request.replies.length - 2} more...
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleContactParent(request)}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            📞 Call
                          </button>
                          <button
                            onClick={() => handleEmailParent(request)}
                            style={{
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            📧 Email
                          </button>
                          <button
                            onClick={() => window.location.href = `/admin-request-details/${request.id}`}
                            style={{
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            👁️ View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#666',
                backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <div>No requests awaiting acceptance found!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#192A88' }}>
          📊 Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
              {requestsWithoutReplies.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Requests Without Replies</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {requestsWithoutAcceptance.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Requests Without Acceptance</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {requestsWithoutReplies.length + requestsWithoutAcceptance.length}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Stale Requests</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStaleRequests;