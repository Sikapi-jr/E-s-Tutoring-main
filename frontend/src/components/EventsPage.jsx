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

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingEvent, setCancellingEvent] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

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

  const isAcceptedStatus = (g) => g !== "declined";

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
        const tag = isAcceptedStatus(getMyStatus(ev))
          ? "accepted"
          : "declined";
        if (!filters.statuses.includes(tag)) return false;
      }

      return true;
    });
  }, [allEvents, filters, getMyStatus]);

  const toggleAttendanceStatus = async (id, currentStatus) => {
    const event = allEvents.find(e => e.id === id);
    if (!event) return;

    if (currentStatus !== 'declined') {
      // User wants to cancel - show cancel modal
      setCancellingEvent(event);
      setShowCancelModal(true);
      return;
    }

    // User wants to re-attend
    try {
      const calendarUserId = user?.roles === 'student' ? user.email : user.account_id;

      await api.post(`/api/google/update-rsvp/`, {
        event_id: id,
        status: 'accepted',
        user_id: calendarUserId
      });

      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                attendees: (e.attendees || []).map((a) =>
                  a.email?.toLowerCase() === user.email.toLowerCase()
                    ? { ...a, responseStatus: 'accepted' }
                    : a
                ),
                extendedProperties: {
                  ...(e.extendedProperties || {}),
                  private: {
                    ...(e.extendedProperties?.private || {}),
                    cant_attend: "false",
                    cancel_reason: "",
                    cancelled_by: ""
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

  const handleCancelConfirm = async () => {
    if (!cancellingEvent || !cancelReason.trim()) {
      alert(t('events.cancelReasonRequired', 'Please provide a reason for cancellation'));
      return;
    }

    try {
      const calendarUserId = user?.roles === 'student' ? user.email : user.account_id;

      await api.post(`/api/google/update-rsvp/`, {
        event_id: cancellingEvent.id,
        status: 'cant_attend',
        user_id: calendarUserId,
        cancel_reason: cancelReason,
        send_emails: true
      });

      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === cancellingEvent.id
            ? {
                ...e,
                attendees: (e.attendees || []).map((a) =>
                  a.email?.toLowerCase() === user.email.toLowerCase()
                    ? { ...a, responseStatus: 'declined' }
                    : a
                ),
                extendedProperties: {
                  ...(e.extendedProperties || {}),
                  private: {
                    ...(e.extendedProperties?.private || {}),
                    cant_attend: "true",
                    cancel_reason: cancelReason,
                    cancelled_by: user.email
                  },
                },
              }
            : e
        )
      );

      setShowCancelModal(false);
      setCancellingEvent(null);
      setCancelReason("");
    } catch {
      alert(t('errors.couldNotUpdateRSVP'));
    }
  };

  const openDetailsModal = (event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const isEventCancelledByOther = (event) => {
    const cancelledBy = event.extendedProperties?.private?.cancelled_by;
    return cancelledBy && cancelledBy.toLowerCase() !== user.email.toLowerCase();
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

            <div className="date-filter-group">
              <label className="date-filter-label">{t('events.startDateFilter')}:</label>
              <input
                className="ev-input"
                type="date"
                placeholder={t('events.startDateFilter')}
                title={t('events.startDateFilter')}
                value={filters.start}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, start: e.target.value }))
                }
              />
            </div>
            <div className="date-filter-group">
              <label className="date-filter-label">{t('events.endDateFilter')}:</label>
              <input
                className="ev-input"
                type="date"
                placeholder={t('events.endDateFilter')}
                title={t('events.endDateFilter')}
                value={filters.end}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, end: e.target.value }))
                }
              />
            </div>
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
                    <th>{t('common.date')}</th>
                    <th>{t('events.start')}</th>
                    <th>{t('events.end')}</th>
                    <th>{t('calendar.tutor')}</th>
                    <th>{t('calendar.attendee')}</th>
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

                    // Get current user's status
                    const myStatus = getMyStatus(ev);
                    const isDeclined = myStatus === 'declined';

                    // Determine status display with colors
                    const statusDisplay = isDeclined ?
                      <span style={{color: '#dc3545', fontWeight: 'bold'}}>❌ Can't Attend</span> :
                      <span style={{color: '#28a745', fontWeight: 'bold'}}>✅ Attending</span>;

                    const cancelledByOther = isEventCancelledByOther(ev);
                    const cancelReason = ev.extendedProperties?.private?.cancel_reason || "";
                    const cancelledBy = ev.extendedProperties?.private?.cancelled_by || "";

                    // Determine if anyone has cancelled this session - if so, it's completely read-only
                    const isAnybodyCancelled = cancelledByOther || isDeclined ||
                                              ev.extendedProperties?.private?.cant_attend === "true";

                    // Set row background color - red for cancelled, green for active
                    const getRowStyle = () => {
                      const baseStyle = { cursor: 'pointer' };
                      if (isAnybodyCancelled) {
                        return { ...baseStyle, backgroundColor: '#ffebee' }; // Red for any cancellation
                      } else {
                        return { ...baseStyle, backgroundColor: '#e8f5e8' }; // Green for attending
                      }
                    };

                    return (
                      <tr key={ev.id} style={getRowStyle()}>
                        <td onClick={() => openDetailsModal(ev)}>{ev.summary || t('events.noTitle')}</td>
                        <td onClick={() => openDetailsModal(ev)}>{s.toLocaleDateString()}</td>
                        <td onClick={() => openDetailsModal(ev)}>{s.toLocaleTimeString()}</td>
                        <td onClick={() => openDetailsModal(ev)}>{e.toLocaleTimeString()}</td>
                        <td onClick={() => openDetailsModal(ev)}>{creator}</td>
                        <td onClick={() => openDetailsModal(ev)}>{attendeeName}</td>
                        <td>
                          {isAnybodyCancelled ? (
                            <span style={{
                              color: '#dc3545',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              Session Cancelled
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAttendanceStatus(ev.id, myStatus);
                              }}
                              className="cant-attend-btn"
                              style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              {t('events.cantAttendBtn')}
                            </button>
                          )}
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

      {/* Session Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('events.sessionDetails', 'Session Details')}</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="session-detail-grid">
                <div className="detail-row">
                  <strong>{t('common.title')}:</strong>
                  <span>{selectedEvent.summary || t('events.noTitle')}</span>
                </div>
                <div className="detail-row">
                  <strong>{t('common.date')}:</strong>
                  <span>{new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <strong>{t('common.time')}:</strong>
                  <span>
                    {new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date).toLocaleTimeString()}
                    {' - '}
                    {new Date(selectedEvent.end?.dateTime || selectedEvent.end?.date).toLocaleTimeString()}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>{t('calendar.tutor')}:</strong>
                  <span>{selectedEvent?.organizer?.email || 'Unknown'}</span>
                </div>
                <div className="detail-row">
                  <strong>{t('calendar.attendee')}:</strong>
                  <span>
                    {selectedEvent?.attendees?.find(att => att.email !== selectedEvent?.organizer?.email)?.email || '-'}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>{t('calendar.status')}:</strong>
                  <span>
                    {isEventCancelledByOther(selectedEvent) ? (
                      <span style={{color: '#dc3545'}}>
                        Cancelled by {selectedEvent.extendedProperties?.private?.cancelled_by}
                      </span>
                    ) : (
                      getMyStatus(selectedEvent) === 'declined' ?
                        <span style={{color: '#dc3545'}}>Can't Attend</span> :
                        <span style={{color: '#28a745'}}>Attending</span>
                    )}
                  </span>
                </div>
                {selectedEvent.extendedProperties?.private?.cancel_reason && (
                  <div className="detail-row">
                    <strong>{t('events.cancelReason', 'Cancellation Reason')}:</strong>
                    <span style={{fontStyle: 'italic', color: '#6c757d'}}>
                      {selectedEvent.extendedProperties.private.cancel_reason}
                    </span>
                  </div>
                )}
                {selectedEvent.description && (
                  <div className="detail-row">
                    <strong>{t('common.description')}:</strong>
                    <span>{selectedEvent.description}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="detail-row">
                    <strong>{t('calendar.location')}:</strong>
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && cancellingEvent && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('events.cancelSession', 'Cancel Session')}</h2>
              <button className="modal-close" onClick={() => setShowCancelModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom: '1rem'}}>
                {t('events.cancelConfirmation', 'Are you sure you want to cancel this session?')}
              </p>
              <div style={{marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                <strong>{cancellingEvent.summary || t('events.noTitle')}</strong><br/>
                {new Date(cancellingEvent.start?.dateTime || cancellingEvent.start?.date).toLocaleDateString()}
                {' at '}
                {new Date(cancellingEvent.start?.dateTime || cancellingEvent.start?.date).toLocaleTimeString()}
              </div>
              <div style={{marginBottom: '1rem'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>
                  {t('events.cancelReason', 'Reason for cancellation')} *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('events.cancelReasonPlaceholder', 'Please explain why you need to cancel...')}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>
              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                <button
                  onClick={() => setShowCancelModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleCancelConfirm}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {t('events.confirmCancel', 'Confirm Cancellation')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
