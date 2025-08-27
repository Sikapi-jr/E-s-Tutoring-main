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

  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [hours,  setHours]  = useState([]);
  const [total,  setTotal]  = useState([]);
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
      const hrsRes = await api.get(
        `/api/monthlyHours/`,
        { params: { start: startDate, end: endDate } }
      );
      setHours(hrsRes.data);

      const totRes = await api.get(
        `/api/calculateMonthlyHours/`,
        { params: { start: startDate, end: endDate } }
      );
      setTotal(totRes.data);
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
        {loading ? 'Loading...' : t('weekly.fetchHours')}
      </button>
    </form>

    {loading ? (
      <p>Loading monthly hours...</p>
    ) : hours.length === 0 ? (
      <p>{t('weekly.noHoursToFetch')}</p>
    ) : (
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
    )}

    <hr className="monthly-divider" />

    {total.length === 0 ? (
      <p>{t('weekly.noTotalToCalculate')}</p>
    ) : (
      <ul className="total-list">
        {total.map((t) => (
          <li key={t.id ?? `${t.parent}-${t.date}`}>
            <strong>{t('common.date')}:</strong> {t.date} <br />
            <strong>{t('auth.parent')}:</strong> {t.parent} <br />
            <strong>{t('weekly.onlineHours')}:</strong> {t.OnlineHours} <br />
            <strong>{t('weekly.inPersonHours')}:</strong> {t.InPersonHours} <br />
            <strong>{t('weekly.totalBeforeTax')}:</strong> {t.TotalBeforeTax} <br />
            <strong>{t('dashboard.createdAt')}:</strong>{" "}
            {new Date(t.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    )}

    {error && <p className="monthly-error">{error}</p>}

    <div className="monthly-actions">
      <button onClick={() => confirmButtonClick(hours)}>{t('weekly.looksGood')}</button>
      <button onClick={handleCheckout}>{t('weekly.checkout')}</button>
    </div>
  </div>
);
};

export default SendMonthly;
