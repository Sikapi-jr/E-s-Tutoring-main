// src/pages/SendMonthly.jsx
import React, { useState } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/SendMonthly.css";

const SendMonthly = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [hours,  setHours]  = useState([]);
  const [total,  setTotal]  = useState([]);
  const [existingMonthlyHours, setExistingMonthlyHours] = useState([]);
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);

  // gatekeep
  if (user.is_superuser === 0) {
    navigate("/login");
  }

  const handleFetch = async () => {
    setError("");
    setLoading(true);
    try {
      console.log("Fetching hours with params:", { start: startDate, end: endDate });
      const hrsRes = await api.get(
        `/api/monthlyHours/`,
        { params: { start: startDate, end: endDate } }
      );
      console.log("Hours response:", hrsRes.data);
      setHours(hrsRes.data);

      console.log("Fetching totals...");
      const totRes = await api.get(
        `/api/calculateMonthlyHours/`,
        { params: { start: startDate, end: endDate } }
      );
      console.log("Totals response:", totRes.data);
      setTotal(totRes.data);

      // Fetch existing monthly hours from database for debugging
      console.log("Fetching existing monthly hours from database...");
      const existingRes = await api.get(`/api/existing-monthly-hours/`);
      console.log("Existing monthly hours:", existingRes.data);
      setExistingMonthlyHours(existingRes.data);
    } catch (e) {
      console.error("Fetch error:", e);
      setError(t('errors.failedToFetchMonthlyData'));
    } finally {
      setLoading(false);
    }
  };

  const confirmButtonClick = async () => {
    setError("");
    try {
      const res = await api.post(
        `/api/monthlyHours/`,
        total
      );
      if (res.status === 201) {
        alert(t('monthly.monthlyHoursCreated'));
      } else if (res.status === 301) {
        alert(t('weekly.duplicateNothingCreated'));
      } else {
        alert(t('errors.somethingWentWrong'));
      }
    } catch (e) {
      console.error("Create error:", e);
      setError(t('errors.failedToCreateMonthlyHours'));
    }
  };

  const handleCheckout = async () => {
    setError("");
    try {
      const payload = {
        start_date: startDate,
        end_date: endDate,
      };
      await api.post(
        `/api/monthlyPayout/`, payload
      );
      alert(t('weekly.checkoutTriggered'));
    } catch (e) {
      console.error("Checkout error:", e);
      setError(t('errors.failedToTriggerCheckout'));
    }
  };

return (
  <div className="monthly-wrapper">
    <h1 className="monthly-title">{t('navigation.monthlyHours')}</h1>

    <form
      className="monthly-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleFetch();
      }}
    >
      <input
        className="form-input"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        required
      />
      <input
        className="form-input"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? t('common.loading') : t('weekly.fetchHours')}
      </button>
    </form>

    {loading ? (
      <p>{t('common.loading')}...</p>
    ) : hours.length === 0 ? (
      <p>{t('weekly.noHoursToFetch')}</p>
    ) : (
      <div>
        <p>{t('loggedHours.totalSessions')}: {hours.length}</p>
      <ul className="hours-list">
        {hours.map((hour) => (
          <li key={hour.id}>
            <strong>{t('common.id')}:</strong> {hour.id} <br />
            <strong>{t('dashboard.student')}:</strong> {hour.student} <br />
            <strong>{t('auth.parent')}:</strong> {hour.parent} <br />
            <strong>{t('dashboard.tutor')}:</strong> {hour.tutor} <br />
            <strong>{t('common.date')}:</strong> {hour.date} <br />
            <strong>{t('logHours.startTime')}:</strong> {hour.startTime} <br />
            <strong>{t('logHours.endTime')}:</strong> {hour.endTime} <br />
            <strong>{t('weekly.totalTime')}:</strong> {hour.totalTime} <br />
            <strong>{t('logHours.subject')}:</strong> {hour.subject} <br />
            <strong>{t('requests.location')}:</strong> {hour.location} <br />
            <strong>{t('logHours.notes')}:</strong> {hour.notes} <br />
            <strong>{t('dashboard.createdAt')}:</strong>{" "}
            {new Date(hour.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
      </div>
    )}

    <hr className="monthly-divider" />

    {total.length === 0 ? (
      <p>{t('weekly.noTotalToCalculate')}</p>
    ) : (
      <div>
        <p>{t('loggedHours.totalSessions')}: {total.length}</p>
      <ul className="total-list">
        {total.map((totalItem) => (
          <li key={totalItem.id ?? `${totalItem.tutor}-${totalItem.end_date}`}>
            <strong>{t('common.date')}:</strong> {totalItem.end_date} <br />
            <strong>{t('dashboard.tutor')}:</strong> {totalItem.tutor} <br />
            <strong>{t('weekly.onlineHours')}:</strong> {totalItem.OnlineHours} <br />
            <strong>{t('weekly.inPersonHours')}:</strong> {totalItem.InPersonHours} <br />
            <strong>{t('weekly.totalBeforeTax')}:</strong> ${totalItem.TotalBeforeTax} <br />
          </li>
        ))}
      </ul>
      </div>
    )}

    {error && <p className="monthly-error">{error}</p>}

    {/* Debugging Table - Existing Monthly Hours in Database */}
    {existingMonthlyHours.length > 0 && (
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ color: "#192A88", textAlign: "center" }}>
          🔍 Database Debug: Existing Monthly Hours ({existingMonthlyHours.length} rows)
        </h2>
        <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse", 
            border: "2px solid #192A88",
            fontSize: "0.85rem"
          }}>
            <thead style={{ backgroundColor: "#192A88", color: "white" }}>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>ID</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Tutor</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Start Date</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>End Date</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Online Hrs</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>In-Person Hrs</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Total $</th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {existingMonthlyHours.map((row, index) => (
                <tr key={row.id || index} style={{ 
                  backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                  borderBottom: "1px solid #ddd"
                }}>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>
                    {row.id}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                    {row.tutor}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                    {row.start_date}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                    {row.end_date}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>
                    {row.OnlineHours || row.online_hours}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>
                    {row.InPersonHours || row.in_person_hours}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "right" }}>
                    ${row.TotalBeforeTax || row.total_before_tax}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "6px", fontSize: "0.75rem" }}>
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ 
          fontSize: "0.8rem", 
          color: "#666", 
          textAlign: "center",
          fontStyle: "italic"
        }}>
          ⚠️ This table shows ALL existing MonthlyHours records in the database for debugging duplicate/overlap detection
        </p>
      </div>
    )}

    <div className="monthly-actions">
      <button onClick={confirmButtonClick}>{t('weekly.looksGood')}</button>
      <button onClick={handleCheckout}>{t('weekly.checkout')}</button>
    </div>
  </div>
);
};

export default SendMonthly;
