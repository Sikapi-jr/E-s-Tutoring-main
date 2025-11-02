// src/pages/AdminBatchAddHours.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/AdminBatchAddHours.css";

export default function AdminBatchAddHours() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hours, setHours] = useState([{
    tutor_id: "",
    student_id: "",
    date: "",
    start_time: "",
    end_time: "",
    total_time: "",
    location: "Online",
    subject: "",
    notes: ""
  }]);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Admin gate
  if (!user.is_superuser && user.roles !== 'admin') {
    navigate("/");
    return null;
  }

  // Fetch all tutors and students on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        // Fetch all tutors
        const tutorsRes = await api.get('/api/admin/recent-users/?role=tutor&limit=1000');
        setTutors(Array.isArray(tutorsRes.data) ? tutorsRes.data : []);

        // Fetch all students
        const studentsRes = await api.get('/api/admin/recent-users/?role=student&limit=1000');
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load tutors and students");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const addHourRow = () => {
    // Copy all data from the last row to make batch entry faster
    const lastRow = hours[hours.length - 1];
    setHours([...hours, {
      tutor_id: lastRow.tutor_id || "",
      student_id: lastRow.student_id || "",
      date: lastRow.date || "",
      start_time: lastRow.start_time || "",
      end_time: lastRow.end_time || "",
      total_time: lastRow.total_time || "",
      location: lastRow.location || "Online",
      subject: lastRow.subject || "",
      notes: lastRow.notes || ""
    }]);
  };

  const removeHourRow = (index) => {
    if (hours.length === 1) return; // Keep at least one row
    const newHours = hours.filter((_, i) => i !== index);
    setHours(newHours);
  };

  const updateHourRow = (index, field, value) => {
    const newHours = [...hours];
    newHours[index][field] = value;

    // Auto-calculate total time when start or end time changes
    if (field === 'start_time' || field === 'end_time') {
      const startTime = field === 'start_time' ? value : newHours[index].start_time;
      const endTime = field === 'end_time' ? value : newHours[index].end_time;

      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end - start;

        if (diffMs > 0) {
          const diffHrs = diffMs / (1000 * 60 * 60);
          newHours[index].total_time = diffHrs.toFixed(2);
        }
      }
    }

    setHours(newHours);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResults(null);

    // Validate all rows have required fields
    const invalidRows = hours.filter(h =>
      !h.tutor_id || !h.student_id || !h.date ||
      !h.start_time || !h.end_time || !h.total_time || !h.location
    );

    if (invalidRows.length > 0) {
      setError("Please fill in all required fields for each row");
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.post('/api/admin/batch-add-hours/', {
        hours: hours
      });

      setResults(response.data);

      // If all successful, reset form
      if (response.data.results.failed.length === 0) {
        setHours([{
          tutor_id: "",
          student_id: "",
          date: "",
          start_time: "",
          end_time: "",
          total_time: "",
          location: "Online",
          subject: "",
          notes: ""
        }]);
      }
    } catch (err) {
      console.error("Error submitting hours:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || "Failed to submit hours";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setError("");
  };

  return (
    <div className="admin-batch-hours-container">
      <div className="admin-batch-hours-header">
        <h1>{t('admin.batchAddHours.title', 'Admin: Batch Add Hours for Tutors')}</h1>
        <p className="admin-batch-hours-subtitle">
          {t('admin.batchAddHours.subtitle', 'Add hours for tutors for any date (bypasses current week restriction)')}
        </p>
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          <strong>Note:</strong> Hours added here will be marked as "Eligible" if within current week, or "Late" if outside current week. All hours are auto-accepted.
        </div>
      </div>

      {error && (
        <div className="admin-batch-hours-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div className="admin-batch-hours-results">
          <div className="results-header">
            <h2>Batch Processing Results</h2>
            <button onClick={clearResults} className="btn-close-results">✕ Close</button>
          </div>

          <div className="results-summary">
            <div className="summary-item summary-total">
              <strong>Total Submitted:</strong> {results.results.total_submitted}
            </div>
            <div className="summary-item summary-success">
              <strong>Successful:</strong> {results.results.successful.length}
            </div>
            <div className="summary-item summary-failed">
              <strong>Failed:</strong> {results.results.failed.length}
            </div>
          </div>

          {results.results.successful.length > 0 && (
            <div className="results-section">
              <h3>Successfully Added Hours</h3>
              <div className="results-table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tutor</th>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.successful.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.hour_id}</td>
                        <td>{item.tutor}</td>
                        <td>{item.student}</td>
                        <td>{item.date}</td>
                        <td>{item.total_time}</td>
                        <td className={`status-${item.eligible.toLowerCase()}`}>{item.eligible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.results.failed.length > 0 && (
            <div className="results-section">
              <h3>Failed Entries</h3>
              <div className="failed-entries">
                {results.results.failed.map((item, idx) => (
                  <div key={idx} className="failed-entry">
                    <div className="failed-entry-header">
                      <strong>Row {item.index + 1}:</strong>
                    </div>
                    <div className="failed-entry-error">{item.error}</div>
                    <div className="failed-entry-data">
                      <pre>{JSON.stringify(item.entry, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-batch-hours-form">
        <div className="hours-table-wrapper">
          <table className="hours-table">
            <thead>
              <tr>
                <th>Tutor *</th>
                <th>Student *</th>
                <th>Date *</th>
                <th>Start Time *</th>
                <th>End Time *</th>
                <th>Total Hours *</th>
                <th>Location *</th>
                <th>Subject</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((hour, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={hour.tutor_id}
                      onChange={(e) => updateHourRow(index, 'tutor_id', e.target.value)}
                      required
                      disabled={loadingUsers}
                    >
                      <option value="">Select Tutor</option>
                      {tutors.map(tutor => (
                        <option key={tutor.id} value={tutor.id}>
                          {tutor.firstName} {tutor.lastName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={hour.student_id}
                      onChange={(e) => updateHourRow(index, 'student_id', e.target.value)}
                      required
                      disabled={loadingUsers}
                    >
                      <option value="">Select Student</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={hour.date}
                      onChange={(e) => updateHourRow(index, 'date', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={hour.start_time}
                      onChange={(e) => updateHourRow(index, 'start_time', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={hour.end_time}
                      onChange={(e) => updateHourRow(index, 'end_time', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="8"
                      value={hour.total_time}
                      onChange={(e) => updateHourRow(index, 'total_time', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <select
                      value={hour.location}
                      onChange={(e) => updateHourRow(index, 'location', e.target.value)}
                      required
                    >
                      <option value="Online">Online</option>
                      <option value="In-Person">In-Person</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={hour.subject}
                      onChange={(e) => updateHourRow(index, 'subject', e.target.value)}
                      placeholder="Subject"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={hour.notes}
                      onChange={(e) => updateHourRow(index, 'notes', e.target.value)}
                      placeholder="Notes"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeHourRow(index)}
                      className="btn-remove-row"
                      disabled={hours.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <div className="form-actions-left">
            <button
              type="button"
              onClick={addHourRow}
              className="btn-add-row"
              disabled={submitting}
            >
              + Add Another Row
            </button>
            <button
              type="button"
              onClick={() => setHours([{
                tutor_id: "",
                student_id: "",
                date: "",
                start_time: "",
                end_time: "",
                total_time: "",
                location: "Online",
                subject: "",
                notes: ""
              }])}
              className="btn-clear-all"
              disabled={submitting || hours.length === 1}
            >
              Clear All
            </button>
          </div>

          <div className="form-actions-right">
            <button
              type="submit"
              className="btn-submit"
              disabled={submitting || loadingUsers}
            >
              {submitting ? 'Submitting...' : `Submit ${hours.length} Hour${hours.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
