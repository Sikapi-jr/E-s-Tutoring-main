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
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
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

  const handleAnnouncementClick = () => {
    setSelectedAnnouncement(current);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
  };

  /* ───────────────────────── render ───────────────────────── */
  return (
    <>
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
        cursor: "pointer",
      }}
      onClick={handleAnnouncementClick}
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
        {current.image ? (
          <img
            key={currentIndex} // fade re‑render
            src={`/uploads/announcements/${current.image.split('/').pop()}`}
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
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "1rem",
            }}
          >
            No Image Available
          </div>
        )}

        {/* left arrow */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(
              (currentIndex - 1 + announcements.length) % announcements.length
            );
          }}
          style={{...arrowStyle("left"), outline: "none", boxShadow: "none"}}
        >
          &#9664;
        </div>

        {/* right arrow */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex((currentIndex + 1) % announcements.length);
          }}
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

    {/* Announcement Modal */}
    {showModal && selectedAnnouncement && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
        onClick={closeModal}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: "2rem",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative",
            minWidth: "400px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>

          {/* Modal content */}
          <div style={{ marginTop: "1rem" }}>
            {selectedAnnouncement.name && (
              <h2 style={{ color: "#192A88", marginBottom: "1rem" }}>
                {selectedAnnouncement.name}
              </h2>
            )}

            {selectedAnnouncement.image && (
              <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                <img
                  src={`/uploads/announcements/${selectedAnnouncement.image.split('/').pop()}`}
                  alt="Announcement"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "400px",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              </div>
            )}

            {selectedAnnouncement.description && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>Description:</h4>
                <p style={{ color: "#666", lineHeight: 1.5 }}>
                  {selectedAnnouncement.description}
                </p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              {selectedAnnouncement.start_time && (
                <div>
                  <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>Start Time:</h4>
                  <p style={{ color: "#666" }}>
                    {new Date(selectedAnnouncement.start_time).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedAnnouncement.end_time && (
                <div>
                  <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>End Time:</h4>
                  <p style={{ color: "#666" }}>
                    {new Date(selectedAnnouncement.end_time).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {selectedAnnouncement.address && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>Location:</h4>
                <p style={{ color: "#666" }}>{selectedAnnouncement.address}</p>
              </div>
            )}

            {selectedAnnouncement.link && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>Link:</h4>
                <a
                  href={selectedAnnouncement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#192A88", textDecoration: "underline" }}
                >
                  {selectedAnnouncement.link}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
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
