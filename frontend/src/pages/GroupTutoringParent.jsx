// src/pages/GroupTutoringParent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringParent = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, studentsRes, enrollmentsRes, sessionsRes] = await Promise.all([
        api.get('/api/group-tutoring/classes/'),
        api.get('/api/group-tutoring/enrollments/my_students/'),
        api.get('/api/group-tutoring/enrollments/'),
        api.get('/api/group-tutoring/parent-sessions-calendar/')
      ]);
      setClasses(classesRes.data);
      setStudents(studentsRes.data);
      setMyEnrollments(enrollmentsRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load group tutoring information');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = (classItem) => {
    if (students.length === 0) {
      // Redirect to students page to add a student
      if (confirm('You need to add a student first. Would you like to go to the Students page?')) {
        navigate('/students');
      }
      return;
    }

    setSelectedClass(classItem);
    setShowEnrollModal(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    try {
      await api.post('/api/group-tutoring/enrollments/', {
        tutoring_class: selectedClass.id,
        student: selectedStudent
      });
      alert('Enrollment request submitted successfully! You will receive an email with further instructions.');
      setShowEnrollModal(false);
      setSelectedStudent('');
      fetchData();
    } catch (err) {
      console.error('Error enrolling:', err);
      alert('Failed to enroll: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleSessionClick = (session) => {
    // Only allow cancellation of future sessions
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();

    if (sessionDateTime > now && !session.attendance_status) {
      setSelectedSession(session);
      setShowCancelModal(true);
    }
  };

  const handleCancelSession = async () => {
    try {
      const response = await api.post(`/api/group-tutoring/cancel-session/${selectedSession.id}/`, {
        enrollment_id: selectedSession.enrollment_id
      });

      alert(response.data.message);
      setShowCancelModal(false);
      setSelectedSession(null);
      fetchData();
    } catch (err) {
      console.error('Error cancelling session:', err);
      alert('Failed to cancel session: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const getSessionsByDate = () => {
    const sessionsByDate = {};
    sessions.forEach(session => {
      if (!sessionsByDate[session.session_date]) {
        sessionsByDate[session.session_date] = [];
      }
      sessionsByDate[session.session_date].push(session);
    });
    return sessionsByDate;
  };

  const getAttendanceColor = (session) => {
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const isPast = sessionDateTime < now;

    if (!isPast && !session.attendance_status) {
      return '#e3f2fd'; // Light blue for future
    }

    if (session.attendance_status === 'attended') {
      return '#d4edda'; // Green for attended
    } else if (session.attendance_status === 'absent') {
      return '#f8d7da'; // Red for missed
    } else if (session.attendance_status === 'cancelled_advance') {
      return '#fff3cd'; // Yellow for cancelled
    }

    return '#f8f9fa'; // Default gray
  };

  const getAttendanceIcon = (session) => {
    if (session.attendance_status === 'attended') return '✓';
    if (session.attendance_status === 'absent') return '✗';
    if (session.attendance_status === 'cancelled_advance') return '⊗';
    return '';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const sessionsByDate = getSessionsByDate();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #192A88 0%, #3a4db5 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Group French Classes
        </h1>
        <p style={{
          fontSize: '1.5rem',
          marginBottom: '2rem',
          opacity: 0.95
        }}>
          Learn French in a fun, interactive group setting!
        </p>
        <p style={{
          fontSize: '1.2rem',
          marginBottom: '0',
          opacity: 0.9
        }}>
          Expert tutors • Small class sizes • Flexible schedules
        </p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Calendar Section - Only show if enrolled */}
        {myEnrollments.length > 0 && sessions.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88', textAlign: 'center' }}>
              My Class Schedule
            </h2>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.9rem' }}>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', marginRight: '5px' }}></span>Upcoming</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#d4edda', border: '1px solid #ddd', marginRight: '5px' }}></span>Attended</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#f8d7da', border: '1px solid #ddd', marginRight: '5px' }}></span>Missed</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#fff3cd', border: '1px solid #ddd', marginRight: '5px' }}></span>Cancelled</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#ffdfba', border: '2px solid #ff9800', marginRight: '5px' }}></span>Today</span>
              </div>

              <div style={{
                display: 'grid',
                gap: '1rem',
                maxHeight: '600px',
                overflowY: 'auto'
              }}>
                {Object.keys(sessionsByDate).sort().map(date => {
                  const isToday = date === today;

                  return (
                    <div key={date} style={{
                      border: isToday ? '2px solid #ff9800' : '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '1rem',
                      backgroundColor: isToday ? '#ffdfba' : '#fff'
                    }}>
                      <h3 style={{
                        margin: '0 0 1rem 0',
                        color: '#192A88',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {isToday && <span style={{ fontSize: '0.85rem', color: '#ff9800', fontWeight: 'bold' }}>TODAY</span>}
                      </h3>

                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {sessionsByDate[date].map(session => {
                          const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
                          const now = new Date();
                          const isFuture = sessionDateTime > now;
                          const canCancel = isFuture && !session.attendance_status;

                          return (
                            <div
                              key={`${session.id}-${session.enrollment_id}`}
                              onClick={() => canCancel && handleSessionClick(session)}
                              style={{
                                backgroundColor: getAttendanceColor(session),
                                padding: '1rem',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                cursor: canCancel ? 'pointer' : 'default',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (canCancel) {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (canCancel) {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem', color: '#192A88' }}>
                                    {getAttendanceIcon(session)} {session.class_title}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.25rem' }}>
                                    👤 {session.student_name}
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                    🕐 {session.start_time} - {session.end_time}
                                  </div>
                                  {session.location && (
                                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                      📍 {session.location}
                                    </div>
                                  )}
                                </div>
                                {canCancel && (
                                  <div style={{
                                    fontSize: '0.85rem',
                                    color: '#dc3545',
                                    fontWeight: 'bold'
                                  }}>
                                    Click to cancel
                                  </div>
                                )}
                                {session.attendance_status && (
                                  <div style={{
                                    fontSize: '0.85rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                    fontWeight: 'bold'
                                  }}>
                                    {session.attendance_status === 'attended' ? 'Attended' :
                                     session.attendance_status === 'absent' ? 'Missed' :
                                     session.attendance_status === 'cancelled_advance' ? 'Cancelled' : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* My Enrollments Section */}
        {myEnrollments.length > 0 && (
          <div style={{
            padding: '3rem 2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            marginBottom: '3rem'
          }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88' }}>
              My Enrollments
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {myEnrollments.map(enrollment => (
                <div
                  key={enrollment.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '2px solid #28a745'
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#192A88' }}>
                    {enrollment.class_title}
                  </h3>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <strong>Student:</strong> {enrollment.student_name}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <strong>Difficulty:</strong> {enrollment.class_difficulty}
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      backgroundColor: enrollment.status === 'enrolled' ? '#28a745' : enrollment.status === 'pending_diagnostic' ? '#ffc107' : '#6c757d',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      {enrollment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Classes Section */}
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88', textAlign: 'center' }}>
            Available Classes - Enroll Now!
          </h2>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem'
            }}>
              {error}
            </div>
          )}

          {classes.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666', padding: '2rem' }}>
              There are no open classes currently. Please check back soon!
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {classes.map(classItem => {
                const alreadyEnrolled = myEnrollments.some(e => e.tutoring_class === classItem.id);

                return (
                  <div
                    key={classItem.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '2rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '2px solid #e9ecef',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    <h3 style={{ margin: '0 0 1rem 0', color: '#192A88', fontSize: '1.5rem' }}>
                      {classItem.title}
                    </h3>

                    {classItem.description && (
                      <p style={{ marginBottom: '1rem', color: '#666', lineHeight: '1.5' }}>
                        {classItem.description}
                      </p>
                    )}

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        <strong>📚 Difficulty:</strong> {classItem.difficulty.replace('_', ' ').toUpperCase()}
                      </div>
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        <strong>🗓 Duration:</strong> {new Date(classItem.start_date).toLocaleDateString()} - {new Date(classItem.end_date).toLocaleDateString()}
                      </div>
                      {classItem.schedule_days && classItem.schedule_days.length > 0 && (
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                          <strong>📅 Schedule:</strong> {classItem.schedule_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                          {classItem.schedule_time && ` at ${classItem.schedule_time}`}
                        </div>
                      )}
                      {classItem.location && (
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                          <strong>📍 Location:</strong> {classItem.location}
                        </div>
                      )}
                      {classItem.tutor_details && classItem.tutor_details.length > 0 && (
                        <div style={{ fontSize: '0.95rem' }}>
                          <strong>👨‍🏫 Tutors:</strong> {classItem.tutor_details.map(t => t.name).join(', ')}
                        </div>
                      )}
                    </div>

                    {alreadyEnrolled ? (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        ✓ Already Enrolled
                      </div>
                    ) : classItem.is_full ? (
                      <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8d7da',
                        color: '#721c24',
                        borderRadius: '4px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        Class Full
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEnrollClick(classItem)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                      >
                        Enroll Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && selectedClass && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, color: '#192A88' }}>
              Enroll in {selectedClass.title}
            </h2>

            <form onSubmit={handleEnrollSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Select Student *
                </label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">-- Select a student --</option>
                  {students.map(student => {
                    const alreadyEnrolled = myEnrollments.some(
                      e => e.tutoring_class === selectedClass.id && e.student === student.id
                    );

                    return (
                      <option
                        key={student.id}
                        value={student.id}
                        disabled={alreadyEnrolled}
                      >
                        {student.name} {alreadyEnrolled ? '(Already enrolled)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedClass.difficulty !== 'beginner' && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem'
                }}>
                  <strong>Note:</strong> This class requires a diagnostic test. You will receive an email with a link to complete the test.
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSelectedStudent('');
                  }}
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
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {showCancelModal && selectedSession && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, color: '#192A88' }}>
              Cancel Session
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <p><strong>Class:</strong> {selectedSession.class_title}</p>
              <p><strong>Student:</strong> {selectedSession.student_name}</p>
              <p><strong>Date:</strong> {new Date(selectedSession.session_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {selectedSession.start_time} - {selectedSession.end_time}</p>

              <div style={{
                padding: '1rem',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                marginTop: '1rem',
                fontSize: '0.9rem'
              }}>
                <strong>Note:</strong> If you cancel less than 6 hours before the class, it will be marked as absent.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedSession(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Keep Session
              </button>
              <button
                onClick={handleCancelSession}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoringParent;
