import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const AdminDisputes = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending'); // pending, resolved, dismissed, all
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.is_superuser) {
      window.location.href = '/';
    }
  }, [user]);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/disputes/');
      let filteredDisputes = response.data;
      
      if (filter !== 'all') {
        filteredDisputes = response.data.filter(dispute => dispute.status === filter);
      }
      
      setDisputes(filteredDisputes);
    } catch (error) {
      setError('Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleDisputeAction = async (disputeId, action) => {
    try {
      setActionLoading(true);
      await api.patch(`/api/disputes/${disputeId}/manage/`, {
        action: action,
        admin_reply: adminReply
      });
      
      // Refresh disputes list
      fetchDisputes();
      setSelectedDispute(null);
      setAdminReply('');
    } catch (error) {
      setError('Failed to process dispute action');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'resolved': return '#28a745';
      case 'dismissed': return '#6c757d';
      default: return '#000';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!user?.is_superuser) {
    return <div>{t('errors.accessDenied')}</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>{t('admin.disputeManagementTitle')}</h1>
      
      {/* Filter Buttons */}
      <div style={{ marginBottom: '2rem' }}>
        {['pending', 'resolved', 'dismissed', 'all'].map(filterOption => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            style={{
              marginRight: '1rem',
              padding: '0.5rem 1rem',
              border: filter === filterOption ? '2px solid #192A88' : '1px solid #ccc',
              backgroundColor: filter === filterOption ? '#192A88' : 'white',
              color: filter === filterOption ? 'white' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {filterOption} ({disputes.filter(d => filterOption === 'all' || d.status === filterOption).length})
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>{t('admin.loadingDisputes')}</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {disputes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              {t('admin.noDisputesFound', { filter: filter !== 'all' ? filter : '' })}
            </div>
          ) : (
            disputes.map(dispute => (
              <div
                key={dispute.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>
                      {t('admin.disputeNumber', { id: dispute.id })}
                      <span
                        style={{
                          marginLeft: '1rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          backgroundColor: getStatusColor(dispute.status),
                          color: 'white'
                        }}
                      >
                        {dispute.status.toUpperCase()}
                      </span>
                    </h3>
                    <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
                      {t('admin.reportedBy')}: {dispute.complainer_name} ({dispute.complainer_username})
                    </p>
                    <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
                      {t('admin.submitted')}: {formatDateTime(dispute.created_at)}
                    </p>
                  </div>
                </div>

                {/* Session Details */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{t('admin.sessionDetailsTitle')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div><strong>{t('admin.student')}:</strong> {dispute.hour_details.student_name}</div>
                    <div><strong>{t('admin.tutor')}:</strong> {dispute.hour_details.tutor_name}</div>
                    <div><strong>{t('admin.date')}:</strong> {dispute.hour_details.date}</div>
                    <div><strong>{t('common.time')}:</strong> {dispute.hour_details.startTime} - {dispute.hour_details.endTime}</div>
                    <div><strong>{t('admin.duration')}:</strong> {dispute.hour_details.totalTime} {t('common.hours')}</div>
                    <div><strong>{t('admin.location')}:</strong> {dispute.hour_details.location}</div>
                    <div><strong>{t('admin.subject')}:</strong> {dispute.hour_details.subject}</div>
                  </div>
                </div>

                {/* Dispute Message */}
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{t('admin.issueDescriptionTitle')}</h4>
                  <p style={{
                    margin: '0',
                    padding: '1rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    fontStyle: 'italic'
                  }}>
                    "{dispute.message}"
                  </p>
                </div>

                {/* Admin Reply (if resolved) */}
                {dispute.admin_reply && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{t('admin.adminResponseTitle')}</h4>
                    <p style={{
                      margin: '0',
                      padding: '1rem',
                      backgroundColor: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '4px'
                    }}>
                      {dispute.admin_reply}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                      {t('admin.resolvedBy')}: {dispute.resolved_by_name} {t('common.on', 'on')} {formatDateTime(dispute.resolved_at)}
                    </p>
                  </div>
                )}

                {/* Actions (for pending disputes) */}
                {dispute.status === 'pending' && (
                  <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    {selectedDispute === dispute.id ? (
                      <div>
                        <textarea
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder={t('admin.disputeResponsePlaceholder')}
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            resize: 'vertical',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleDisputeAction(dispute.id, 'resolve')}
                            disabled={actionLoading}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {actionLoading ? t('admin.processing') : t('admin.markAsResolved')}
                          </button>
                          <button
                            onClick={() => handleDisputeAction(dispute.id, 'dismiss')}
                            disabled={actionLoading}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {actionLoading ? t('admin.processing') : t('admin.markAsDismissed')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDispute(null);
                              setAdminReply('');
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: 'transparent',
                              color: '#666',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            {t('admin.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedDispute(dispute.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#192A88',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {t('admin.takeAction')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDisputes;