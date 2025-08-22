import React, { useEffect, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from "./UserProvider";
// Using standard media URLs served by Django

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AnnouncementCarousel = memo(() => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // No longer need separate state for image src since it's served directly
  const { user } = useUser();

  /* ── fetch list ── */
  useEffect(() => {
    if (!user?.account_id) return;
    
    api.getCached('/api/announcements/', { id: user.account_id }, { ttl: 10 * 60 * 1000 })
      .then((res) => setAnnouncements(res.data))
      .catch((err) => console.error("Failed to load announcements", err));
  }, [user?.account_id]);

  // Images are now served directly from frontend public directory

  /* ── autoplay ── */
  useEffect(() => {
    if (!announcements.length) return;
    const id = setInterval(
      () => setCurrentIndex((p) => (p + 1) % announcements.length),
      5000
    );
    return () => clearInterval(id);
  }, [announcements]);

  if (!announcements.length) return null;
  const current = announcements[currentIndex];

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div
      style={{
        width: "100%",
        height: 355,
        background: "#ffffff",
        border: "3px solid #E1E1E1",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: "none",
        boxShadow: "none",
      }}
    >
      {/* top heading */}
      <div
        style={{
          background: "#192A88",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "1.4rem",
          textAlign: "center",
          padding: "0.6rem 0",
        }}
      >
        {t('announcements.whatsNew')}
      </div>

      {/* subtitle */}
      <div
        style={{
          background: "#ffffffff",
          color: "#292929",
          fontWeight: 600,
          fontSize: "0.95rem",
          textAlign: "center",
          padding: "0.45rem 0",
        }}
      >
        {current.name || t('announcements.announcement')}
      </div>

      {/* image + arrows */}
      <div style={{ position: "relative", flexGrow: 1 }}>
        <img
          key={currentIndex} // fade re‑render
          src={`${API_BASE_URL}${current.image}`}
          alt="Announcement"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.4s ease-in-out",
          }}
        />

        {/* left arrow */}
        <div
          onClick={() =>
            setCurrentIndex(
              (currentIndex - 1 + announcements.length) % announcements.length
            )
          }
          style={{...arrowStyle("left"), outline: "none", boxShadow: "none"}}
        >
          &#9664;
        </div>

        {/* right arrow */}
        <div
          onClick={() =>
            setCurrentIndex((currentIndex + 1) % announcements.length)
          }
          style={{...arrowStyle("right"), outline: "none", boxShadow: "none"}}
        >
          &#9654;
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          background: "#F6F8FC",
          color: "#292929",
          fontSize: "0.8rem",
          textAlign: "center",
          padding: "0.45rem 0.25rem",
        }}
      >
        {current.address || ""}
        <br />
        {current.start_time || ""}
      </div>
    </div>
  );
});

AnnouncementCarousel.displayName = 'AnnouncementCarousel';

export default AnnouncementCarousel;

/* helper for arrow styling */
function arrowStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    [side]: 12,
    transform: "translateY(-50%)",
    fontSize: "2rem",
    color: "#ffffff",
    textShadow: "0 0 4px rgba(0,0,0,0.6)",
    cursor: "pointer",
    opacity: 0.8,
    userSelect: "none",
  };
}
