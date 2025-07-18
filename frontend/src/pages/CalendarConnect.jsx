// src/components/CalendarConnect.jsx
import React, { useEffect, useState } from "react";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import { useUser } from '../components/UserProvider';

export default function CalendarConnect() {
  const { user } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    recurrence: "none",
    parentEmail: ""
  });

  const token = localStorage.getItem(ACCESS_TOKEN);

  useEffect(() => {
    if (!token) return;

    api.get(`http://localhost:8000/api/google/status/?id=${user.account_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setIsConnected(res.data.connected))
    .catch(err => {
      console.error("Google status check failed:", err);
      setIsConnected(false);
    });
  }, [token]);

    const handleConnect = () => {
        window.location.href = `http://localhost:8000/api/google/oauth/init?token=${token}`;
    };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      id: user.account_id,
      subject: formData.subject,
      description: formData.description,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      recurrence: formData.recurrence,
      parentEmail: formData.parentEmail
    };

    try {
      await api.post("http://localhost:8000/api/create-event/", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("✅ Event created successfully!");
    } catch (err) {
      console.error("Error creating event:", err);
      alert("❌ Failed to create event.");
    }
  };

  return (
    <div className="form-container">
      <h1>Google Calendar</h1>

      {!isConnected ? (
        <>
          <p>🔌 You haven't linked your Google Calendar.</p>
          <button className="form-button" onClick={handleConnect}>
            Connect Google Account
          </button>
        </>
      ) : (
        <>
          <p>✅ Google Calendar is connected!</p>

          <form onSubmit={handleSubmit} className="form-section">
            <input
              name="subject"
              placeholder="Subject (event title)"
              className="form-input"
              required
              onChange={handleChange}
            />

            <textarea
              name="description"
              placeholder="Description (optional)"
              className="form-input"
              onChange={handleChange}
            />

            <input
              name="parentEmail"
              placeholder="Parent email"
              type="email"
              className="form-input"
              required
              onChange={handleChange}
            />

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
              <option value="none">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 Weeks</option>
            </select>

            <button type="submit" className="form-button">
              📅 Schedule Tutoring Session
            </button>
          </form>
        </>
      )}
    </div>
  );
}
