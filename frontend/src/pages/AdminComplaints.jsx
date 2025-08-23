import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';
import '../styles/HoursPage.css';

const AdminComplaints = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.is_superuser) {
      window.location.href = '/';
    }
  }, [user]);

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [complaints, statusFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tutor-complaints/');
      setComplaints(response.data || []);
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...complaints];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(complaint => complaint.status === statusFilter);
    }
    
    setFilteredComplaints(filtered);
  };

  const handleComplaintAction = async (complaintId, action) => {
    try {
      setActionLoading(true);
      await api.patch(`/api/tutor-complaints/${complaintId}/manage/`, {
        action: action,
        admin_reply: adminReply
      });
      
      // Refresh complaints list
      fetchComplaints();
      setSelectedComplaint(null);
      setAdminReply('');
    } catch (error) {
      console.error('Failed to process complaint action:', error);
      setError('Failed to process complaint action');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'reviewed': return '#17a2b8';
      case 'resolved': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!user?.is_superuser) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Access denied</div>;
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading complaints...</div>;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: '#192A88', marginBottom: '0.5rem' }}>Tutor Complaints Management</h1>
        <p style={{ color: '#666', margin: 0 }}>
          Manage student complaints about tutors
        </p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold', minWidth: 'max-content' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '2px solid #E1E1E1',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </div>
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

      {/* Complaints Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="hours-table" style={{ width: '100%', minWidth: '900px' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Tutor</th>
              <th>Status</th>
              <th>Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  {statusFilter === 'all' ? 'No complaints found' : `No ${statusFilter} complaints found`}
                </td>
              </tr>
            ) : (
              filteredComplaints.map((complaint, index) => (
                <tr key={complaint.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                  <td data-label="Date">{formatDate(complaint.created_at)}</td>
                  <td data-label="Student">
                    {complaint.student_name} {complaint.student_lastname}
                  </td>
                  <td data-label="Tutor">
                    {complaint.tutor_name} {complaint.tutor_lastname}
                  </td>
                  <td data-label="Status">
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: getStatusColor(complaint.status),
                      color: 'white',
                      textTransform: 'capitalize'
                    }}>
                      {complaint.status}
                    </span>
                  </td>
                  <td data-label="Message" style={{ maxWidth: '300px' }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                    title={complaint.message}>
                      {complaint.message}
                    </div>
                  </td>
                  <td data-label="Actions">
                    {complaint.status === 'pending' && selectedComplaint !== complaint.id && (
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint.id);
                          setAdminReply(complaint.admin_reply || '');
                        }}
                        style={{
                          backgroundColor: '#192A88',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Take Action
                      </button>
                    )}
                    {selectedComplaint === complaint.id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
                        <textarea
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Admin response..."
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleComplaintAction(complaint.id, 'review')}
                            disabled={actionLoading}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleComplaintAction(complaint.id, 'resolve')}
                            disabled={actionLoading}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: actionLoading ? 'not-allowed' : 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedComplaint(null);
                              setAdminReply('');
                            }}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: 'transparent',
                              color: '#666',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.7rem'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {complaint.status !== 'pending' && complaint.admin_reply && (
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        <strong>Response:</strong>
                        <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                          "{complaint.admin_reply}"
                        </div>
                        <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                          by {complaint.reviewed_by_name} on {formatDateTime(complaint.reviewed_at)}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Message */}
      <div className="mobile-message" style={{ marginTop: '2rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          📱 For the best experience on mobile, rotate your device to landscape mode
        </p>
      </div>
    </div>
  );
};

export default AdminComplaints;