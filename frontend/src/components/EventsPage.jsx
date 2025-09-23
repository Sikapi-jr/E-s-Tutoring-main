// src/pages/EventsPage.jsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { ACCESS_TOKEN } from "../constants";
import { useUser } from "../components/UserProvider";
import StatusMulti from "../components/StatusMulti";
import ScheduleSessionModal from "../components/ScheduleSessionModal";
import "../styles/EventsFilters.css";
import "../styles/Modal.css";

export default function EventsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const token = localStorage.getItem(ACCESS_TOKEN);

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const [isConnected, setConnected] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    statuses: [],
    cantAttendOnly: false,
    start: "",
    end: "",
  });

  // Check Google Calendar connection
  useEffect(() => {
    if (!user || !token) return;
    api
      .get(
        `/api/google/status/?id=${user.account_id}`
      )
      .then((r) => setConnected(r.data.connected))
      .catch(() => setConnected(false));
  }, [user, token]);

  // Load events
  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get(
        `/api/google/events/all?id=${user.account_id}`
      );
      setAllEvents(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      setErr(t('errors.failedToLoadEvents'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleConnect = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    window.location.href = `${API_BASE_URL}/api/google/oauth/init?token=${token}`;
  };

  const getMyStatus = useCallback(
    (ev) => {
      const me = user?.email?.toLowerCase();
      if (!me) return "needsAction";
      const att = (ev.attendees || []).find(
        (a) => a.email?.toLowerCase() === me
      );
      return att?.responseStatus || "needsAction";
    },
    [user]
  );

  const isDefaultStatus = (g) => g !== "declined";

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const txt = `${ev.summary || ""} ${ev.description || ""}`.toLowerCase();
      if (filters.q && !txt.includes(filters.q.toLowerCase())) return false;

      const sDate = new Date(ev.start?.dateTime || ev.start?.date);
      if (filters.start && sDate < new Date(filters.start)) return false;
      if (filters.end && sDate > new Date(filters.end)) return false;

      if (filters.cantAttendOnly) {
        const cant =
          ev.extendedProperties?.private?.cant_attend === "true" ||
          getMyStatus(ev) === "declined";
        if (!cant) return false;
      }

      if (filters.statuses.length) {
        const tag = isDefaultStatus(getMyStatus(ev))
          ? "default"
          : "declined";
        if (!filters.statuses.includes(tag)) return false;
      }

      return true;
    });
  }, [allEvents, filters, getMyStatus]);

  const markCantAttend = async (id) => {
    try {
      const calendarUserId = user?.roles === 'student' ? user.email : user.account_id;
      await api.get(`/api/google/update-rsvp/`, {
        params: { event_id: id, status: "cant_attend", user_id: calendarUserId }
      });
      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                attendees: (e.attendees || []).map((a) =>
                  a.email?.toLowerCase() === user.email.toLowerCase()
                    ? { ...a, responseStatus: "declined" }
                    : a
                ),
                extendedProperties: {
                  ...(e.extendedProperties || {}),
                  private: {
                    ...(e.extendedProperties?.private || {}),
                    cant_attend: "true",
                  },
                },
              }
            : e
        )
      );
    } catch {
      alert(t('errors.couldNotUpdateRSVP'));
    }
  };

  return (
    <div className="events-page">
      {!isConnected ? (
        <div className="form-container">
          <h1>{t('calendar.googleCalendar')}</h1>
          <p>{t('calendar.notLinked')}</p>
          <button className="form-button" onClick={handleConnect}>
            {t('calendar.connectGoogleAccount')}
          </button>
        </div>
      ) : loading ? (
        <div className="ev-spinner-wrap">
          <div className="ev-spinner" />
          <p>{t('common.loading')}</p>
        </div>
      ) : err ? (
        <p style={{ padding: "2rem" }}>{err}</p>
      ) : (
        <>
          <h2 className="ev-title">{t('home.scheduledEvents')}</h2>

          {/* FILTER BAR */}
          <form className="ev-filter-bar" onSubmit={(e) => e.preventDefault()}>
            <input
              className="ev-input"
              type="text"
              placeholder={t('events.searchPlaceholder')}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />

            <StatusMulti
              value={filters.statuses}
              onChange={(s) => setFilters((f) => ({ ...f, statuses: s }))}
            />

            <label className="inline-check">
              <input
                type="checkbox"
                checked={filters.cantAttendOnly}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    cantAttendOnly: e.target.checked,
                  }))
                }
              />
              {t('events.cantAttendOnly')}
            </label>

            <input
              className="ev-input"
              type="date"
              value={filters.start}
              onChange={(e) =>
                setFilters((f) => ({ ...f, start: e.target.value }))
              }
            />
            <input
              className="ev-input"
              type="date"
              value={filters.end}
              onChange={(e) =>
                setFilters((f) => ({ ...f, end: e.target.value }))
              }
            />
          </form>

          {/* EVENTS TABLE HEADER WITH ADD BUTTON */}
          <div className="events-table-header">
            <h3>{t('calendar.scheduledSessions')}</h3>
            {(user.roles === 'tutor' || user.roles === 'parent') && isConnected && (
              <button
                className="add-session-btn-table"
                onClick={() => setIsModalOpen(true)}
                title={t('calendar.scheduleTutoringSession')}
              >
                + {t('calendar.addSession')}
              </button>
            )}
          </div>

          {/* EVENTS TABLE */}
          <div className="table-wrapper">
            {filteredEvents.length ? (
              <table className="events-table">
                <thead>
                  <tr>
                    <th>{t('common.title')}</th>
                    <th>{t('calendar.tutor')}</th>
                    <th>{t('calendar.attendee')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('events.start')}</th>
                    <th>{t('events.end')}</th>
                    <th>{t('calendar.status')}</th>
                    <th>{t('events.cantAttend')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev) => {
                    const s = new Date(ev.start?.dateTime || ev.start?.date);
                    const e = new Date(ev.end?.dateTime || ev.end?.date);
                    
                    // Get organizer info - show organizer email  
                    const creator = ev?.organizer?.email || "Unknown";
                    
                    // Get attendee info - show attendee email
                    const attendee = ev?.attendees?.find(att => att.email !== ev?.organizer?.email);
                    const attendeeName = attendee?.email || "-";
                    
                    // Determine status based on attendee response
                    const status = attendee?.responseStatus === 'accepted' ? '✅' : 
                                  attendee?.responseStatus === 'declined' ? '❌' :
                                  attendee?.responseStatus === 'tentative' ? '⏳' : 
                                  '⏸️';
                    
                    return (
                      <tr key={ev.id}>
                        <td>{ev.summary || t('events.noTitle')}</td>
                        <td>{creator}</td>
                        <td>{attendeeName}</td>
                        <td>{s.toLocaleDateString()}</td>
                        <td>{s.toLocaleTimeString()}</td>
                        <td>{e.toLocaleTimeString()}</td>
                        <td style={{ fontSize: "1.2rem", textAlign: "center" }}>{status}</td>
                        <td>
                          <button
                            onClick={() => markCantAttend(ev.id)}
                            className="cant-btn"
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p style={{ textAlign: "center", color: "#888" }}>
                {t('events.noEventsMatchFilters')}
              </p>
            )}
          </div>
        </>
      )}


      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadEvents}
      />
    </div>
  );
}
