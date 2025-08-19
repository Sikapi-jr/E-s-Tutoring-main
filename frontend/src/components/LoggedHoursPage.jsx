import React, { useEffect, useState } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import "../styles/HoursPage.css";

export default function LoggedHoursPage() {
  /* ─────────────── local state ─────────────── */
  const { t } = useTranslation();
  const { user } = useUser();
  const [hours,   setHours]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  /* ─────────────── fetch once ─────────────── */
  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        /* Adjust the endpoint / query params to match your backend */
        const res = await api.get(
          `/api/parentHours/?id=${user.account_id}`
        );
        setHours(Array.isArray(res.data) ? res.data : []);
      } catch {
        setErr(t('errors.failedToLoadLoggedHours'));
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /* ─────────────── render paths ─────────────── */
  if (!user || loading) {
    return (
      <div className="hrs-spinner-wrap">
        <div className="hrs-spinner" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }
  if (err) return <p style={{ padding: "2rem" }}>{err}</p>;

  /* ─────────────── main table ─────────────── */
  return (
    <div className="hours-page">
      <h2 className="hrs-title">{t('loggedHours.title')}</h2>

      {hours.length ? (
        <table className="hours-table">
          <thead>
            <tr>
              <th>{t('common.date')}</th>
              <th>{t('dashboard.student')}</th>
              <th>{t('events.start')}</th>
              <th>{t('events.end')}</th>
              <th>{t('loggedHours.totalHours')}</th>
              <th>{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.id}>
                <td data-label="Date">
                  {new Date(h.date).toLocaleDateString()}
                </td>
                <td data-label="Student">{h.student_username}</td>
                <td data-label="Start">{h.start_time}</td>
                <td data-label="End">{h.end_time}</td>
                <td data-label="Total (h)">{h.total_hours}</td>
                <td
                  data-label="Status"
                  data-status={h.status?.toLowerCase() || "pending"}
                >
                  {h.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: "center", color: "#888" }}>
          {t('loggedHours.noHours')}
        </p>
      )}
    </div>
  );
}
