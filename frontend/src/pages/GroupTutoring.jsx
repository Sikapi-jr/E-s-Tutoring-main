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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner',
    subject: 'French',
    tutors: [],
    start_date: '',
    end_date: '',
    schedule_days: [],
    schedule_time: '',
    duration_minutes: 60,
    location: '',
    location_link: '',
    max_students: 20,
    num_quizzes: 0,
    is_active: true
  });

  // Check if user is admin or superuser
  const isAdmin = user?.roles === 'admin' || user?.is_staff || user?.is_superuser;
  const isParent = user?.roles === 'parent';

  useEffect(() => {
    if (!isAdmin && !isParent) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, isAdmin, isParent]);

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

  const handleOpenCreateModal = async () => {
    try {
      const response = await api.get('/api/group-tutoring/classes/available_tutors/');
      setTutors(response.data);
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error fetching tutors:', err);
      alert('Failed to load tutors list');
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: '',
      description: '',
      difficulty: 'beginner',
      subject: 'French',
      tutors: [],
      start_date: '',
      end_date: '',
      schedule_days: [],
      schedule_time: '',
      duration_minutes: 60,
      location: '',
      location_link: '',
      max_students: 20,
      num_quizzes: 0,
      is_active: true
    });
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  const handleSubmitClass = async (e) => {
    e.preventDefault();

    try {
      await api.post('/api/group-tutoring/classes/', formData);
      alert('Class created successfully!');
      handleCloseCreateModal();
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error creating class:', err);
      alert('Failed to create class: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  // Non-authorized view
  if (!isAdmin && !isParent) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>This page is only accessible to administrators and parents.</p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>{isAdmin ? 'Group Tutoring Management' : 'Group Tutoring'}</h1>
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#192A88',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            + Create New Class
          </button>
        )}
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

      {/* Classes Overview */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>{isAdmin ? 'Active Classes' : 'Available Classes'}</h2>
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
              {classItem.tutor_details && classItem.tutor_details.length > 0 && (
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Tutors:</strong> {classItem.tutor_details.map(t => t.name).join(', ')}
                </div>
              )}
              <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <strong>Dates:</strong> {new Date(classItem.start_date).toLocaleDateString()} - {new Date(classItem.end_date).toLocaleDateString()}
              </div>
              {classItem.schedule_days && classItem.schedule_days.length > 0 && (
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Schedule:</strong> {classItem.schedule_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                  {classItem.schedule_time && ` at ${classItem.schedule_time}`}
                </div>
              )}
              {classItem.location && (
                <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <strong>Location:</strong> {classItem.location}
                  {classItem.location_link && (
                    <a href={classItem.location_link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', color: '#192A88' }}>
                      (Link)
                    </a>
                  )}
                </div>
              )}
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
            {isAdmin ? 'No active classes found. Use the Django admin panel to create classes.' : 'There are no open classes currently.'}
          </p>
        )}
      </section>

      {/* Admin-only sections */}
      {isAdmin && (
        <>
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
        </>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New Class</h2>

            <form onSubmit={handleSubmitClass}>
              {/* Basic Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#192A88' }}>Basic Information</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Class Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Difficulty *
                    </label>
                    <select
                      required
                      value={formData.difficulty}
                      onChange={(e) => handleFormChange('difficulty', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate_l1">Intermediate L1</option>
                      <option value="intermediate_l2">Intermediate L2</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => handleFormChange('subject', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Assigned Tutors
                  </label>
                  <select
                    multiple
                    value={formData.tutors}
                    onChange={(e) => handleFormChange('tutors', Array.from(e.target.selectedOptions, option => parseInt(option.value)))}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      minHeight: '120px'
                    }}
                  >
                    {tutors.map(tutor => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.name} ({tutor.email})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#666' }}>Hold Ctrl/Cmd to select multiple tutors</small>
                </div>
              </div>

              {/* Schedule & Location */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#192A88' }}>Schedule & Location</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => handleFormChange('start_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => handleFormChange('end_date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Class Days
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: formData.schedule_days.includes(day) ? '#192A88' : 'white',
                        color: formData.schedule_days.includes(day) ? 'white' : 'black'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.schedule_days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          style={{ marginRight: '0.5rem' }}
                        />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Class Time
                    </label>
                    <input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => handleFormChange('schedule_time', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      min="15"
                      step="15"
                      value={formData.duration_minutes}
                      onChange={(e) => handleFormChange('duration_minutes', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    placeholder="e.g., Room 101, Online - Zoom"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Location Link (for online classes)
                  </label>
                  <input
                    type="url"
                    value={formData.location_link}
                    onChange={(e) => handleFormChange('location_link', e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {/* Capacity & Settings */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#192A88' }}>Capacity & Settings</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Max Students *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.max_students}
                      onChange={(e) => handleFormChange('max_students', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Number of Quizzes
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.num_quizzes}
                      onChange={(e) => handleFormChange('num_quizzes', parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleFormChange('is_active', e.target.checked)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: 'bold' }}>Class is Active (accepting enrollments)</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoring;
