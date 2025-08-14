import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from "../components/UserProvider";
import "../styles/EventsFilters.css";

/**
 * Small multiselect dropdown for statuses
 */
function StatusMulti({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (name) => {
    onChange(
      value.includes(name)
        ? value.filter((v) => v !== name)
        : [...value, name]
    );
  };

  return (
    <div className="msel" onBlur={(e)=> !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        className="msel__btn"
        onClick={() => setOpen((o) => !o)}
      >
        {value.length ? value.join(", ") : "All statuses"} ▾
      </button>

      {open && (
        <div className="msel__menu">
          <label className="msel__row">
            <input
              type="checkbox"
              checked={value.includes("default")}
              onChange={() => toggle("default")}
            />
            Default
          </label>
          <label className="msel__row">
            <input
              type="checkbox"
              checked={value.includes("declined")}
              onChange={() => toggle("declined")}
            />
            Declined
          </label>
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { user } = useUser();
  const { t } = useTranslation();

  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState(null);

  // filters
  const [filters, setFilters] = useState({
    q: "",
    statuses: [],          // [] => show all, otherwise ["default","declined"]
    cantAttendOnly: false,
    start: "",
    end: ""
  });

  /** fetch once */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const resp = await api.get(
          `/api/google/events/all?id=${user.account_id}`
        );
        const items = Array.isArray(resp.data?.items) ? resp.data.items : [];
        setAllEvents(items);
      } catch (e) {
        console.error(e);
        setErr("Failed to load events");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /** Helper to find my attendee status */
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

  const isDefaultStatus = (googleStatus) => googleStatus !== "declined";

  /** client filtering */
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const text = `${ev.summary || ""} ${ev.description || ""}`.toLowerCase();
      if (filters.q && !text.includes(filters.q.toLowerCase())) return false;

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
        const tag = isDefaultStatus(getMyStatus(ev)) ? "default" : "declined";
        if (!filters.statuses.includes(tag)) return false;
      }

      return true;
    });
  }, [allEvents, filters, getMyStatus]);

  /** mark can't attend */
  const markCantAttend = async (eventId) => {
    try {
      await api.post(
        `/api/google/update-rsvp/?id=${eventId}&action=decline`
      );
      // update in place
      setAllEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
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
    } catch (e) {
      console.error(e);
      alert("Could not update RSVP.");
    }
  };

  if (loading || !user) {
    return (
      <div className="ev-spinner-wrap">
        <div className="ev-spinner" />
        <p>Loading…</p>
      </div>
    );
  }
  if (err) return <p style={{ padding: "2rem" }}>{err}</p>;

  return (
    <div className="events-page">
      <h2 className="ev-title">Scheduled EGS Tutoring Events</h2>

      {/* FILTER BAR */}
      <form
        className="ev-filter-bar"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          className="ev-input"
          type="text"
          placeholder="Search title/description…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />

        <StatusMulti
          value={filters.statuses}
          onChange={(statuses) => setFilters((f) => ({ ...f, statuses }))}
        />

        <label className="inline-check">
          <input
            type="checkbox"
            checked={filters.cantAttendOnly}
            onChange={(e) =>
              setFilters((f) => ({ ...f, cantAttendOnly: e.target.checked }))
            }
          />
          Can’t attend only
        </label>

        <input
          className="ev-input"
          type="date"
          value={filters.start}
          onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
        />
        <input
          className="ev-input"
          type="date"
          value={filters.end}
          onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
        />
      </form>

      {/* TABLE */}
      <div className="table-wrapper">
        {filteredEvents.length ? (
          <table className="events-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Start</th>
                <th>End</th>
                <th>Description</th>
                <th>Can’t attend</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => {
                const s = new Date(ev.start?.dateTime || ev.start?.date);
                const e = new Date(ev.end?.dateTime || ev.end?.date);
                return (
                  <tr key={ev.id}>
                    <td>{ev.summary || "No Title"}</td>
                    <td>{s.toLocaleDateString()}</td>
                    <td>{s.toLocaleTimeString()}</td>
                    <td>{e.toLocaleTimeString()}</td>
                    <td>{ev.description || ""}</td>
                    <td>
                      <button
                        onClick={() => markCantAttend(ev.id)}
                        className="cant-btn"
                      >
                        Can’t attend
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#888" }}>
            No events match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
