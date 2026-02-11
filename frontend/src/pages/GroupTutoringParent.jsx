// src/pages/GroupTutoringParent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringParent = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudentForEnroll, setSelectedStudentForEnroll] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState('');
  const [studentStats, setStudentStats] = useState({});

  // Get selected student from URL params
  const selectedStudentId = searchParams.get('student') ? parseInt(searchParams.get('student')) : null;

  useEffect(() => {
    fetchData();
  }, []);

  // Set default student when data loads
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSearchParams({ student: students[0].id.toString() });
    }
  }, [students]);

  // Fetch stats for selected student when student changes
  useEffect(() => {
    if (selectedStudentId && myEnrollments.length > 0) {
      fetchStudentStats(selectedStudentId);
    }
  }, [selectedStudentId, myEnrollments]);

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

  const fetchStudentStats = async (studentId) => {
    const studentEnrollments = myEnrollments.filter(e => e.student === studentId);
    const stats = {};

    for (const enrollment of studentEnrollments) {
      try {
        const [quizzesRes, attendanceRes] = await Promise.all([
          api.get(`/api/group-tutoring/student-quizzes/${enrollment.id}/`),
          api.get(`/api/group-tutoring/student-attendance/${enrollment.id}/`)
        ]);

        const classInfo = classes.find(c => c.id === enrollment.tutoring_class);
        const isCompleted = classInfo && new Date(classInfo.end_date) < new Date();

        if (isCompleted && classInfo) {
          // Calculate attendance percentage
          const totalSessions = calculateTotalSessions(classInfo);
          const attendedSessions = attendanceRes.data.filter(a => a.status === 'attended').length;
          const attendancePercent = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 100;

          // Calculate quiz pass status
          const quizzes = quizzesRes.data;
          const hasQuizzes = quizzes.length > 0;
          const allQuizzesPassed = hasQuizzes ? quizzes.every(q => q.submission && q.submission.passed) : true;
          const failedQuizzes = hasQuizzes ? quizzes.filter(q => !q.submission || !q.submission.passed) : [];

          // Determine pass/fail reasons
          const passed = attendancePercent >= 80 && allQuizzesPassed;
          const reasons = [];
          if (attendancePercent < 80) {
            reasons.push(`Attendance: ${attendancePercent.toFixed(0)}% (requires 80%)`);
          }
          if (hasQuizzes && !allQuizzesPassed) {
            reasons.push(`Failed quizzes: ${failedQuizzes.length}`);
          }

          stats[enrollment.tutoring_class] = {
            isCompleted: true,
            passed,
            attendancePercent,
            allQuizzesPassed,
            hasQuizzes,
            reasons,
            totalSessions,
            attendedSessions
          };
        } else {
          stats[enrollment.tutoring_class] = { isCompleted: false };
        }
      } catch (err) {
        console.error(`Error fetching stats for enrollment ${enrollment.id}:`, err);
        stats[enrollment.tutoring_class] = { isCompleted: false };
      }
    }

    setStudentStats(stats);
  };

  const calculateTotalSessions = (classInfo) => {
    if (!classInfo.schedule_days || !classInfo.start_date || !classInfo.end_date) return 0;

    let count = 0;
    const startDate = new Date(classInfo.start_date);
    const endDate = new Date(classInfo.end_date);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (classInfo.schedule_days.map(d => d.toLowerCase()).includes(dayName)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  };

  const handleStudentChange = (studentId) => {
    setSearchParams({ student: studentId.toString() });
  };

  const handleEnrollClick = (classItem) => {
    if (students.length === 0) {
      if (confirm('You need to add a student first. Would you like to go to the Students page?')) {
        navigate('/students');
      }
      return;
    }

    setSelectedClass(classItem);
    // Pre-select current student if they're not already enrolled
    const isCurrentStudentEnrolled = myEnrollments.some(
      e => e.tutoring_class === classItem.id && e.student === selectedStudentId
    );
    setSelectedStudentForEnroll(isCurrentStudentEnrolled ? '' : (selectedStudentId?.toString() || ''));
    setShowEnrollModal(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudentForEnroll) {
      alert('Please select a student');
      return;
    }

    try {
      await api.post('/api/group-tutoring/enrollments/', {
        tutoring_class: selectedClass.id,
        student: selectedStudentForEnroll
      });
      alert('Enrollment request submitted successfully! You will receive an email with further instructions.');
      setShowEnrollModal(false);
      setSelectedStudentForEnroll('');
      fetchData();
    } catch (err) {
      console.error('Error enrolling:', err);
      alert('Failed to enroll: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  const handleSessionClick = (session) => {
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

  const handleClassClick = (classId) => {
    navigate(`/group-tutoring/class/${classId}?student=${selectedStudentId}`);
  };

  // Filter enrollments for selected student
  const getStudentEnrollments = () => {
    if (!selectedStudentId) return [];
    return myEnrollments.filter(e => e.student === selectedStudentId);
  };

  // Filter sessions for selected student
  const getStudentSessions = () => {
    if (!selectedStudentId) return [];
    return sessions.filter(s => s.student === selectedStudentId);
  };

  // Get available classes for selected student (not enrolled yet and not ended)
  const getAvailableClasses = () => {
    const now = new Date();
    // Filter out classes that have already ended
    const activeClasses = classes.filter(c => new Date(c.end_date) >= now);

    if (!selectedStudentId) return activeClasses;
    const enrolledClassIds = myEnrollments
      .filter(e => e.student === selectedStudentId)
      .map(e => e.tutoring_class);
    return activeClasses.filter(c => !enrolledClassIds.includes(c.id));
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const getSessionsForDate = (date) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return getStudentSessions().filter(s => s.session_date === dateStr);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const getAttendanceColor = (session) => {
    const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const isPast = sessionDateTime < now;

    if (!isPast && !session.attendance_status) {
      return '#e3f2fd';
    }
    if (session.attendance_status === 'attended') return '#d4edda';
    if (session.attendance_status === 'absent') return '#f8d7da';
    if (session.attendance_status === 'cancelled_advance') return '#fff3cd';
    return '#f8f9fa';
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

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const studentEnrollments = getStudentEnrollments();
  const studentSessions = getStudentSessions();
  const availableClasses = getAvailableClasses();
  const selectedStudentName = students.find(s => s.id === selectedStudentId)?.name || '';

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{
        backgroundImage: 'url(/GroupTutoring.avif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        padding: '6.4rem 2rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Dark overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)'
        }} />
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
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
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem' }}>

        {/* Pending Enrollment Notice */}
        {studentEnrollments.filter(e => e.status === 'pending_diagnostic' || e.status === 'diagnostic_submitted').length > 0 && (
          <div style={{
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #ffc107'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: '1rem' }}>Pending Enrollment(s) for {selectedStudentName}</h3>
            <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
              {selectedStudentName} has {studentEnrollments.filter(e => e.status === 'pending_diagnostic' || e.status === 'diagnostic_submitted').length} enrollment(s) awaiting approval.
              {studentEnrollments.some(e => e.status === 'pending_diagnostic') && ' Please check your email for the diagnostic test link.'}
              {studentEnrollments.some(e => e.status === 'diagnostic_submitted') && ' The diagnostic test has been submitted and is being reviewed.'}
            </p>
          </div>
        )}

        {/* My Enrollments Section */}
        {studentEnrollments.length > 0 && (
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#192A88' }}>
                {selectedStudentName}'s Enrolled Classes
              </h2>
              {students.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: '500', color: '#666', fontSize: '0.85rem' }}>Viewing as:</span>
                  <select
                    value={selectedStudentId || ''}
                    onChange={(e) => handleStudentChange(parseInt(e.target.value))}
                    style={{
                      padding: '0.1rem 0.2rem',
                      borderRadius: '3px',
                      border: '1px solid #192A88',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#192A88',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      textAlign: 'center',
                      textAlignLast: 'center'
                    }}
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {studentEnrollments.map(enrollment => {
                const classInfo = classes.find(c => c.id === enrollment.tutoring_class);
                const stats = studentStats[enrollment.tutoring_class] || {};
                const isCompleted = stats.isCompleted;

                let borderColor = enrollment.status === 'enrolled' ? '#28a745' :
                  enrollment.status === 'pending_diagnostic' ? '#ffc107' : '#6c757d';
                let cardBackground = 'white';

                if (isCompleted) {
                  if (stats.passed) {
                    borderColor = '#28a745';
                    cardBackground = '#d4edda';
                  } else {
                    borderColor = '#dc3545';
                    cardBackground = '#f8d7da';
                  }
                }

                return (
                  <div
                    key={enrollment.id}
                    onClick={() => handleClassClick(enrollment.tutoring_class)}
                    style={{
                      backgroundColor: cardBackground,
                      padding: '1rem',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: `2px solid ${borderColor}`,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#192A88', fontSize: '1.1rem' }}>
                        {enrollment.class_title}
                      </h3>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px',
                        backgroundColor: enrollment.status === 'enrolled' ? '#28a745' :
                          enrollment.status === 'pending_diagnostic' ? '#ffc107' : '#6c757d',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold'
                      }}>
                        {enrollment.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {isCompleted && (
                      <div style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        backgroundColor: stats.passed ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                        marginBottom: '0.5rem',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ fontWeight: 'bold', color: stats.passed ? '#155724' : '#721c24' }}>
                          {stats.passed ? '✓ COMPLETED' : '✗ NOT MET'}
                        </div>
                        <div style={{ color: stats.passed ? '#155724' : '#721c24' }}>
                          Attendance: {stats.attendancePercent?.toFixed(0)}%
                        </div>
                        {!stats.passed && stats.reasons.length > 0 && (
                          <div style={{ color: '#721c24', fontSize: '0.75rem' }}>
                            {stats.reasons.join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {enrollment.class_difficulty}
                      {classInfo?.schedule_time && ` • ${classInfo.schedule_time}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#192A88', fontWeight: '500', textAlign: 'right' }}>
                      View details →
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Classes Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#192A88' }}>
            Available Classes for {selectedStudentName}
          </h2>

          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {availableClasses.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: '1rem', color: '#666', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              {students.length === 0
                ? 'Add a student first to enroll in classes.'
                : `${selectedStudentName} is enrolled in all available classes, or there are no open classes currently.`}
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {availableClasses.map(classItem => (
                <div
                  key={classItem.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e9ecef',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <h3 style={{ margin: '0 0 0.75rem 0', color: '#192A88', fontSize: '1.25rem' }}>
                    {classItem.title}
                  </h3>

                  {classItem.description && (
                    <p style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      {classItem.description}
                    </p>
                  )}

                  <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>📚</strong> {classItem.difficulty.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>🗓</strong> {new Date(classItem.start_date).toLocaleDateString()} - {new Date(classItem.end_date).toLocaleDateString()}
                    </div>
                    {classItem.schedule_days && classItem.schedule_days.length > 0 && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>📅</strong> {classItem.schedule_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        {classItem.schedule_time && ` at ${classItem.schedule_time}`}
                      </div>
                    )}
                    {classItem.tutor_details && classItem.tutor_details.length > 0 && (
                      <div>
                        <strong>👨‍🏫</strong> {classItem.tutor_details.map(t => t.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {classItem.is_full ? (
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      Class Full
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnrollClick(classItem)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                      Enroll {selectedStudentName}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Section - Only show if student has enrolled classes */}
        {studentEnrollments.filter(e => e.status === 'enrolled').length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88', textAlign: 'center' }}>
              {selectedStudentName}'s Class Schedule
            </h2>

            {studentSessions.length === 0 ? (
              <div style={{
                backgroundColor: '#fff3cd',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  No scheduled sessions found. Classes will appear here once the schedule is configured.
                </p>
              </div>
            ) : null}

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {/* Legend */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem' }}>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', marginRight: '5px' }}></span>Upcoming</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#d4edda', border: '1px solid #ddd', marginRight: '5px' }}></span>Attended</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#f8d7da', border: '1px solid #ddd', marginRight: '5px' }}></span>Missed</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#fff3cd', border: '1px solid #ddd', marginRight: '5px' }}></span>Cancelled</span>
                <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#ffb74d', border: '2px solid #ff9800', marginRight: '5px' }}></span>Today</span>
              </div>

              {/* Calendar Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <button
                  onClick={prevMonth}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#192A88',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ← Previous
                </button>
                <h3 style={{ margin: 0, color: '#192A88', fontSize: '1.5rem' }}>
                  {monthName}
                </h3>
                <button
                  onClick={nextMonth}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#192A88',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px'
              }}>
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: '#192A88',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9rem'
                  }}>
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {daysInMonth.map((date, index) => {
                  const daySessions = date ? getSessionsForDate(date) : [];
                  const todayCell = date && isToday(date);

                  return (
                    <div
                      key={index}
                      style={{
                        minHeight: '120px',
                        padding: '0.5rem',
                        border: todayCell ? '3px solid #ff9800' : '1px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: todayCell ? '#ffb74d' : (date ? 'white' : '#f5f5f5'),
                        position: 'relative'
                      }}
                    >
                      {date && (
                        <>
                          <div style={{
                            fontWeight: todayCell ? 'bold' : 'normal',
                            fontSize: '1rem',
                            marginBottom: '0.5rem',
                            color: todayCell ? 'white' : '#333',
                            textAlign: 'center'
                          }}>
                            {date.getDate()}
                          </div>

                          {daySessions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {daySessions.map(session => {
                                const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
                                const now = new Date();
                                const canCancel = sessionDateTime > now && !session.attendance_status;

                                return (
                                  <div
                                    key={`${session.id}-${session.enrollment_id}`}
                                    onClick={() => canCancel && handleSessionClick(session)}
                                    style={{
                                      backgroundColor: getAttendanceColor(session),
                                      padding: '0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      cursor: canCancel ? 'pointer' : 'default',
                                      border: '1px solid #ddd',
                                      transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (canCancel) {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (canCancel) {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#192A88' }}>
                                      {getAttendanceIcon(session)} {session.class_title}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.7rem' }}>
                                      🕐 {session.start_time}
                                    </div>
                                    {canCancel && (
                                      <div style={{ color: '#dc3545', fontSize: '0.65rem', marginTop: '2px', fontWeight: 'bold' }}>
                                        Click to cancel
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
                  value={selectedStudentForEnroll}
                  onChange={(e) => setSelectedStudentForEnroll(e.target.value)}
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
                    setSelectedStudentForEnroll('');
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
