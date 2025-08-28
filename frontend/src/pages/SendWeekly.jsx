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

  const [currentDay, setCurrentDay] = useState("");
  const [endDay, setEndDay] = useState("");
  const [hours, setHours] = useState([]);
  const [total, setTotal] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // superuser gate
  if (user.is_superuser === 0) {
    navigate("/login");
  }

  const handleFetch = async () => {
    setError("");
    setLoading(true);
    try {
      console.log("Fetching hours with params:", { currentDay, endDay });
      const hrsRes = await api.get(
        `/api/weeklyHours/`,
        { params: { currentDay, endDay } }
      );
      console.log("Hours response:", hrsRes.data);
      setHours(hrsRes.data);

      console.log("Fetching totals...");
      const totRes = await api.get(
        `/api/calculateHours/`,
        { params: { currentDay, endDay } }
      );
      console.log("Totals response:", totRes.data);
      setTotal(totRes.data);
    } catch (e) {
      console.error("Fetch error:", e);
      setError(t('errors.failedToFetchWeeklyData'));
    } finally {
      setLoading(false);
    }
  };

  const confirmButtonClick = async () => {
    setError("");
    try {
      const res = await api.post(
        `/api/weeklyHours/`,
        total
      );
      if (res.status === 201) {
        alert(t('weekly.weeklyHoursCreated'));
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
        { params: { currentDay, endDay } }
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
            <li key={totalItem.id ?? `${totalItem.parent}-${totalItem.date}`}>
              <strong>{t('common.date')}:</strong> {totalItem.date} <br />
              <strong>{t('auth.parent')}:</strong> {totalItem.parent} <br />
              <strong>{t('weekly.onlineHours')}:</strong> {totalItem.OnlineHours} <br />
              <strong>{t('weekly.inPersonHours')}:</strong> {totalItem.InPersonHours} <br />
              <strong>{t('weekly.totalBeforeTax')}:</strong> ${totalItem.TotalBeforeTax} <br />
            </li>
          ))}
        </ul>
        </div>
      )}

      {error && <p className="monthly-error">{error}</p>}

      <div className="monthly-actions">
        <button onClick={confirmButtonClick}>{t('weekly.looksGood')}</button>
        <button onClick={handleCheckout}>{t('weekly.checkout')}</button>
      </div>
    </div>
  );
};

export default SendWeekly;
