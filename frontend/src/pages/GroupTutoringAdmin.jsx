// src/pages/GroupTutoringAdmin.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringAdmin = () => {
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

  // Admin quick link modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classFiles, setClassFiles] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    week_number: '',
    is_current: false,
    file: null
  });
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: ''
  });
  const [scheduleForm, setScheduleForm] = useState({
    schedule_days: [],
    schedule_time: '',
    start_date: '',
    end_date: '',
    duration_minutes: 60,
    location: '',
    location_link: '',
    notify_parents: true
  });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

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

  // ========== Upload Documents Modal Handlers ==========
  const handleOpenUploadModal = async (classItem) => {
    setSelectedClass(classItem);
    setUploadForm({
      title: '',
      description: '',
      week_number: '',
      is_current: false,
      file: null
    });
    try {
      const response = await api.get(`/api/group-tutoring/classes/${classItem.id}/files/`);
      setClassFiles(response.data);
    } catch (err) {
      console.error('Error fetching class files:', err);
      setClassFiles([]);
    }
    setShowUploadModal(true);
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) {
      alert('Please provide a title and select a file');
      return;
    }

    setModalLoading(true);
    const formDataObj = new FormData();
    formDataObj.append('title', uploadForm.title);
    formDataObj.append('description', uploadForm.description);
    formDataObj.append('week_number', uploadForm.week_number);
    formDataObj.append('is_current', uploadForm.is_current);
    formDataObj.append('file', uploadForm.file);

    try {
      await api.post(`/api/group-tutoring/admin/classes/${selectedClass.id}/upload-file/`, formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('File uploaded successfully!');
      // Refresh files
      const response = await api.get(`/api/group-tutoring/classes/${selectedClass.id}/files/`);
      setClassFiles(response.data);
      setUploadForm({ title: '', description: '', week_number: '', is_current: false, file: null });
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.delete(`/api/group-tutoring/admin/files/${fileId}/`);
      setClassFiles(classFiles.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file');
    }
  };

  // ========== Attendance Modal Handlers ==========
  const handleOpenAttendanceModal = async (classItem) => {
    setSelectedClass(classItem);
    setSelectedSession(null);
    setAttendanceData([]);
    setModalLoading(true);

    try {
      const response = await api.get(`/api/group-tutoring/admin/classes/${classItem.id}/sessions/`);
      setClassSessions(response.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setClassSessions([]);
    } finally {
      setModalLoading(false);
    }
    setShowAttendanceModal(true);
  };

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setModalLoading(true);

    try {
      const response = await api.get(`/api/group-tutoring/admin/classes/${selectedClass.id}/attendance/${session.session_date}/`);
      setAttendanceData(response.data.attendance || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendanceData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAttendanceChange = (enrollmentId, field, value) => {
    setAttendanceData(prev => prev.map(a =>
      a.enrollment_id === enrollmentId ? { ...a, [field]: value } : a
    ));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;

    setModalLoading(true);
    try {
      await api.post(`/api/group-tutoring/admin/classes/${selectedClass.id}/attendance/${selectedSession.session_date}/`, {
        attendance: attendanceData.map(a => ({
          enrollment_id: a.enrollment_id,
          status: a.status || 'attended',
          notes: a.notes || ''
        }))
      });
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setModalLoading(false);
    }
  };

  // ========== Email Parents Modal Handlers ==========
  const handleOpenEmailModal = (classItem) => {
    setSelectedClass(classItem);
    setEmailForm({ subject: '', message: '' });
    setShowEmailModal(true);
  };

  const handleSendEmails = async (e) => {
    e.preventDefault();
    if (!emailForm.subject || !emailForm.message) {
      alert('Please provide both subject and message');
      return;
    }

    if (!window.confirm('Are you sure you want to send this email to all parents of enrolled students?')) return;

    setModalLoading(true);
    try {
      const response = await api.post(`/api/group-tutoring/admin/classes/${selectedClass.id}/email-parents/`, emailForm);
      alert(`Emails sent successfully! ${response.data.sent_count} of ${response.data.total_parents} parents received the email.`);
      setShowEmailModal(false);
    } catch (err) {
      console.error('Error sending emails:', err);
      alert('Failed to send emails: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setModalLoading(false);
    }
  };

  // ========== Schedule Modal Handlers ==========
  const handleOpenScheduleModal = (classItem) => {
    setSelectedClass(classItem);
    setScheduleForm({
      schedule_days: classItem.schedule_days || [],
      schedule_time: classItem.schedule_time || '',
      start_date: classItem.start_date || '',
      end_date: classItem.end_date || '',
      duration_minutes: classItem.duration_minutes || 60,
      location: classItem.location || '',
      location_link: classItem.location_link || '',
      notify_parents: true
    });
    setShowScheduleModal(true);
  };

  const handleScheduleDayToggle = (day) => {
    setScheduleForm(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day]
    }));
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();

    const confirmMessage = scheduleForm.notify_parents
      ? 'This will update the schedule and notify all parents of enrolled students. Continue?'
      : 'This will update the schedule without notifying parents. Continue?';

    if (!window.confirm(confirmMessage)) return;

    setModalLoading(true);
    try {
      const response = await api.patch(`/api/group-tutoring/admin/classes/${selectedClass.id}/update-schedule/`, scheduleForm);
      alert(response.data.message);
      setShowScheduleModal(false);
      fetchData(); // Refresh class data
    } catch (err) {
      console.error('Error updating schedule:', err);
      alert('Failed to update schedule: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setModalLoading(false);
    }
  };


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
        <h1 style={{ margin: 0 }}>Group Tutoring Management</h1>
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
              <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                <strong>Quizzes:</strong> {classItem.num_quizzes}
              </div>

              {/* Admin Action Buttons */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #eee'
              }}>
                <button
                  onClick={() => handleOpenUploadModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Upload Documents
                </button>
                <button
                  onClick={() => handleOpenAttendanceModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Mark Attendance
                </button>
                <button
                  onClick={() => handleOpenEmailModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Email Parents
                </button>
                <button
                  onClick={() => handleOpenScheduleModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#6f42c1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Edit Schedule
                </button>
              </div>
            </div>
          ))}
        </div>

        {classes.filter(c => c.is_active).length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
            No active classes found. Click "Create New Class" to add one.
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
        <h3 style={{ marginTop: 0 }}>Admin Quick Actions</h3>
        <p style={{ marginBottom: '1rem' }}>
          Use the buttons on each class card above to:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li><strong>Upload Documents</strong> - Add files/materials for specific weeks of a class</li>
          <li><strong>Mark Attendance</strong> - Record attendance for any class session</li>
          <li><strong>Email Parents</strong> - Send announcements to all parents of enrolled students</li>
          <li><strong>Edit Schedule</strong> - Change class schedule and notify parents automatically</li>
        </ul>

        <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Advanced Management (Django Admin)</h4>
        <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          For advanced options like managing diagnostic tests and quizzes:
        </p>
        <ul style={{ marginLeft: '1.5rem' }}>
          <li><a href="/admin/playground/grouptutoringclass/" target="_blank" rel="noopener noreferrer">Manage Classes (Advanced)</a></li>
          <li><a href="/admin/playground/diagnostictest/" target="_blank" rel="noopener noreferrer">Manage Diagnostic Tests</a></li>
          <li><a href="/admin/playground/quiz/" target="_blank" rel="noopener noreferrer">Manage Quizzes</a></li>
          <li><a href="/admin/playground/groupenrollment/" target="_blank" rel="noopener noreferrer">All Enrollments</a></li>
        </ul>
      </section>

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

      {/* Upload Documents Modal */}
      {showUploadModal && selectedClass && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Upload Documents - {selectedClass.title}</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadFile} style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>File Title *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Week Number</label>
                  <input
                    type="number"
                    min="1"
                    value={uploadForm.week_number}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, week_number: e.target.value }))}
                    placeholder="e.g., 1, 2, 3..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={uploadForm.is_current}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, is_current: e.target.checked }))}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Mark as current week
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>File *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: modalLoading ? '#ccc' : '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: modalLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {modalLoading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>

            {/* Existing Files */}
            <h3 style={{ marginBottom: '1rem' }}>Existing Files</h3>
            {classFiles.length === 0 ? (
              <p style={{ color: '#666' }}>No files uploaded yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Title</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Week</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Uploaded</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classFiles.map(file => (
                    <tr key={file.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {file.title}
                        {file.is_current && <span style={{ marginLeft: '0.5rem', color: '#28a745', fontSize: '0.8rem' }}>(Current)</span>}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{file.week_number || 'General'}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(file.uploaded_at).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedClass && (
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
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Mark Attendance - {selectedClass.title}</h2>
              <button
                onClick={() => setShowAttendanceModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {modalLoading && !selectedSession ? (
              <p>Loading sessions...</p>
            ) : (
              <>
                {/* Session Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Select Session Date</label>
                  <select
                    value={selectedSession ? selectedSession.session_date : ''}
                    onChange={(e) => {
                      const session = classSessions.find(s => s.session_date === e.target.value);
                      if (session) handleSelectSession(session);
                    }}
                    style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">-- Select a session --</option>
                    {classSessions.map(session => (
                      <option key={session.id} value={session.session_date}>
                        {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {session.is_cancelled && ' (Cancelled)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Table */}
                {selectedSession && (
                  <>
                    {modalLoading ? (
                      <p>Loading attendance...</p>
                    ) : attendanceData.length === 0 ? (
                      <p style={{ color: '#666' }}>No enrolled students found for this class.</p>
                    ) : (
                      <>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceData.map(record => (
                              <tr key={record.enrollment_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                                <td style={{ padding: '0.75rem' }}>{record.student_name}</td>
                                <td style={{ padding: '0.75rem' }}>
                                  <select
                                    value={record.status || 'attended'}
                                    onChange={(e) => handleAttendanceChange(record.enrollment_id, 'status', e.target.value)}
                                    style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                  >
                                    <option value="attended">Attended</option>
                                    <option value="absent">Absent</option>
                                    <option value="cancelled_advance">Cancelled in Advance</option>
                                  </select>
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  <input
                                    type="text"
                                    value={record.notes || ''}
                                    onChange={(e) => handleAttendanceChange(record.enrollment_id, 'notes', e.target.value)}
                                    placeholder="Optional notes..."
                                    style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <button
                          onClick={handleSaveAttendance}
                          disabled={modalLoading}
                          style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: modalLoading ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: modalLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {modalLoading ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Email Parents Modal */}
      {showEmailModal && selectedClass && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Email Parents - {selectedClass.title}</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ marginBottom: '1rem', color: '#666' }}>
              This will send an email to all parents of students enrolled in this class.
            </p>

            <form onSubmit={handleSendEmails}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Subject *</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Message *</label>
                <textarea
                  required
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={8}
                  placeholder="Type your message here..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
                />
                <small style={{ color: '#666' }}>
                  Note: The email will automatically include the parent's name, enrolled students, and class title.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: modalLoading ? '#ccc' : '#ffc107',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {modalLoading ? 'Sending...' : 'Send Emails'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal */}
      {showScheduleModal && selectedClass && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Edit Schedule - {selectedClass.title}</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Class Days</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <label key={day} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: scheduleForm.schedule_days.includes(day) ? '#6f42c1' : 'white',
                      color: scheduleForm.schedule_days.includes(day) ? 'white' : 'black'
                    }}>
                      <input
                        type="checkbox"
                        checked={scheduleForm.schedule_days.includes(day)}
                        onChange={() => handleScheduleDayToggle(day)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Class Time</label>
                  <input
                    type="time"
                    value={scheduleForm.schedule_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, schedule_time: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Duration (minutes)</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={scheduleForm.duration_minutes}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Start Date</label>
                  <input
                    type="date"
                    value={scheduleForm.start_date}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, start_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>End Date</label>
                  <input
                    type="date"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, end_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Location</label>
                <input
                  type="text"
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Room 101, Online - Zoom"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Location Link</label>
                <input
                  type="url"
                  value={scheduleForm.location_link}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, location_link: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.notify_parents}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, notify_parents: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Notify all parents about this schedule change</span>
                </label>
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#856404' }}>
                  Parents will receive an email detailing the changes to the class schedule.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: modalLoading ? '#ccc' : '#6f42c1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoringAdmin;
