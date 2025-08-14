import React, { useEffect, useState } from "react";
import api from "../api";
import { useUser } from "./UserProvider";
import "../styles/EventBox.css";

export default function EGSEventsBox() {
  const { user } = useUser();
  const [events, setEvents] = useState([]);

  /* ── fetch on mount / when account_id changes ── */
  useEffect(() => {
    if (!user?.account_id) return;          // guard for first render

    (async () => {
      try {
        const { data } = await api.get("/api/google/egs-events", {
          params: { id: user.account_id }
        });
        setEvents(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        console.error("Failed to fetch EGS events:", err);
      }
    })();
  }, [user?.account_id]);

  return (
    <div className="egs-box">
      <h3 className="egs-box__title">📅 EGS Tutoring Sessions</h3>

      {/* scroll pane */}
      <div className="egs-box__scroll">
        {events.length === 0 ? (
          <p>No upcoming tutoring events.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="egs-box__card">
              <strong>{ev.summary || "Untitled event"}</strong>
              {ev.start?.dateTime && (
                <div>
                  Start:{" "}
                  {new Date(ev.start.dateTime).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              )}
              {ev.end?.dateTime && (
                <div>
                  End:{" "}
                  {new Date(ev.end.dateTime).toLocaleString("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              )}
              {ev.attendees?.length > 0 && (
                <div>👥 Parent: {ev.attendees[0].email}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
