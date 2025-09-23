// src/pages/ScheduleSession.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import { useUser } from "../components/UserProvider";

export default function ScheduleSession() {
  const { t } = useTranslation();
  const { user } = useUser();

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const user_id = user.account_id;

  /* ─────────────────────────  local state ───────────────────────── */
  const [students, setStudents] = useState([]);
  const [tutorInfo, setTutorInfo] = useState(null); // Store tutor info when parent creates event
  const [parentEmail, setParentEmail] = useState("");       // hidden option value
  const [isConnected, setIsConnected] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",      // auto‑filled with student username
    date: "",
    startTime: "",
    endTime: "",
    recurrence: "none",
    parentEmail: "",
    selectedStudentId: ""  // for parent role
  });

  const token = localStorage.getItem(ACCESS_TOKEN);

  /* ───────────────────────  initial data fetch ──────────────────── */
  useEffect(() => {
    if (!token) return;

    // 1) check Google Calendar status
    const calendarUserId = user?.roles === 'student' ? user.email : user.account_id;
    api
      .get(
        `/api/google/status/?id=${calendarUserId}`
      )
      .then(res => setIsConnected(res.data.connected))
      .catch(err => {
        console.error("Google status check failed:", err);
        setIsConnected(false);
      });

    // 2) fetch students based on user role
    (async () => {
      try {
        if (user.roles === 'tutor') {
          // Fetch tutor's students
          const res = await api.get(
            `/api/TutorStudents/?tutor=${user_id}`
          );
          setStudents(Array.isArray(res.data) ? res.data : []);
        } else if (user.roles === 'parent') {
          // Fetch parent's students
          const res = await api.get(`/api/homeParent/?id=${user_id}`);
          const parentStudents = Array.isArray(res.data.students) ? res.data.students : [];
          setStudents(parentStudents);
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    })();

    // 3) fetch scheduled events if connected
    if (isConnected) {
      fetchScheduledEvents();
    }
  }, [token, user_id, user.account_id, user.roles, isConnected]);

  /* ─────────────────────────  helpers ───────────────────────────── */
  const fetchScheduledEvents = async () => {
    try {
      // For students, use their email; for others, use account_id
      const calendarUserId = user?.roles === 'student' ? user.email : user.account_id;
      const res = await api.get(`/api/google/events/?id=${calendarUserId}`);
      const events = res.data?.items || res.data || [];
      setScheduledEvents(Array.isArray(events) ? events : []);
    } catch (err) {
      console.error("Error fetching scheduled events:", err);
    }
  };

  const handleConnect = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${API_BASE_URL}/api/google/oauth/init?token=${token}`;
  };

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // grab both hidden email and visible username
  const handleStudentSelect = e => {
    const value = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];

    if (user.roles === 'tutor') {
      // For tutors: value is parent email, get username from dataset
      const email = value;
      const username = selectedOption.dataset.username || selectedOption.text;
      setParentEmail(email);
      setFormData(prev => ({
        ...prev,
        parentEmail: email,
        description: `Tutoring with ${username}`
      }));
    } else if (user.roles === 'parent') {
      // For parents: value is student ID, need to find tutor info
      const studentId = value;
      const student = students.find(s => s.id.toString() === studentId);
      if (student) {
        // We need to get the tutor info for this student
        // For now, we'll store the student info and fetch tutor details when creating event
        setFormData(prev => ({
          ...prev,
          selectedStudentId: studentId,
          description: `Tutoring with ${student.username}`
        }));
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    let eventCreatorId, attendeeEmail;

    if (user.roles === 'tutor') {
      // Tutor creates event, parent is attendee
      eventCreatorId = user.account_id;
      attendeeEmail = parentEmail;
    } else if (user.roles === 'parent') {
      // Parent creates event, but tutor should be organizer
      // First, we need to find the tutor for the selected student
      const selectedStudent = students.find(s => s.id.toString() === formData.selectedStudentId);
      if (!selectedStudent) {
        alert('Please select a student');
        return;
      }

      // For parents: we need to get the student's tutor info
      try {
        const tutorRes = await api.get(`/api/student-tutors/${selectedStudent.id}/`);
        const tutors = tutorRes.data || [];
        if (tutors.length === 0) {
          alert('No tutor assigned to this student yet. Please assign a tutor first.');
          return;
        }

        // Use the first tutor (assuming one tutor per student for now)
        const tutor = tutors[0];
        eventCreatorId = tutor.tutor_id;
        attendeeEmail = user.email; // Parent becomes attendee
      } catch (err) {
        console.error('Error fetching tutor info:', err);
        alert('Could not find tutor information for this student.');
        return;
      }
    }

    const payload = {
      id: eventCreatorId,
      subject: formData.subject,
      description: formData.description,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      recurrence: formData.recurrence,
      parentEmail: attendeeEmail
    };

    try {
      await api.post("/api/create-event/", payload);
      alert(t('calendar.eventCreatedSuccessfully'));
      // Refresh the events list after creating a new event
      fetchScheduledEvents();
    } catch (err) {
      console.error("Error creating event:", err);
      alert(t('calendar.failedToCreateEvent'));
    }
  };

  /* ─────────────────────────  render ────────────────────────────── */
  return (
    <div className="form-container">
      <h1>{t('calendar.googleCalendar')}</h1>
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '1px solid #dee2e6'
      }}>
        <p style={{
          margin: 0,
          fontSize: '0.95rem',
          color: '#495057',
          lineHeight: '1.5'
        }}>
          <strong>💡 Planning sessions is optional!</strong> This tool helps you organize your tutoring schedule for better time management. You can log hours for sessions whether they were planned in advance or not.
        </p>
      </div>

      {!isConnected ? (
        <>
          <p>{t('calendar.notLinked')}</p>
          <button className="form-button" onClick={handleConnect}>
            {t('calendar.connectGoogleAccount')}
          </button>
        </>
      ) : (
        <>
          <p>{t('calendar.connected')}</p>

          <form onSubmit={handleSubmit} className="form-section">
            <input
              name="subject"
              placeholder={t('calendar.subjectPlaceholder')}
              className="form-input"
              required
              onChange={handleChange}
            />

            {/* hidden description (auto‑filled) */}
            <input
              type="hidden"
              name="description"
              value={formData.description}
            />

            {/* student selector */}
            <select
              className="form-input"
              value={user.roles === 'tutor' ? parentEmail : formData.selectedStudentId}
              onChange={handleStudentSelect}
            >
              <option value="">{t('requests.selectStudent')}</option>
              {students.map(stud => {
                if (user.roles === 'tutor') {
                  return (
                    <option
                      key={stud.id}
                      value={stud.parent_email}           /* hidden payload */
                      data-username={stud.student_username}
                    >
                      {stud.student_username}            {/* visible label */}
                    </option>
                  );
                } else {
                  // For parents: show their students
                  return (
                    <option
                      key={stud.id}
                      value={stud.id}
                    >
                      {stud.username}
                    </option>
                  );
                }
              })}
            </select>

            <input
              type="date"
              name="date"
              className="form-input"
              required
              onChange={handleChange}
            />

            <input
              type="time"
              name="startTime"
              className="form-input"
              required
              onChange={handleChange}
            />

            <input
              type="time"
              name="endTime"
              className="form-input"
              required
              onChange={handleChange}
            />

            <select
              name="recurrence"
              className="form-input"
              onChange={handleChange}
            >
              <option value="none">{t('calendar.oneTime')}</option>
              <option value="weekly">{t('calendar.weekly')}</option>
              <option value="biweekly">{t('calendar.every2Weeks')}</option>
            </select>

            <button type="submit" className="form-button">
              {t('calendar.scheduleTutoringSession')}
            </button>
          </form>

          {/* Scheduled Sessions Table */}
          <div style={{ marginTop: "2rem" }}>
            <h2>{t('calendar.scheduledSessions')}</h2>
            {scheduledEvents.length > 0 ? (
              <div className="table-wrapper" style={{ overflowX: "auto" }}>
                <table className="events-table" style={{ 
                  width: "100%", 
                  borderCollapse: "collapse",
                  marginTop: "1rem"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.subject')}
                      </th>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.tutor')}
                      </th>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.attendee')}
                      </th>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.date')}
                      </th>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.time')}
                      </th>
                      <th style={{ 
                        padding: "0.75rem", 
                        textAlign: "left", 
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600"
                      }}>
                        {t('calendar.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledEvents.map((event, index) => {
                      const startDate = new Date(event.start?.dateTime || event.start?.date);
                      const endDate = new Date(event.end?.dateTime || event.end?.date);
                      
                      // Extract tutor (creator) and attendee information
                      const creator = event.creator?.email || "Unknown";
                      
                      const attendee = event.attendees?.find(att => att.email !== event.creator?.email);
                      const attendeeName = attendee?.email || "-";
                      
                      // Determine status based on attendee response
                      const status = attendee?.responseStatus === 'accepted' ? '✅' : 
                                    attendee?.responseStatus === 'declined' ? '❌' :
                                    attendee?.responseStatus === 'tentative' ? '⏳' : 
                                    '⏸️';
                      
                      return (
                        <tr key={event.id || index} style={{ 
                          borderBottom: "1px solid #dee2e6"
                        }}>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee"
                          }}>
                            {event.summary || t('calendar.noTitle')}
                          </td>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee"
                          }}>
                            {creator}
                          </td>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee"
                          }}>
                            {attendeeName}
                          </td>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee"
                          }}>
                            {startDate.toLocaleDateString()}
                          </td>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee"
                          }}>
                            {event.start?.dateTime ? 
                              `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                              : t('calendar.allDay')
                            }
                          </td>
                          <td style={{ 
                            padding: "0.75rem", 
                            borderBottom: "1px solid #eee",
                            fontSize: "1.2rem",
                            textAlign: "center"
                          }}>
                            {status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ 
                textAlign: "center", 
                color: "#6c757d", 
                fontStyle: "italic",
                marginTop: "1rem"
              }}>
                {t('calendar.noScheduledSessions')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
