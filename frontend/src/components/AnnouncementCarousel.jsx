import React, { useEffect, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from "./UserProvider";
import { getMediaUrl } from "../utils/mediaUtils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AnnouncementCarousel = memo(() => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  const { user } = useUser();

  /* ── fetch list ── */
  useEffect(() => {
    if (!user?.account_id) return;
    
    api.getCached('/api/announcements/', { id: user.account_id }, { ttl: 10 * 60 * 1000 })
      .then((res) => setAnnouncements(res.data))
      .catch((err) => console.error("Failed to load announcements", err));
  }, [user?.account_id]);

  /* ── load current image ── */
  useEffect(() => {
    const loadCurrentImage = async () => {
      if (announcements.length > 0 && announcements[currentIndex]?.image) {
        try {
          const imageUrl = await getMediaUrl(announcements[currentIndex].image);
          setCurrentImageSrc(imageUrl);
        } catch (error) {
          console.error('Failed to load announcement image:', error);
        }
      }
    };
    loadCurrentImage();
  }, [announcements, currentIndex]);

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
        height: 400,
        background: "#ffffff",
        border: "3px solid #E1E1E1",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* top heading */}
      <div
        style={{
          background: "#1A74E8 ",
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
        {currentImageSrc ? (
          <img
            key={currentIndex} // fade re‑render
            src={currentImageSrc}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              color: "#666",
            }}
          >
            Loading image...
          </div>
        )}

        {/* left arrow */}
        <div
          onClick={() =>
            setCurrentIndex(
              (currentIndex - 1 + announcements.length) % announcements.length
            )
          }
          style={arrowStyle("left")}
        >
          &#9664;
        </div>

        {/* right arrow */}
        <div
          onClick={() =>
            setCurrentIndex((currentIndex + 1) % announcements.length)
          }
          style={arrowStyle("right")}
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
