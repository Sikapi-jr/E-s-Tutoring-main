// src/pages/GroupTutoringEnrollmentDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../components/UserProvider';
import api from '../api';

// Home icon component
const HomeIcon = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/home')}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 1000,
        backgroundColor: '#192A88',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }}
      title="Go to Home"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </button>
  );
};

const GroupTutoringEnrollmentDetail = () => {
  const { classId, enrollmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [classInfo, setClassInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [quizzesByStudent, setQuizzesByStudent] = useState({});
  const [attendanceByStudent, setAttendanceByStudent] = useState({});
  const [sessions, setSessions] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [error, setError] = useState('');

  // Get selected student from URL params
  const urlStudentId = searchParams.get('student') ? parseInt(searchParams.get('student')) : null;
  const [selectedStudentId, setSelectedStudentId] = useState(urlStudentId);

  useEffect(() => {
    fetchData();
  }, [classId, enrollmentId]);

  useEffect(() => {
    // Generate sessions when classInfo is available
    if (classInfo) {
      generateSessions();
    }
  }, [classInfo, attendanceByStudent, selectedStudentId]);

  // Set default selected student when enrollments load
  useEffect(() => {
    if (enrollments.length > 0) {
      // If URL has student param and that student is in this class, use it
      if (urlStudentId && enrollments.some(e => e.student === urlStudentId)) {
        setSelectedStudentId(urlStudentId);
      } else {
        // Otherwise, prefer enrolled students
        const enrolledStudent = enrollments.find(e => e.status === 'enrolled');
        const defaultStudent = enrolledStudent ? enrolledStudent.student : enrollments[0].student;
        setSelectedStudentId(defaultStudent);
        // Update URL
        setSearchParams({ student: defaultStudent.toString() });
      }
    }
  }, [enrollments]);

  // Update URL when student changes
  const handleStudentChange = (studentId) => {
    setSelectedStudentId(studentId);
    setSearchParams({ student: studentId.toString() });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all enrollments for the parent
      const enrollmentsRes = await api.get('/api/group-tutoring/enrollments/');

      let targetClassId = classId;
      let relevantEnrollments = [];

      if (classId) {
        // Filter enrollments for this class
        relevantEnrollments = enrollmentsRes.data.filter(e => e.tutoring_class === parseInt(classId));
      } else if (enrollmentId) {
        // Find the enrollment and get its class
        const enrollment = enrollmentsRes.data.find(e => e.id === parseInt(enrollmentId));
        if (enrollment) {
          targetClassId = enrollment.tutoring_class;
          relevantEnrollments = enrollmentsRes.data.filter(e => e.tutoring_class === targetClassId);
        }
      }

      if (relevantEnrollments.length === 0) {
        setError('No enrollments found for this class');
        return;
      }

      setEnrollments(relevantEnrollments);

      // Fetch class info
      const classRes = await api.get(`/api/group-tutoring/classes/${targetClassId}/`);
      setClassInfo(classRes.data);

      // Fetch files for the class
      const filesRes = await api.get(`/api/group-tutoring/student-files/${relevantEnrollments[0].id}/`);
      setFiles(filesRes.data);

      // Fetch quizzes and attendance for each enrolled student
      const quizzesMap = {};
      const attendanceMap = {};

      for (const enrollment of relevantEnrollments) {
        try {
          const [quizzesRes, attendanceRes] = await Promise.all([
            api.get(`/api/group-tutoring/student-quizzes/${enrollment.id}/`),
            api.get(`/api/group-tutoring/student-attendance/${enrollment.id}/`)
          ]);
          quizzesMap[enrollment.student] = quizzesRes.data;
          attendanceMap[enrollment.student] = attendanceRes.data;
        } catch (err) {
          console.error(`Error fetching data for enrollment ${enrollment.id}:`, err);
          quizzesMap[enrollment.student] = [];
          attendanceMap[enrollment.student] = [];
        }
      }

      setQuizzesByStudent(quizzesMap);
      setAttendanceByStudent(attendanceMap);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const generateSessions = () => {
    if (!classInfo || !classInfo.schedule_days || !classInfo.schedule_time) {
      setSessions([]);
      return;
    }

    const generatedSessions = [];
    const startDate = new Date(classInfo.start_date);
    const endDate = new Date(classInfo.end_date);

    // Create attendance map for selected student only
    const attendanceMap = {};
    if (selectedStudentId && attendanceByStudent[selectedStudentId]) {
      attendanceByStudent[selectedStudentId].forEach(att => {
        if (att.session_date) {
          attendanceMap[att.session_date] = att.status;
        }
      });
    }

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      if (classInfo.schedule_days.map(d => d.toLowerCase()).includes(dayName)) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const [hours, minutes] = classInfo.schedule_time.split(':');
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
        const endDateTime = new Date(startDateTime.getTime() + classInfo.duration_minutes * 60000);
        const endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;

        generatedSessions.push({
          id: `${classInfo.id}-${dateStr}`,
          session_date: dateStr,
          start_time: classInfo.schedule_time,
          end_time: endTime,
          attendance_status: attendanceMap[dateStr] || null
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setSessions(generatedSessions);
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

  const getSessionForDate = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return sessions.find(s => s.session_date === dateStr);
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

  const getAttendanceColor = (status, isPast) => {
    if (!isPast && !status) {
      return '#e3f2fd'; // Light blue for future
    }
    if (status === 'attended') return '#d4edda';
    if (status === 'absent') return '#f8d7da';
    if (status === 'cancelled_advance') return '#fff3cd';
    return '#f8f9fa';
  };

  const getAttendanceIcon = (status) => {
    if (status === 'attended') return '✓';
    if (status === 'absent') return '✗';
    if (status === 'cancelled_advance') return '⊗';
    return '';
  };

  const getAttendanceLabel = (status, isPast) => {
    if (status === 'attended') return 'Attended';
    if (status === 'absent') return 'Absent';
    if (status === 'cancelled_advance') return 'Cancelled';
    if (!isPast) return 'Upcoming';
    return 'Not Marked';
  };

  const getEnrollmentByStudentId = (studentId) => {
    return enrollments.find(e => e.student === studentId);
  };

  const handleBackClick = () => {
    // Navigate back with student param preserved
    navigate(`/group-tutoring?student=${selectedStudentId}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <HomeIcon />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <HomeIcon />
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
        <button
          onClick={handleBackClick}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#192A88',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Group Tutoring
        </button>
      </div>
    );
  }

  const selectedEnrollment = getEnrollmentByStudentId(selectedStudentId);
  const selectedStudentName = selectedEnrollment?.student_name || '';
  const selectedQuizzes = quizzesByStudent[selectedStudentId] || [];
  const selectedAttendance = attendanceByStudent[selectedStudentId] || [];

  // Calculate attendance stats for selected student
  const totalSessions = sessions.length;
  const attendedSessions = selectedAttendance.filter(a => a.status === 'attended').length;
  const attendancePercent = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <HomeIcon />
      {/* Header */}
      <div style={{
        backgroundImage: 'url(/GroupTutoring.avif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        padding: '2rem',
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <button
            onClick={handleBackClick}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            &larr; Back to Group Tutoring
          </button>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            {classInfo?.title}
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Viewing as: <strong>{selectedStudentName}</strong>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* Student Selector - Show if multiple students enrolled in this class */}
        {enrollments.length > 1 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem 2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <label style={{ fontWeight: '600', color: '#192A88', fontSize: '1.1rem' }}>
              Switch Student:
            </label>
            <select
              value={selectedStudentId || ''}
              onChange={(e) => handleStudentChange(parseInt(e.target.value))}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '2px solid #192A88',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#192A88',
                cursor: 'pointer',
                backgroundColor: 'white',
                minWidth: '200px'
              }}
            >
              {enrollments.map(enrollment => (
                <option key={enrollment.student} value={enrollment.student}>
                  {enrollment.student_name}
                </option>
              ))}
            </select>
            <span style={{ color: '#666', fontSize: '0.95rem' }}>
              {enrollments.length} children enrolled in this class
            </span>
          </div>
        )}

        {/* Attendance Summary */}
        {selectedEnrollment?.status === 'enrolled' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#192A88', fontSize: '1.5rem' }}>
              {selectedStudentName}'s Progress
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: attendancePercent >= 80 ? '#d4edda' : '#f8d7da',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: attendancePercent >= 80 ? '#155724' : '#721c24' }}>
                  {attendancePercent.toFixed(0)}%
                </div>
                <div style={{ fontSize: '0.9rem', color: attendancePercent >= 80 ? '#155724' : '#721c24' }}>
                  Attendance ({attendedSessions}/{totalSessions} sessions)
                </div>
                {attendancePercent < 80 && (
                  <div style={{ fontSize: '0.8rem', color: '#721c24', marginTop: '0.5rem' }}>
                    Requires 80% to pass
                  </div>
                )}
              </div>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#192A88' }}>
                  {selectedQuizzes.filter(q => q.submission?.passed).length}/{selectedQuizzes.length}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Quizzes Passed
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Class Schedule Calendar Section */}
        {classInfo && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
              {selectedStudentName}'s Schedule
            </h2>

            {/* Schedule Info Summary */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Days: </span>
                <span style={{ fontWeight: '600' }}>
                  {classInfo.schedule_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') || 'Not set'}
                </span>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Time: </span>
                <span style={{ fontWeight: '600' }}>{classInfo.schedule_time || 'Not set'}</span>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Duration: </span>
                <span style={{ fontWeight: '600' }}>{classInfo.duration_minutes} min</span>
              </div>
              <div>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>Location: </span>
                <span style={{ fontWeight: '600' }}>{classInfo.location || 'TBD'}</span>
                {classInfo.location_link && (
                  <a
                    href={classInfo.location_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: '0.5rem', color: '#192A88', textDecoration: 'none', fontWeight: 'bold' }}
                  >
                    (Join)
                  </a>
                )}
              </div>
              {classInfo.tutor_details && classInfo.tutor_details.length > 0 && (
                <div>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>Tutors: </span>
                  <span style={{ fontWeight: '600' }}>{classInfo.tutor_details.map(t => t.name).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Legend */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', marginRight: '5px', verticalAlign: 'middle' }}></span>Upcoming</span>
              <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#d4edda', border: '1px solid #ddd', marginRight: '5px', verticalAlign: 'middle' }}></span>Attended</span>
              <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#f8d7da', border: '1px solid #ddd', marginRight: '5px', verticalAlign: 'middle' }}></span>Absent</span>
              <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#fff3cd', border: '1px solid #ddd', marginRight: '5px', verticalAlign: 'middle' }}></span>Cancelled</span>
            </div>

            {/* Calendar Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#192A88',
              borderRadius: '8px',
              color: 'white'
            }}>
              <button
                onClick={prevMonth}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                &larr; Prev
              </button>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={nextMonth}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Next &rarr;
              </button>
            </div>

            {/* Calendar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px'
            }}>
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{
                  padding: '0.5rem',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#333'
                }}>
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {getDaysInMonth(currentMonth).map((date, index) => {
                const session = date ? getSessionForDate(date) : null;
                const todayCell = date && isToday(date);
                const sessionDateTime = session ? new Date(`${session.session_date}T${session.start_time}`) : null;
                const isPast = sessionDateTime ? sessionDateTime < new Date() : false;

                return (
                  <div
                    key={index}
                    style={{
                      minHeight: '80px',
                      padding: '0.4rem',
                      border: todayCell ? '2px solid #ff9800' : '1px solid #e9ecef',
                      borderRadius: '4px',
                      backgroundColor: todayCell ? '#fff8e1' : (date ? 'white' : '#f5f5f5'),
                      position: 'relative'
                    }}
                  >
                    {date && (
                      <>
                        <div style={{
                          fontWeight: todayCell ? 'bold' : 'normal',
                          fontSize: '0.85rem',
                          marginBottom: '0.25rem',
                          color: todayCell ? '#e65100' : '#333',
                          textAlign: 'center'
                        }}>
                          {date.getDate()}
                        </div>

                        {session && (
                          <div style={{
                            backgroundColor: getAttendanceColor(session.attendance_status, isPast),
                            padding: '0.3rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            border: '1px solid #ddd',
                            textAlign: 'center'
                          }}>
                            <div style={{ fontWeight: 'bold', color: '#192A88' }}>
                              {getAttendanceIcon(session.attendance_status)} {session.start_time}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#666' }}>
                              {getAttendanceLabel(session.attendance_status, isPast)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Class Period Info */}
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#666',
              textAlign: 'center'
            }}>
              Class Period: {new Date(classInfo.start_date).toLocaleDateString()} - {new Date(classInfo.end_date).toLocaleDateString()}
              {classInfo.difficulty && (
                <span style={{ marginLeft: '1rem' }}>
                  Level: <strong>{classInfo.difficulty?.replace(/_/g, ' ').toUpperCase()}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Files Section - Organized by Week */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
            Class Materials
          </h2>
          {files.length === 0 ? (
            <p style={{ color: '#666', margin: 0, padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              No files available for this class yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {(() => {
                const filesByWeek = {};
                const noWeekFiles = [];

                files.forEach(file => {
                  if (file.week_number) {
                    if (!filesByWeek[file.week_number]) {
                      filesByWeek[file.week_number] = [];
                    }
                    filesByWeek[file.week_number].push(file);
                  } else {
                    noWeekFiles.push(file);
                  }
                });

                const sortedWeeks = Object.keys(filesByWeek).sort((a, b) => parseInt(a) - parseInt(b));

                return (
                  <>
                    {sortedWeeks.map(weekNum => (
                      <div key={weekNum}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <span style={{
                            padding: '0.4rem 1rem',
                            backgroundColor: '#192A88',
                            color: 'white',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>
                            Week {weekNum}
                          </span>
                          {filesByWeek[weekNum].some(f => f.is_current) && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#28a745',
                              color: 'white',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              Current Week
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {filesByWeek[weekNum].map(file => (
                            <div
                              key={file.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                backgroundColor: file.is_current ? '#e8f5e9' : '#f8f9fa',
                                borderRadius: '8px',
                                border: file.is_current ? '1px solid #28a745' : '1px solid #e9ecef'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500', color: '#333', fontSize: '1rem' }}>
                                  {file.title}
                                </div>
                                {file.description && (
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                    {file.description}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                                  Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                                </div>
                              </div>
                              <a
                                href={file.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#192A88',
                                  color: 'white',
                                  textDecoration: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  marginLeft: '1rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {noWeekFiles.length > 0 && (
                      <div>
                        <div style={{
                          marginBottom: '0.75rem',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#666'
                        }}>
                          General Materials
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {noWeekFiles.map(file => (
                            <div
                              key={file.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #e9ecef'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500', color: '#333', fontSize: '1rem' }}>
                                  {file.title}
                                </div>
                                {file.description && (
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                    {file.description}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                                  Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                                </div>
                              </div>
                              <a
                                href={file.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#192A88',
                                  color: 'white',
                                  textDecoration: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  marginLeft: '1rem',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Quizzes Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
            {selectedStudentName}'s Quizzes
          </h2>

          {selectedQuizzes.length === 0 ? (
            <p style={{ color: '#666', margin: 0, padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              No quizzes available for this class yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedQuizzes.map(quiz => (
                <div
                  key={quiz.id}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', fontSize: '1.15rem' }}>
                        {quiz.title}
                      </div>
                      {quiz.description && (
                        <div style={{ fontSize: '0.95rem', color: '#666', marginTop: '0.35rem' }}>
                          {quiz.description}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <span>Scheduled: {new Date(quiz.scheduled_date).toLocaleDateString()}</span>
                        {quiz.time_limit_minutes && (
                          <span>Time Limit: {quiz.time_limit_minutes} min</span>
                        )}
                        <span>Passing Score: {quiz.passing_score}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      {quiz.submission ? (
                        <div>
                          <span style={{
                            padding: '0.35rem 1rem',
                            borderRadius: '20px',
                            backgroundColor: quiz.submission.passed ? '#28a745' : '#dc3545',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            display: 'inline-block'
                          }}>
                            {quiz.submission.passed ? 'PASSED' : 'NOT PASSED'}
                          </span>
                          <div style={{ fontSize: '1.1rem', marginTop: '0.5rem', fontWeight: '600', color: '#333' }}>
                            Score: {quiz.submission.score?.toFixed(1)}%
                          </div>
                          {quiz.submission.submitted_at && (
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                              Submitted: {new Date(quiz.submission.submitted_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          padding: '0.35rem 1rem',
                          borderRadius: '20px',
                          backgroundColor: quiz.is_active ? '#ffc107' : '#6c757d',
                          color: quiz.is_active ? '#333' : 'white',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          {quiz.is_active ? 'AVAILABLE' : 'NOT YET AVAILABLE'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupTutoringEnrollmentDetail;
