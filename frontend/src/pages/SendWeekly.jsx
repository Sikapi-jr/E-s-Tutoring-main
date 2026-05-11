// src/pages/SendWeekly.jsx
import React, { useState } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/SendMonthly.css"; // reuse the same CSS

const SendWeekly = () => {
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

  const [currentDay, setCurrentDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [hours, setHours] = useState([]);
  const [total, setTotal] = useState([]);
  const [existingWeeklyHours, setExistingWeeklyHours] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoiceResults, setInvoiceResults] = useState([]);

  // superuser gate
  if (user.is_superuser === 0) {
    navigate("/login");
  }

  const handleFetch = async () => {
    setError("");
    setLoading(true);
    try {
      console.log("Fetching hours with params:", { start: currentDay, end: endDay });
      const hrsRes = await api.get(
        `/api/weeklyHours/`,
        { params: { start: currentDay, end: endDay } }
      );
      console.log("Hours response:", hrsRes.data);
      setHours(hrsRes.data);

      console.log("Fetching totals...");
      const totRes = await api.get(
        `/api/calculateHours/`,
        { params: { start: currentDay, end: endDay } }
      );
      console.log("Totals response:", totRes.data);
      setTotal(totRes.data);

      // Fetch existing weekly hours from database for debugging
      console.log("Fetching existing weekly hours from database...");
      const existingRes = await api.get(`/api/existing-weekly-hours/`);
      console.log("Existing weekly hours:", existingRes.data);
      setExistingWeeklyHours(existingRes.data);
    } catch (e) {
      console.error("Fetch error:", e);
      setError(t('errors.failedToFetchWeeklyData'));
    } finally {
      setLoading(false);
    }
  };

  const confirmButtonClick = async () => {
    setError("");
    setInvoiceResults([]);
    try {
      const res = await api.post(
        `/api/weeklyHours/`,
        total
      );
      if (res.status === 201) {
        if (res.data.invoice_results && res.data.invoice_results.length > 0) {
          setInvoiceResults(res.data.invoice_results);
        } else {
          alert(t('weekly.weeklyHoursCreated'));
        }
      } else if (res.status === 301) {
        alert(t('weekly.duplicateNothingCreated'));
      } else {
        alert(t('errors.somethingWentWrong'));
      }
    } catch (e) {
      console.error("Error creating weekly hours:", e);
      setError(t('errors.failedToCreateWeeklyHours'));
    }
  };

  const handleCheckout = async () => {
    setError("");
    try {
      await api.post(
        `/api/checkout/`,
        {},
        { params: { start: currentDay, end: endDay } }
      );
      alert(t('weekly.checkoutTriggered'));
    } catch (e) {
      console.error("Error sending Stripe invoices:", e);
      setError(t('errors.failedToTriggerCheckout'));
    }
  };

  return (
    <div className="monthly-wrapper">
      <h1 className="monthly-title">{t('navigation.weeklyHours')}</h1>

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
          value={currentDay}
          onChange={(e) => setCurrentDay(e.target.value)}
          placeholder={t('weekly.startDatePlaceholder')}
          required
        />
        <input
          className="form-input"
          type="date"
          value={endDay}
          onChange={(e) => setEndDay(e.target.value)}
          placeholder={t('weekly.endDatePlaceholder')}
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
              <strong>{t('dashboard.student')}:</strong> {hour.student_firstName} {hour.student_lastName} <br />
              <strong>{t('auth.parent')}:</strong> {hour.parent_firstName} {hour.parent_lastName} <br />
              <strong>{t('dashboard.tutor')}:</strong> {hour.tutor_firstName} {hour.tutor_lastName} <br />
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
            <li key={totalItem.id ?? `${totalItem.parent}-${totalItem.date}`}>
              <strong>{t('common.date')}:</strong> {totalItem.date} <br />
              <strong>{t('auth.parent')}:</strong> {totalItem.parent_name || totalItem.parent} <br />
              <strong>{t('weekly.onlineHours')}:</strong> {totalItem.OnlineHours} <br />
              <strong>{t('weekly.inPersonHours')}:</strong> {totalItem.InPersonHours} <br />
              <strong>{t('weekly.totalBeforeTax')}:</strong> ${totalItem.TotalBeforeTax} <br />
            </li>
          ))}
        </ul>
        </div>
      )}

      {error && <p className="monthly-error">{error}</p>}

      {invoiceResults.length > 0 && (
        <div style={{ marginTop: "2rem", padding: "1.25rem", border: "2px solid #192A88", borderRadius: "8px", backgroundColor: "#fff" }}>
          <h3 style={{ color: "#192A88", marginTop: 0, marginBottom: "1rem", borderBottom: "2px solid #FFB31B", paddingBottom: "0.5rem" }}>
            Invoice Processing Results
          </h3>
          {invoiceResults.map((result, index) => {
            const allOk = result.stripe_created && result.email_sent && result.hours_updated > 0;
            const borderColor = allOk ? "#28a745" : "#dc3545";
            return (
              <div key={index} style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "6px", borderLeft: `4px solid ${borderColor}`, backgroundColor: "#f8f9fa" }}>
                <strong style={{ fontSize: "1rem" }}>{result.parent_name}</strong>
                <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.85rem" }}>({result.parent_email})</span>
                <table style={{ marginTop: "0.6rem", width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "24px", paddingRight: "8px" }}>
                        {result.email_sent ? "✅" : "❌"}
                      </td>
                      <td style={{ fontWeight: "600", width: "160px" }}>Email</td>
                      <td>
                        {result.email_sent
                          ? "Sent successfully"
                          : <span style={{ color: "#dc3545" }}>Failed — {result.email_error || "Unknown error"}</span>}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingRight: "8px" }}>
                        {result.stripe_created ? "✅" : "❌"}
                      </td>
                      <td style={{ fontWeight: "600" }}>Stripe Invoice</td>
                      <td>
                        {result.stripe_created
                          ? <span>Created — <code style={{ fontSize: "0.8rem", background: "#e9ecef", padding: "1px 4px", borderRadius: "3px" }}>{result.stripe_invoice_id}</code></span>
                          : <span style={{ color: "#dc3545" }}>Failed — {result.stripe_error || "Unknown error"}</span>}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingRight: "8px" }}>
                        {result.hours_updated > 0 ? "✅" : "⚠️"}
                      </td>
                      <td style={{ fontWeight: "600" }}>Hours Status</td>
                      <td>
                        {result.hours_updated > 0
                          ? `${result.hours_updated} session(s) marked as invoiced`
                          : <span style={{ color: "#856404" }}>0 sessions updated (no pending hours found or Stripe failed)</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Debugging Table - Existing Weekly Hours in Database */}
      {existingWeeklyHours.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ color: "#192A88", textAlign: "center" }}>
            🔍 Database Debug: Existing Weekly Hours ({existingWeeklyHours.length} rows)
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
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Parent</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Start Date</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>End Date</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Online Hrs</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>In-Person Hrs</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Total $</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {existingWeeklyHours.map((row, index) => (
                  <tr key={row.id || index} style={{ 
                    backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                    borderBottom: "1px solid #ddd"
                  }}>
                    <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>
                      {row.id}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                      {row.parent}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "6px" }}>
                      {row.start_date || row.date}
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
            ⚠️ This table shows ALL existing WeeklyHours records in the database for debugging duplicate/overlap detection
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

export default SendWeekly;
