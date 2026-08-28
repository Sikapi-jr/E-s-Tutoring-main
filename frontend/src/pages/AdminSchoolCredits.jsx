// src/pages/AdminSchoolCredits.jsx
// Admin verification queue for school-based credit-hour grants. Admin
// reviews each newly-created student's claimed school, can correct the
// school before deciding, then approves (grants the credit balance) or
// declines the request.
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/UserProvider';
import api from '../api';

const AdminSchoolCredits = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending'); // pending, approved, declined, all
  const [selectedId, setSelectedId] = useState(null);
  const [schoolCorrection, setSchoolCorrection] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const FILTERS = [
    { value: 'pending', label: t('admin.filterPending', 'Pending') },
    { value: 'approved', label: t('admin.filterApproved', 'Approved') },
    { value: 'declined', label: t('admin.filterDeclined', 'Declined') },
    { value: 'all', label: t('admin.filterAll', 'All') },
  ];

  useEffect(() => {
    if (user && !user.is_superuser && user.roles !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  useEffect(() => {
    api.get('/api/admin/schools/').then((res) => {
      setSchools(Array.isArray(res.data) ? res.data.filter((s) => s.is_active) : []);
    }).catch(() => {});
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/school-credits/?status=${filter}`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching school credit requests:', err);
      setError(t('admin.schoolCreditsFetchFailed', 'Failed to fetch school credit requests.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      setActionLoading(true);
      const payload = { action, admin_notes: adminNotes };
      if (schoolCorrection) payload.school = schoolCorrection;
      await api.patch(`/api/admin/school-credits/${id}/manage/`, payload);
      setSelectedId(null);
      setAdminNotes('');
      setSchoolCorrection('');
      fetchRequests();
    } catch (err) {
      console.error('Error processing school credit request:', err);
      alert(err?.response?.data?.error || t('admin.schoolCreditActionFailed', 'Failed to process this request.'));
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (status) => ({
    pending: '#ffc107', approved: '#28a745', declined: '#6c757d',
  }[status] || '#000');

  const statusLabel = (status) => ({
    pending: t('admin.filterPending', 'Pending'),
    approved: t('admin.filterApproved', 'Approved'),
    declined: t('admin.filterDeclined', 'Declined'),
  }[status] || status);

  if (!user) return <div style={{ padding: '2rem', textAlign: 'center' }}><p>{t('common.loading')}</p></div>;
  if (!user.is_superuser && user.roles !== 'admin') return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#192A88' }}>
        {t('admin.manageSchoolCredits', 'School Credit Requests')}
      </h1>

      <div style={{ marginBottom: '1.5rem' }}>
        {FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              marginRight: '1rem', padding: '0.5rem 1rem',
              border: filter === opt.value ? '2px solid #192A88' : '1px solid #ccc',
              backgroundColor: filter === opt.value ? '#192A88' : 'white',
              color: filter === opt.value ? 'white' : '#333',
              borderRadius: '4px', cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div>{t('common.loading')}</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          {t('admin.noSchoolCreditRequests', 'No school credit requests found for this filter.')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {requests.map((reqItem) => (
            <div key={reqItem.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>
                    {reqItem.student_firstName} {reqItem.student_lastName}
                    <span style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: statusColor(reqItem.status), color: 'white' }}>
                      {statusLabel(reqItem.status).toUpperCase()}
                    </span>
                  </h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {t('auth.parent')}: {reqItem.parent_firstName} {reqItem.parent_lastName} ({reqItem.parent_email})
                  </p>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    {t('admin.requestedAt', 'Requested')}: {new Date(reqItem.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <div><strong>{t('students.school', 'School')}:</strong> {reqItem.school_name}</div>
                <div><strong>{t('admin.creditHoursIfApproved', 'Credit hours if approved')}:</strong> {reqItem.credit_hours_snapshot}</div>
              </div>

              {reqItem.admin_notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: 0, padding: '0.75rem', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                    {reqItem.admin_notes}
                  </p>
                  {reqItem.reviewed_by_name && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                      {t('admin.reviewedByOn', 'Reviewed by {{name}} on {{date}}', {
                        name: reqItem.reviewed_by_name,
                        date: reqItem.reviewed_at ? new Date(reqItem.reviewed_at).toLocaleString() : '',
                      })}
                    </p>
                  )}
                </div>
              )}

              {reqItem.status === 'pending' && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  {selectedId === reqItem.id ? (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                        {t('admin.correctSchoolLabel', 'Correct the school first if needed (optional):')}
                      </label>
                      <select
                        value={schoolCorrection}
                        onChange={(e) => setSchoolCorrection(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '0.75rem' }}
                      >
                        <option value="">{t('admin.keepCurrentSchool', 'Keep current: {{school}}', { school: reqItem.school_name })}</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder={t('admin.notesOptionalPlaceholder', 'Notes (optional)...')}
                        rows={2}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '1rem', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleAction(reqItem.id, 'approve')}
                          disabled={actionLoading}
                          style={{ padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                        >
                          {actionLoading ? t('admin.processing', 'Processing...') : t('admin.approve', 'Approve')}
                        </button>
                        <button
                          onClick={() => handleAction(reqItem.id, 'decline')}
                          disabled={actionLoading}
                          style={{ padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
                        >
                          {actionLoading ? t('admin.processing', 'Processing...') : t('replies.decline', 'Decline')}
                        </button>
                        <button
                          onClick={() => { setSelectedId(null); setAdminNotes(''); setSchoolCorrection(''); }}
                          style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedId(reqItem.id)}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#192A88', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {t('admin.review', 'Review')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSchoolCredits;
