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
    is_active: true,
    header_image: null
  });

  // Admin quick link modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSessionsCalendarModal, setShowSessionsCalendarModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showParentViewModal, setShowParentViewModal] = useState(false);
  const [parentViewMonth, setParentViewMonth] = useState(new Date());
  const [parentViewSessions, setParentViewSessions] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classFiles, setClassFiles] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editSessionForm, setEditSessionForm] = useState({
    new_date: '',
    new_time: '',
    is_cancelled: false,
    cancellation_reason: ''
  });
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
      is_active: true,
      header_image: null
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
      // Use FormData if there's an image to upload
      if (formData.header_image) {
        const submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (key === 'header_image' && formData[key]) {
            submitData.append('header_image', formData[key]);
          } else if (key === 'tutors' || key === 'schedule_days') {
            // Handle arrays
            formData[key].forEach(item => submitData.append(key, item));
          } else if (formData[key] !== null && formData[key] !== '') {
            submitData.append(key, formData[key]);
          }
        });
        await api.post('/api/group-tutoring/classes/', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // No image, use regular JSON
        const { header_image, ...dataWithoutImage } = formData;
        await api.post('/api/group-tutoring/classes/', dataWithoutImage);
      }
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

  // ========== Sessions Calendar Modal Handlers ==========
  const handleOpenSessionsCalendarModal = async (classItem) => {
    setSelectedClass(classItem);
    setSelectedSession(null);
    setCurrentMonth(new Date());
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
    setShowSessionsCalendarModal(true);
  };

  // ========== Parent View Modal Handlers ==========
  const handleOpenParentViewModal = async (classItem) => {
    setSelectedClass(classItem);
    setParentViewMonth(new Date());
    setModalLoading(true);

    try {
      const [sessionsRes, filesRes] = await Promise.all([
        api.get(`/api/group-tutoring/admin/classes/${classItem.id}/parent-view-sessions/`),
        api.get(`/api/group-tutoring/classes/${classItem.id}/files/`)
      ]);
      setParentViewSessions(sessionsRes.data);
      setClassFiles(filesRes.data);
    } catch (err) {
      console.error('Error fetching parent view data:', err);
      setParentViewSessions([]);
      setClassFiles([]);
    } finally {
      setModalLoading(false);
    }
    setShowParentViewModal(true);
  };

  const getParentViewDaysInMonth = (date) => {
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

  const getParentViewSessionsForDate = (date) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return parentViewSessions.filter(s => s.session_date === dateStr);
  };

  const parentViewNextMonth = () => {
    setParentViewMonth(new Date(parentViewMonth.getFullYear(), parentViewMonth.getMonth() + 1, 1));
  };

  const parentViewPrevMonth = () => {
    setParentViewMonth(new Date(parentViewMonth.getFullYear(), parentViewMonth.getMonth() - 1, 1));
  };

  const getParentViewSessionColor = (session) => {
    if (session.is_cancelled) {
      return '#f8d7da'; // Red for cancelled
    }
    // Check attendance status first
    if (session.attendance_status === 'attended') {
      return '#d4edda'; // Green for attended
    } else if (session.attendance_status === 'absent') {
      return '#f8d7da'; // Red for missed/absent
    } else if (session.attendance_status === 'cancelled_advance') {
      return '#fff3cd'; // Yellow for cancelled in advance
    }
    // For sessions without attendance status
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sessionDate < today) {
      return '#f8f9fa'; // Gray for past without attendance record
    }
    return '#e3f2fd'; // Light blue for upcoming
  };

  const getParentViewAttendanceIcon = (session) => {
    if (session.attendance_status === 'attended') return '✓';
    if (session.attendance_status === 'absent') return '✗';
    if (session.attendance_status === 'cancelled_advance') return '⊗';
    return '';
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
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
    return classSessions.filter(s => s.session_date === dateStr);
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

  const getSessionColor = (session) => {
    if (session.is_cancelled) {
      return '#f8d7da'; // Red for cancelled
    }
    if (session.exists_in_db) {
      return '#d4edda'; // Green for modified/saved in DB
    }
    return '#e3f2fd'; // Light blue for auto-generated
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    setEditSessionForm({
      new_date: session.session_date,
      new_time: session.start_time?.substring(0, 5) || '',
      is_cancelled: session.is_cancelled || false,
      cancellation_reason: ''
    });
    setShowEditSessionModal(true);
  };

  // ========== Week Date Range Calculator ==========
  const getWeekRanges = (classItem) => {
    if (!classItem || !classItem.start_date || !classItem.end_date) return [];

    const weeks = [];
    const startDate = new Date(classItem.start_date);
    const endDate = new Date(classItem.end_date);

    let weekNum = 1;
    let currentWeekStart = new Date(startDate);

    while (currentWeekStart <= endDate) {
      // Calculate end of this week (6 days after start, or end_date if sooner)
      let currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

      if (currentWeekEnd > endDate) {
        currentWeekEnd = new Date(endDate);
      }

      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      weeks.push({
        weekNumber: weekNum,
        startDate: new Date(currentWeekStart),
        endDate: new Date(currentWeekEnd),
        label: `Week ${weekNum}: ${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}`
      });

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNum++;
    }

    return weeks;
  };

  const getWeekLabel = (weekNumber, classItem) => {
    if (!weekNumber) return 'General';
    const weeks = getWeekRanges(classItem);
    const week = weeks.find(w => w.weekNumber === parseInt(weekNumber));
    return week ? week.label : `Week ${weekNumber}`;
  };

  const handleSaveSessionEdit = async (e) => {
    e.preventDefault();
    if (!selectedSession || !selectedClass) return;

    setModalLoading(true);
    try {
      const payload = {};

      // Check if date changed
      if (editSessionForm.new_date !== selectedSession.session_date) {
        payload.new_date = editSessionForm.new_date;
      }

      // Check if time changed
      if (editSessionForm.new_time && editSessionForm.new_time !== selectedSession.start_time?.substring(0, 5)) {
        payload.new_time = editSessionForm.new_time;
      }

      // Check if cancellation status changed
      if (editSessionForm.is_cancelled !== selectedSession.is_cancelled) {
        payload.is_cancelled = editSessionForm.is_cancelled;
        if (editSessionForm.is_cancelled && editSessionForm.cancellation_reason) {
          payload.cancellation_reason = editSessionForm.cancellation_reason;
        }
      }

      const response = await api.patch(
        `/api/group-tutoring/admin/classes/${selectedClass.id}/sessions/${selectedSession.session_date}/`,
        payload
      );

      alert(response.data.message);
      setShowEditSessionModal(false);

      // Refresh sessions
      const sessionsResponse = await api.get(`/api/group-tutoring/admin/classes/${selectedClass.id}/sessions/`);
      setClassSessions(sessionsResponse.data);
    } catch (err) {
      console.error('Error updating session:', err);
      alert('Failed to update session: ' + (err.response?.data?.error || 'Unknown error'));
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
                <button
                  onClick={() => handleOpenSessionsCalendarModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#e83e8c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Manage Sessions
                </button>
                <button
                  onClick={() => handleOpenParentViewModal(classItem)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: '#192A88',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  View as Parent
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
          <li><strong>Edit Schedule</strong> - Change the recurring class schedule and notify parents automatically</li>
          <li><strong>Manage Sessions</strong> - View calendar and modify individual class dates (reschedule or cancel specific sessions)</li>
          <li><strong>View as Parent</strong> - Preview what parents see: calendar, weekly materials, and quiz grades</li>
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

                {/* Header Image Upload */}
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Header Image (optional)
                  </label>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                    This image will be displayed as the background header on the class details page.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFormChange('header_image', e.target.files[0] || null)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                  {formData.header_image && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#28a745' }}>
                      Selected: {formData.header_image.name}
                    </div>
                  )}
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
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Week</label>
                  <select
                    value={uploadForm.week_number}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, week_number: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">General (no specific week)</option>
                    {getWeekRanges(selectedClass).map(week => (
                      <option key={week.weekNumber} value={week.weekNumber}>
                        {week.label}
                      </option>
                    ))}
                  </select>
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
                      <td style={{ padding: '0.75rem' }}>{getWeekLabel(file.week_number, selectedClass)}</td>
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

      {/* Sessions Calendar Modal */}
      {showSessionsCalendarModal && selectedClass && (
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
            maxWidth: '1100px',
            width: '95%',
            maxHeight: '95vh',
            overflowY: 'auto',
            margin: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#192A88' }}>Manage Sessions - {selectedClass.title}</h2>
              <button
                onClick={() => setShowSessionsCalendarModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Click on any session to reschedule or cancel it. Changes to individual sessions do not affect the recurring schedule.
            </p>

            {/* Legend */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', borderRadius: '4px' }}></span>
                Auto-generated
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#d4edda', border: '1px solid #ddd', borderRadius: '4px' }}></span>
                Modified/Rescheduled
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#f8d7da', border: '1px solid #ddd', borderRadius: '4px' }}></span>
                Cancelled
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '20px', height: '20px', backgroundColor: '#ffb74d', border: '2px solid #ff9800', borderRadius: '4px' }}></span>
                Today
              </span>
            </div>

            {modalLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem' }}>Loading sessions...</p>
            ) : (
              <>
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
                    Previous
                  </button>
                  <h3 style={{ margin: 0, color: '#192A88', fontSize: '1.5rem' }}>
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
                    Next
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
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    const daySessions = date ? getSessionsForDate(date) : [];
                    const todayCell = date && isToday(date);

                    return (
                      <div
                        key={index}
                        style={{
                          minHeight: '100px',
                          padding: '0.5rem',
                          border: todayCell ? '3px solid #ff9800' : '1px solid #ddd',
                          borderRadius: '8px',
                          backgroundColor: todayCell ? '#fff8e1' : (date ? 'white' : '#f5f5f5'),
                          position: 'relative'
                        }}
                      >
                        {date && (
                          <>
                            <div style={{
                              fontWeight: todayCell ? 'bold' : 'normal',
                              fontSize: '0.9rem',
                              marginBottom: '0.5rem',
                              color: todayCell ? '#e65100' : '#333',
                              textAlign: 'center'
                            }}>
                              {date.getDate()}
                            </div>

                            {daySessions.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {daySessions.map(session => (
                                  <div
                                    key={session.id}
                                    onClick={() => handleSessionClick(session)}
                                    style={{
                                      backgroundColor: getSessionColor(session),
                                      padding: '0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      border: '1px solid #ddd',
                                      transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.02)';
                                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <div style={{ fontWeight: 'bold', marginBottom: '2px', color: session.is_cancelled ? '#721c24' : '#192A88' }}>
                                      {session.is_cancelled && '✗ '}{session.title}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.7rem' }}>
                                      {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                    </div>
                                    {session.is_cancelled && (
                                      <div style={{ color: '#dc3545', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                        CANCELLED
                                      </div>
                                    )}
                                    {session.exists_in_db && !session.is_cancelled && (
                                      <div style={{ color: '#28a745', fontSize: '0.65rem' }}>
                                        Modified
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSessionsCalendarModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditSessionModal && selectedSession && (
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
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#192A88' }}>Edit Session</h2>
              <button
                onClick={() => setShowEditSessionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Original Date:</strong> {new Date(selectedSession.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style={{ margin: 0 }}><strong>Original Time:</strong> {selectedSession.start_time?.substring(0, 5)} - {selectedSession.end_time?.substring(0, 5)}</p>
            </div>

            <form onSubmit={handleSaveSessionEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  New Date
                </label>
                <input
                  type="date"
                  value={editSessionForm.new_date}
                  onChange={(e) => setEditSessionForm(prev => ({ ...prev, new_date: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666' }}>Change to reschedule to a different date</small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  New Time
                </label>
                <input
                  type="time"
                  value={editSessionForm.new_time}
                  onChange={(e) => setEditSessionForm(prev => ({ ...prev, new_time: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <small style={{ color: '#666' }}>Change to modify the start time</small>
              </div>

              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: selectedSession.is_cancelled ? '#d4edda' : '#fff3cd', borderRadius: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editSessionForm.is_cancelled}
                    onChange={(e) => setEditSessionForm(prev => ({ ...prev, is_cancelled: e.target.checked }))}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>
                    {selectedSession.is_cancelled ? 'Session is cancelled - Uncheck to restore' : 'Cancel this session'}
                  </span>
                </label>
              </div>

              {editSessionForm.is_cancelled && !selectedSession.is_cancelled && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Cancellation Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={editSessionForm.cancellation_reason}
                    onChange={(e) => setEditSessionForm(prev => ({ ...prev, cancellation_reason: e.target.value }))}
                    placeholder="e.g., Holiday, Tutor unavailable..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditSessionModal(false)}
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
                    backgroundColor: modalLoading ? '#ccc' : '#e83e8c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parent View Modal */}
      {showParentViewModal && selectedClass && (
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
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '0',
            maxWidth: '1200px',
            width: '95%',
            maxHeight: '95vh',
            overflowY: 'auto',
            margin: '1rem'
          }}>
            {/* Hero Header */}
            <div style={{
              background: 'linear-gradient(135deg, #192A88 0%, #3a4db5 100%)',
              color: 'white',
              padding: '2rem',
              borderRadius: '8px 8px 0 0',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowParentViewModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'white',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                &times;
              </button>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem', opacity: 0.9 }}>
                Parent View Preview
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{selectedClass.title}</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>
                {selectedClass.difficulty?.replace('_', ' ').toUpperCase()} | {selectedClass.subject}
              </p>
            </div>

            <div style={{ padding: '2rem' }}>
              {/* Class Info Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#192A88' }}>Class Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <strong>Schedule:</strong> {selectedClass.schedule_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') || 'TBD'}
                    {selectedClass.schedule_time && ` at ${selectedClass.schedule_time}`}
                  </div>
                  <div>
                    <strong>Duration:</strong> {new Date(selectedClass.start_date).toLocaleDateString()} - {new Date(selectedClass.end_date).toLocaleDateString()}
                  </div>
                  {selectedClass.location && (
                    <div>
                      <strong>Location:</strong> {selectedClass.location}
                      {selectedClass.location_link && (
                        <a href={selectedClass.location_link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', color: '#192A88' }}>
                          (Join Link)
                        </a>
                      )}
                    </div>
                  )}
                  {selectedClass.tutor_details && selectedClass.tutor_details.length > 0 && (
                    <div>
                      <strong>Tutors:</strong> {selectedClass.tutor_details.map(t => t.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Calendar Section */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#192A88' }}>Class Calendar</h3>

                {modalLoading ? (
                  <p>Loading calendar...</p>
                ) : (
                  <>
                    {/* Legend */}
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                      <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#e3f2fd', border: '1px solid #ddd', marginRight: '5px' }}></span>Upcoming</span>
                      <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#d4edda', border: '1px solid #ddd', marginRight: '5px' }}></span>Attended</span>
                      <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#f8d7da', border: '1px solid #ddd', marginRight: '5px' }}></span>Missed</span>
                      <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#fff3cd', border: '1px solid #ddd', marginRight: '5px' }}></span>Cancelled in Advance</span>
                      <span><span style={{ display: 'inline-block', width: '15px', height: '15px', backgroundColor: '#ffb74d', border: '2px solid #ff9800', marginRight: '5px' }}></span>Today</span>
                    </div>

                    {/* Calendar Navigation */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <button
                        onClick={parentViewPrevMonth}
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
                        Previous
                      </button>
                      <h4 style={{ margin: 0, color: '#192A88' }}>
                        {parentViewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={parentViewNextMonth}
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
                        Next
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
                          backgroundColor: '#192A88',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days */}
                      {getParentViewDaysInMonth(parentViewMonth).map((date, index) => {
                        const daySessions = date ? getParentViewSessionsForDate(date) : [];
                        const todayCell = date && isToday(date);

                        return (
                          <div
                            key={index}
                            style={{
                              minHeight: '80px',
                              padding: '0.25rem',
                              border: todayCell ? '2px solid #ff9800' : '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: todayCell ? '#fff8e1' : (date ? 'white' : '#f5f5f5')
                            }}
                          >
                            {date && (
                              <>
                                <div style={{
                                  fontWeight: todayCell ? 'bold' : 'normal',
                                  fontSize: '0.8rem',
                                  marginBottom: '0.25rem',
                                  color: todayCell ? '#e65100' : '#333',
                                  textAlign: 'center'
                                }}>
                                  {date.getDate()}
                                </div>

                                {daySessions.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {daySessions.map(session => (
                                      <div
                                        key={session.id}
                                        style={{
                                          backgroundColor: getParentViewSessionColor(session),
                                          padding: '0.25rem',
                                          borderRadius: '3px',
                                          fontSize: '0.65rem',
                                          border: '1px solid #ddd'
                                        }}
                                      >
                                        <div style={{ fontWeight: 'bold', color: session.is_cancelled ? '#721c24' : (session.attendance_status === 'absent' ? '#721c24' : '#192A88') }}>
                                          {getParentViewAttendanceIcon(session)} {session.is_cancelled ? '✗ ' : ''}{session.start_time?.substring(0, 5)}
                                        </div>
                                        <div style={{ color: '#666', fontSize: '0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {session.student_name}
                                        </div>
                                        {session.is_cancelled && (
                                          <div style={{ color: '#dc3545', fontSize: '0.6rem' }}>Session Cancelled</div>
                                        )}
                                        {session.attendance_status === 'absent' && !session.is_cancelled && (
                                          <div style={{ color: '#dc3545', fontSize: '0.6rem', fontWeight: 'bold' }}>MISSED</div>
                                        )}
                                        {session.attendance_status === 'attended' && (
                                          <div style={{ color: '#28a745', fontSize: '0.6rem' }}>Attended</div>
                                        )}
                                        {session.attendance_status === 'cancelled_advance' && (
                                          <div style={{ color: '#856404', fontSize: '0.6rem' }}>Cancelled</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Weekly Materials Section */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: '#192A88' }}>Weekly Materials</h3>

                {classFiles.length === 0 ? (
                  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
                    No materials uploaded yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Group files by week */}
                    {(() => {
                      const weeks = getWeekRanges(selectedClass);
                      const generalFiles = classFiles.filter(f => !f.week_number);
                      const weeklyFiles = weeks.map(week => ({
                        ...week,
                        files: classFiles.filter(f => f.week_number === week.weekNumber)
                      })).filter(w => w.files.length > 0);

                      return (
                        <>
                          {/* General Files */}
                          {generalFiles.length > 0 && (
                            <div style={{
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                backgroundColor: '#6c757d',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                fontWeight: 'bold'
                              }}>
                                General Resources
                              </div>
                              <div style={{ padding: '1rem' }}>
                                {generalFiles.map(file => (
                                  <div
                                    key={file.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '0.5rem 0',
                                      borderBottom: '1px solid #eee'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 'bold' }}>{file.title}</div>
                                      {file.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{file.description}</div>}
                                    </div>
                                    <a
                                      href={file.file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        padding: '0.4rem 0.8rem',
                                        backgroundColor: '#192A88',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      Download
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Weekly Files */}
                          {weeklyFiles.map(week => (
                            <div
                              key={week.weekNumber}
                              style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{
                                backgroundColor: week.files.some(f => f.is_current) ? '#28a745' : '#192A88',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>{week.label}</span>
                                {week.files.some(f => f.is_current) && (
                                  <span style={{
                                    backgroundColor: 'white',
                                    color: '#28a745',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                  }}>
                                    CURRENT WEEK
                                  </span>
                                )}
                              </div>
                              <div style={{ padding: '1rem' }}>
                                {week.files.map(file => (
                                  <div
                                    key={file.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '0.5rem 0',
                                      borderBottom: '1px solid #eee'
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 'bold' }}>{file.title}</div>
                                      {file.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{file.description}</div>}
                                    </div>
                                    <a
                                      href={file.file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        padding: '0.4rem 0.8rem',
                                        backgroundColor: '#192A88',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      Download
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Quiz Grades Section (Placeholder) */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#192A88' }}>Quiz Grades</h3>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#1565c0'
                }}>
                  <p style={{ margin: 0, fontSize: '1.1rem' }}>
                    Quiz grades will appear here once quizzes are added to this class.
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                    Number of quizzes configured: {selectedClass.num_quizzes || 0}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={() => setShowParentViewModal(false)}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoringAdmin;
