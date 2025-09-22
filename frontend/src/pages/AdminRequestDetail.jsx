// src/pages/AdminRequestDetail.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useUser } from "../components/UserProvider";

const AdminRequestDetail = () => {
  const { t } = useTranslation();
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRequestDetail();
  }, [requestId]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/requests/list/`);
      const allRequests = response.data || [];
      const foundRequest = allRequests.find(req => req.id.toString() === requestId);

      if (!foundRequest) {
        setError(t('admin.requestNotFound', 'Request not found'));
        return;
      }

      setRequest(foundRequest);
    } catch (error) {
      console.error('Error fetching request:', error);
      setError(t('admin.errorLoading', 'Error loading request'));
    } finally {
      setLoading(false);
    }
  };

  const handleContactParent = (parentInfo) => {
    const phone = parentInfo.parent_phone_number || parentInfo.phone_number;
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      alert(t('admin.noPhoneNumber', 'No phone number available for this parent.'));
    }
  };

  const handleEmailParent = (parentInfo) => {
    const email = parentInfo.parent_email || parentInfo.email;
    if (email) {
      window.open(`mailto:${email}`);
    } else {
      alert(t('admin.noEmail', 'No email available for this parent.'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
          Loading request details...
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#dc3545' }}>{t('common.error', 'Error')}</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>{error}</p>
        <button
          onClick={() => navigate('/admin-stale-requests')}
          style={{
            backgroundColor: '#192A88',
            color: 'white',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ← {t('common.back', 'Back to Requests')}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
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
          fontSize: '2.2rem'
        }}>
          {t('admin.requestDetail', 'Request Details')}
        </h1>
        <button
          onClick={() => navigate('/admin-stale-requests')}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          ← {t('common.back', 'Back to Requests')}
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '2px solid #e9ecef'
      }}>
        {/* Request Header */}
        <div style={{
          backgroundColor: '#192A88',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '2.5rem',
            fontWeight: 'bold'
          }}>
            {request.subject}
          </h2>
          <div style={{
            marginTop: '1rem',
            fontSize: '1.2rem',
            opacity: 0.9
          }}>
            Request ID: #{request.id}
          </div>
        </div>

        <div style={{ padding: '3rem' }}>
          {/* Student Information */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              color: '#192A88',
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '0.5rem'
            }}>
              👨‍🎓 Student Information
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              fontSize: '1.3rem',
              lineHeight: '2'
            }}>
              <div>
                <strong style={{ color: '#192A88' }}>Name:</strong>
                <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {request.student_firstName || 'N/A'} {request.student_lastName || ''}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Grade Level:</strong>
                <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {request.grade}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Service Type:</strong>
                <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {request.service}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>City:</strong>
                <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {request.city || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              color: '#192A88',
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '0.5rem'
            }}>
              👨‍👩‍👧‍👦 Parent Contact Information
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              fontSize: '1.3rem',
              lineHeight: '2'
            }}>
              <div>
                <strong style={{ color: '#192A88' }}>Parent Name:</strong>
                <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                  {request.parent_firstName || 'N/A'} {request.parent_lastName || ''}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Email:</strong>
                <div style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>
                  📧 {request.parent_email || 'No email available'}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Phone:</strong>
                <div style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>
                  📞 {request.parent_phone_number || request.phone_number || 'No phone available'}
                </div>
              </div>
            </div>

            {/* Contact Actions */}
            <div style={{
              marginTop: '2rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => handleContactParent(request)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                📞 Call Parent
              </button>
              <button
                onClick={() => handleEmailParent(request)}
                style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                📧 Email Parent
              </button>
            </div>
          </div>

          {/* Request Details */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              color: '#192A88',
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '0.5rem'
            }}>
              📝 Request Details
            </h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              fontSize: '1.2rem',
              lineHeight: '1.8'
            }}>
              {request.description || 'No description provided'}
            </div>
          </div>

          {/* Request Status & Timeline */}
          <div>
            <h3 style={{
              color: '#192A88',
              fontSize: '1.8rem',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #e9ecef',
              paddingBottom: '0.5rem'
            }}>
              ⏰ Request Status & Timeline
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              fontSize: '1.3rem'
            }}>
              <div>
                <strong style={{ color: '#192A88' }}>Status:</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{
                    fontSize: '1.3rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '25px',
                    backgroundColor: request.is_accepted ? '#d4edda' : '#fff3cd',
                    color: request.is_accepted ? '#155724' : '#856404',
                    border: `2px solid ${request.is_accepted ? '#c3e6cb' : '#ffeaa7'}`,
                    fontWeight: 'bold'
                  }}>
                    {request.is_accepted ? '✅ Accepted' : '⏳ Pending'}
                  </span>
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Created:</strong>
                <div style={{ fontSize: '1.3rem', marginTop: '0.5rem' }}>
                  {formatDate(request.created_at)}
                </div>
              </div>
              <div>
                <strong style={{ color: '#192A88' }}>Age:</strong>
                <div style={{
                  fontSize: '1.5rem',
                  marginTop: '0.5rem',
                  fontWeight: 'bold',
                  color: getDaysOld(request.created_at) > 14 ? '#dc3545' : (getDaysOld(request.created_at) > 7 ? '#ffc107' : '#28a745')
                }}>
                  {getDaysOld(request.created_at)} days old
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRequestDetail;