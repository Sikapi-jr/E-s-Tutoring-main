// src/pages/GroupTutoring.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoring = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');

  // Check if user is admin
  const isAdmin = user?.roles === 'admin' || user?.is_staff;

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, enrollmentsRes] = await Promise.all([
        api.get('/api/group-tutoring/classes/'),
        api.get('/api/group-tutoring/enrollments/')
      ]);

      setClasses(classesRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch (err) {
      console.error('Error fetching group tutoring data:', err);
      setError('Failed to load group tutoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    try {
      await api.post(`/api/group-tutoring/enrollments/${enrollmentId}/approve/`);
      alert('Enrollment approved successfully');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error approving enrollment:', err);
      alert('Failed to approve enrollment');
    }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await api.post(`/api/group-tutoring/enrollments/${enrollmentId}/reject/`, {
        admin_notes: reason
      });
      alert('Enrollment rejected');
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error rejecting enrollment:', err);
      alert('Failed to reject enrollment');
    }
  };

  // Non-admin view
  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>This page is only accessible to administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Group Tutoring Management</h1>

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

      {/* Classes Overview */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Active Classes</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {classes.filter(c => c.is_active).map(classItem => (
            <div
              key={classItem.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#192A88' }}>
                {classItem.title}
              </h3>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Difficulty:</strong> {classItem.difficulty.replace('_', ' ').toUpperCase()}
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Subject:</strong> {classItem.subject}
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Dates:</strong> {new Date(classItem.start_date).toLocaleDateString()} - {new Date(classItem.end_date).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Enrollment:</strong> {classItem.enrolled_count} / {classItem.max_students}
                {classItem.is_full && <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>(FULL)</span>}
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                <strong>Quizzes:</strong> {classItem.num_quizzes}
              </div>
            </div>
          ))}
        </div>

        {classes.filter(c => c.is_active).length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            No active classes found. Use the Django admin panel to create classes.
          </p>
        )}
      </section>

      {/* Pending Enrollments */}
      <section>
        <h2 style={{ marginBottom: '1rem' }}>Pending Enrollments</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Parent</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Class</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Diagnostic Score</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments
                .filter(e => ['pending_diagnostic', 'diagnostic_submitted'].includes(e.status))
                .map(enrollment => (
                  <tr key={enrollment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '1rem' }}>{enrollment.student_name}</td>
                    <td style={{ padding: '1rem' }}>{enrollment.parent_name}</td>
                    <td style={{ padding: '1rem' }}>{enrollment.class_title}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        backgroundColor: enrollment.status === 'diagnostic_submitted' ? '#ffc107' : '#6c757d',
                        color: 'white'
                      }}>
                        {enrollment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {enrollment.diagnostic_score !== null ? `${enrollment.diagnostic_score.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(enrollment.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {enrollment.status === 'diagnostic_submitted' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApproveEnrollment(enrollment.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectEnrollment(enrollment.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {enrollment.status === 'pending_diagnostic' && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          Waiting for diagnostic test
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {enrollments.filter(e => ['pending_diagnostic', 'diagnostic_submitted'].includes(e.status)).length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem', backgroundColor: 'white' }}>
            No pending enrollments.
          </p>
        )}
      </section>

      {/* All Enrollments */}
      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>All Enrollments</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Class</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Difficulty</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Enrolled Date</th>
              </tr>
            </thead>
            <tbody>
              {enrollments
                .filter(e => e.status === 'enrolled')
                .map(enrollment => (
                  <tr key={enrollment.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '1rem' }}>{enrollment.student_name}</td>
                    <td style={{ padding: '1rem' }}>{enrollment.class_title}</td>
                    <td style={{ padding: '1rem' }}>{enrollment.class_difficulty}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        backgroundColor: '#28a745',
                        color: 'white'
                      }}>
                        ENROLLED
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {enrollments.filter(e => e.status === 'enrolled').length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem', backgroundColor: 'white' }}>
            No enrolled students yet.
          </p>
        )}
      </section>

      {/* Admin Quick Links */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Admin Quick Links</h3>
        <p style={{ marginBottom: '1rem' }}>Use the Django admin panel for advanced management:</p>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li><a href="/admin/playground/grouptutoringclass/" target="_blank" rel="noopener noreferrer">Manage Classes</a></li>
          <li><a href="/admin/playground/classsession/" target="_blank" rel="noopener noreferrer">Manage Class Sessions</a></li>
          <li><a href="/admin/playground/diagnostictest/" target="_blank" rel="noopener noreferrer">Manage Diagnostic Tests</a></li>
          <li><a href="/admin/playground/classfile/" target="_blank" rel="noopener noreferrer">Upload Class Files</a></li>
          <li><a href="/admin/playground/quiz/" target="_blank" rel="noopener noreferrer">Manage Quizzes</a></li>
          <li><a href="/admin/playground/classattendance/" target="_blank" rel="noopener noreferrer">Mark Attendance</a></li>
        </ul>
      </section>
    </div>
  );
};

export default GroupTutoring;
