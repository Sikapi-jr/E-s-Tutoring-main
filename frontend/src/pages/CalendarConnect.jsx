// src/components/CalendarConnect.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import { useUser } from "../components/UserProvider";

export default function CalendarConnect() {
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

  const tutor_id = user.account_id;

  /* ─────────────────────────  local state ───────────────────────── */
  const [students, setStudents] = useState([]);
  const [parentEmail, setParentEmail] = useState("");       // hidden option value
  const [isConnected, setIsConnected] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",      // auto‑filled with student username
    date: "",
    startTime: "",
    endTime: "",
    recurrence: "none",
    parentEmail: ""
  });

  const token = localStorage.getItem(ACCESS_TOKEN);

  /* ───────────────────────  initial data fetch ──────────────────── */
  useEffect(() => {
    if (!token) return;

    // 1) check Google Calendar status
    api
      .get(
        `/api/google/status/?id=${user.account_id}`
      )
      .then(res => setIsConnected(res.data.connected))
      .catch(err => {
        console.error("Google status check failed:", err);
        setIsConnected(false);
      });

    // 2) fetch tutor’s students
    (async () => {
      try {
        const res = await api.get(
          `/api/TutorStudents/?tutor=${tutor_id}`
        );
        setStudents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    })();
  }, [token, tutor_id, user.account_id]);

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
    const email = e.target.value;
    const username =
      e.target.options[e.target.selectedIndex].dataset.username;

    setParentEmail(email);
    setFormData(prev => ({
      ...prev,
      parentEmail: email,
      description: username         // auto‑fill description
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const payload = {
      id: user.account_id,
      subject: formData.subject,
      description: formData.description,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      recurrence: formData.recurrence,
      parentEmail: parentEmail
    };

    try {
      await api.post("/api/create-event/", payload);
      alert(t('calendar.eventCreatedSuccessfully'));
    } catch (err) {
      console.error("Error creating event:", err);
      alert(t('calendar.failedToCreateEvent'));
    }
  };

  /* ─────────────────────────  render ────────────────────────────── */
  return (
    <div className="form-container">
      <h1>{t('calendar.googleCalendar')}</h1>

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
              value={parentEmail}
              onChange={handleStudentSelect}
            >
              <option value="">{t('requests.selectStudent')}</option>
              {students.map(stud => (
                <option
                  key={stud.id}
                  value={stud.parent_email}           /* hidden payload */
                  data-username={stud.student_username}
                >
                  {stud.student_username}            {/* visible label */}
                </option>
              ))}
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
        </>
      )}
    </div>
  );
}
