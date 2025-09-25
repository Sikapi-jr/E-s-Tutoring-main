// src/components/ScheduleSessionModal.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import { useUser } from "./UserProvider";
import "../styles/Modal.css";
import "../styles/Form.css";

export default function ScheduleSessionModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { user } = useUser();

  // Early return if user is not loaded yet
  if (!user) {
    return null;
  }

  const user_id = user.account_id;

  /* ─────────────────────────  local state ───────────────────────── */
  const [students, setStudents] = useState([]);
  const [tutorInfo, setTutorInfo] = useState(null); // Store tutor info when parent creates event
  const [parentEmail, setParentEmail] = useState("");       // hidden option value
  const [isConnected, setIsConnected] = useState(false);

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
    if (!token || !isOpen) return;

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
  }, [token, user_id, user.account_id, user.roles, isOpen]);

  /* ─────────────────────────  helpers ───────────────────────────── */
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
          description: `Tutoring with ${student.student_firstName} ${student.student_lastName}`
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      recurrence: "none",
      parentEmail: "",
      selectedStudentId: ""
    });
    setParentEmail("");
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
      resetForm();
      onSuccess?.(); // Callback to refresh events list
      onClose(); // Close modal
    } catch (err) {
      console.error("Error creating event:", err);
      alert(t('calendar.failedToCreateEvent'));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  /* ─────────────────────────  render ────────────────────────────── */
  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('calendar.scheduleTutoringSession')}</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
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
            <form onSubmit={handleSubmit} className="form-section schedule-session-form">
              <input
                name="subject"
                placeholder={t('calendar.subjectPlaceholder')}
                className="form-input"
                required
                value={formData.subject}
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
                required
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
                        {stud.student_firstName} {stud.student_lastName}
                      </option>
                    );
                  }
                })}
              </select>

              <div className="form-field-group">
                <label className="form-label">{t('common.date')}</label>
                <input
                  type="date"
                  name="date"
                  className="form-input"
                  placeholder={t('common.date')}
                  title={t('common.date')}
                  required
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">{t('logHours.startTime')}</label>
                <input
                  type="time"
                  name="startTime"
                  className="form-input"
                  placeholder={t('logHours.startTime')}
                  title={t('logHours.startTime')}
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">{t('logHours.endTime')}</label>
                <input
                  type="time"
                  name="endTime"
                  className="form-input"
                  placeholder={t('logHours.endTime')}
                  title={t('logHours.endTime')}
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                />
              </div>

              <select
                name="recurrence"
                className="form-input"
                value={formData.recurrence}
                onChange={handleChange}
              >
                <option value="none">{t('calendar.oneTime')}</option>
                <option value="weekly">{t('calendar.weekly')}</option>
                <option value="biweekly">{t('calendar.every2Weeks')}</option>
              </select>

            </form>
          )}
        </div>

        {/* Modal Actions - outside scrollable area */}
        {isConnected && (
          <div className="modal-actions">
            <button type="button" className="form-button secondary" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="form-button"
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('.schedule-session-form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
            >
              {t('calendar.scheduleTutoringSession')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}