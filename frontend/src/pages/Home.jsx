// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import "../styles/EventsTable.css";
import "../styles/HomeMobile.css";
import { useUser } from "../components/UserProvider";
import { Link } from "react-router-dom";
import AnnouncementCarousel from "../components/AnnouncementCarousel";
import DisputeModal from "../components/DisputeModal";
import TutorComplaintModal from "../components/TutorComplaintModal";
import TutorRegistrationForm from "../components/TutorRegistrationForm";

/* helper for invoice colours */
const getInvoiceAgeColor = (ts) => {
  if (!ts) return "#f8d7da";
  const days = (Date.now() - ts * 1000) / 8.64e7;
  return days <= 7 ? "#d4edda" : days <= 14 ? "#fff3cd" : "#f8d7da";
};

export default function Home() {
  const { user } = useUser();
  const { t } = useTranslation();

  const [hours, setHours] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [events, setEvents] = useState([]);
  
  // Tutor-specific state
  const [tutorStudents, setTutorStudents] = useState([]);
  const [tutorDocuments, setTutorDocuments] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  
  // Parent Google Calendar state
  const [parentGoogleConnected, setParentGoogleConnected] = useState(false);
  
  // Admin state
  const [showTutorForm, setShowTutorForm] = useState(false);
  
  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedHourForDispute, setSelectedHourForDispute] = useState(null);

  // Tutor complaint modal state
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [selectedTutorForComplaint, setSelectedTutorForComplaint] = useState(null);

  // Student's tutors state
  const [studentTutors, setStudentTutors] = useState([]);


  /* ───────── data fetch ───────── */
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        
        // Separate the API calls to handle errors independently
        let parentData = null;
        let eventsData = null;

        // Fetch data based on user role
        if (user.roles === 'parent') {
          // Fetch parent data
          try {
            const parentRes = await api.get('/api/homeParent/', { params: { id: user.account_id } });
            parentData = parentRes.data;
            
            // Check Google connection status for parent
            const googleStatusRes = await api.get('/api/google/status/', { params: { id: user.account_id } });
            setParentGoogleConnected(googleStatusRes.data?.connected || false);
            
          } catch (parentError) {
            console.error("Parent data fetch failed:", parentError);
          }
        } else if (user.roles === 'tutor') {
          // Fetch tutor-specific data
          try {
            // Get tutor's students
            const studentsRes = await api.get('/api/TutorStudents/', { params: { tutor: user.account_id } });
            setTutorStudents(studentsRes.data || []);
            
            // Get tutor's documents
            const documentsRes = await api.get('/api/tutor/documents/', { params: { id: user.account_id } });
            setTutorDocuments(documentsRes.data || []);
            
            // Get tutor's hours
            const hoursRes = await api.get('/api/parentHours/', { params: { id: user.account_id } });
            setHours(hoursRes.data || []);
            
            // Check Google connection status
            const googleStatusRes = await api.get('/api/google/status/', { params: { id: user.account_id } });
            setGoogleConnected(googleStatusRes.data?.connected || false);
            
          } catch (tutorError) {
            console.error("Tutor data fetch failed:", tutorError);
          }
        } else if (user.roles === 'student') {
          // Fetch student data
          try {
            // Get student's hours
            const hoursRes = await api.get('/api/parentHours/', { params: { id: user.account_id } });
            setHours(hoursRes.data || []);
            
            // Get student's tutors (from hours data)
            const uniqueTutors = [];
            const seenTutorIds = new Set();
            const tutorSubjects = {};
            
            if (hoursRes.data && Array.isArray(hoursRes.data)) {
              hoursRes.data.forEach(hour => {
                if (hour.tutor && !seenTutorIds.has(hour.tutor)) {
                  seenTutorIds.add(hour.tutor);
                  uniqueTutors.push({
                    id: hour.tutor,
                    firstName: hour.tutor_firstName || 'Unknown',
                    lastName: hour.tutor_lastName || '',
                    // We'll need to fetch additional details like email and phone
                  });
                }
                
                // Collect subjects for each tutor
                if (hour.tutor && hour.subject) {
                  if (!tutorSubjects[hour.tutor]) {
                    tutorSubjects[hour.tutor] = new Set();
                  }
                  tutorSubjects[hour.tutor].add(hour.subject);
                }
              });
            }
            
            // Fetch additional tutor details
            if (uniqueTutors.length > 0) {
              try {
                const tutorDetailsPromises = uniqueTutors.map(async (tutor) => {
                  try {
                    const response = await api.get(`/api/users/${tutor.id}/`);
                    const subjects = tutorSubjects[tutor.id] ? Array.from(tutorSubjects[tutor.id]) : [];
                    return {
                      ...tutor,
                      email: response.data.email,
                      phone_number: response.data.phone_number,
                      subjects: subjects
                    };
                  } catch (error) {
                    console.error(`Failed to fetch details for tutor ${tutor.id}:`, error);
                    const subjects = tutorSubjects[tutor.id] ? Array.from(tutorSubjects[tutor.id]) : [];
                    return {
                      ...tutor,
                      subjects: subjects
                    }; // Return basic info with subjects if detailed fetch fails
                  }
                });
                
                const detailedTutors = await Promise.all(tutorDetailsPromises);
                setStudentTutors(detailedTutors);
              } catch (error) {
                console.error("Failed to fetch tutor details:", error);
                setStudentTutors(uniqueTutors); // Use basic info
              }
            }
            
            // Check Google connection status
            const googleStatusRes = await api.get('/api/google/status/', { params: { id: user.account_id } });
            setGoogleConnected(googleStatusRes.data?.connected || false);
            
          } catch (studentError) {
            console.error("Student data fetch failed:", studentError);
          }
        }

        // Fetch events data separately
        try {
          const eventsRes = await api.get('/api/google/events', { params: { id: user.account_id } });
          eventsData = eventsRes.data;
        } catch (eventsError) {
          console.error("Events data fetch failed:", eventsError);
          setEvents([]); // Only reset events on events error
        }

        // Process parent data if available (only for parents)
        if (parentData && user.roles === 'parent') {
          const hoursData = Array.isArray(parentData.hours) ? parentData.hours : [];
          const studentsData = Array.isArray(parentData.students) ? parentData.students : [];
          const invoicesData = Array.isArray(parentData.invoices) ? parentData.invoices : [];
          
          setHours(hoursData);
          setStudents(studentsData);
          setInvoices(invoicesData);

          // Calculate totals
          let paid = 0, unpaid = 0;
          invoicesData.forEach((i) =>
            i.paid
              ? (paid += i.amount_paid / 100)
              : (unpaid += i.amount_due / 100)
          );
          setPaidTotal(paid);
          setUnpaidTotal(unpaid);
        }

        // Process events data if available
        if (eventsData) {
          setEvents(Array.isArray(eventsData.items) ? eventsData.items : []);
        } else {
        }
      } catch (e) {
        console.error("Unexpected error in fetchData:", e);
        // Don't reset any state on unexpected errors - let existing data remain
      }
    };

    fetchData();
  }, [user]);

  const paidPct =
    paidTotal + unpaidTotal ? (paidTotal / (paidTotal + unpaidTotal)) * 100 : 0;

  // Memoize processed events to avoid recalculating dates on every render
  const processedEvents = useMemo(() => {
    return events.map((ev) => {
      const startDate = new Date(ev.start?.dateTime || ev.start?.date);
      const endDate = new Date(ev.end?.dateTime || ev.end?.date);
      
      return {
        id: ev.id,
        title: ev.summary || t('events.noTitle'),
        date: startDate.toLocaleDateString(),
        startTime: startDate.toLocaleTimeString(),
        endTime: endDate.toLocaleTimeString(),
        description: ev.description || ""
      };
    });
  }, [events]);

  /* mark "can't attend" (declined) on Google Calendar */
  const markCantAttend = useCallback(async (id) => {
    try {
      await api.get(`/api/google/update-rsvp/`, {
        params: { event_id: id, status: "cant_attend", user_id: user.account_id }
      });
      // Invalidate events cache to force refresh
      api.invalidateCache('/api/google/events', { id: user.account_id });
      // Update local state immediately for better UX
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    } catch (e) {
      console.error("RSVP update failed:", e);
    }
  }, [user?.account_id]);

  /* handle document upload for tutors */
  const handleDocumentUpload = useCallback(() => {
    // Navigate to settings page or trigger file upload
    window.location.href = '/settings';
  }, []);

  /* handle Google Calendar connection */
  const handleGoogleConnect = useCallback(async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const token = localStorage.getItem('access_token');
      window.location.href = `${API_BASE_URL}/api/google/oauth/init?token=${token}`;
    } catch (error) {
      console.error("Google connect failed:", error);
      alert(t('calendar.connectFailed'));
    }
  }, []);

  /* handle parent Google Calendar connection redirect */
  const handleParentGoogleConnect = useCallback(() => {
    window.location.href = '/events';
  }, []);

  /* handle document deletion */
  const handleDocumentDelete = useCallback(async (documentId, documentName) => {
    if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      
      await api.delete(`/api/tutor/documents/${documentId}/`);
      
      // Update local state to remove the deleted document
      setTutorDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      
      alert(t('documents.deleteSuccess'));
    } catch (error) {
      console.error("Document deletion failed:", error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          t('documents.deleteFailed');
      
      alert(errorMessage);
    }
  }, []);

  /* handle dispute modal */
  const handleDisputeClick = useCallback((hour) => {
    setSelectedHourForDispute(hour);
    setDisputeModalOpen(true);
  }, []);

  const handleDisputeModalClose = useCallback(() => {
    setDisputeModalOpen(false);
    setSelectedHourForDispute(null);
  }, []);

  const handleDisputeSubmitSuccess = useCallback(() => {
    // Refresh data to show updated dispute status
    window.location.reload();
  }, []);

  const handleCancelDispute = useCallback(async (disputeId) => {
    try {
      await api.delete(`/api/disputes/${disputeId}/cancel/`);
      // Refresh data to show updated dispute status
      window.location.reload();
    } catch (error) {
      alert(t('disputes.cancelFailed'));
    }
  }, []);

  /* handle tutor complaint modal */
  const handleComplaintClick = useCallback((tutor) => {
    setSelectedTutorForComplaint(tutor);
    setComplaintModalOpen(true);
  }, []);

  const handleComplaintModalClose = useCallback(() => {
    setComplaintModalOpen(false);
    setSelectedTutorForComplaint(null);
  }, []);

  const handleComplaintSubmitSuccess = useCallback(() => {
    // Just close modal, no need to refresh
    setComplaintModalOpen(false);
    setSelectedTutorForComplaint(null);
  }, []);


  return (
    <div style={{ position: "relative", minHeight: "100vh" }} data-role={user?.roles}>
      {/* greeting overlays; positioned lower */}
      <h1
        style={{
          position: "absolute",
          top: "3.5rem",
          left: 0,
          right: 0,
          textAlign: "center",
          margin: 0,
          marginTop: "0.5rem",
          fontSize: "4rem",
          fontWeight: "bold",
          color: "#272727ff",
          textShadow: "2px 2px 8px #00000022",
          pointerEvents: "none",
        }}
        className="home-greeting"
      >
        {user?.firstName ? t('home.greeting', { name: user.firstName }) : t('home.greetingDefault')}
      </h1>
      
      {/* weekly hours message */}
      <div
        style={{
          position: "absolute",
          top: "10rem",
          left: 0,
          right: 0,
          textAlign: "center",
          margin: 0,
          fontSize: "1.5rem",
          fontWeight: "normal",
          color: "#666666",
          pointerEvents: "none",
        }}
        className="home-weekly-hours"
      >
        {(() => {
          if (user?.roles === 'tutor') {
            // For tutors: show monthly hours
            const monthlyHours = hours.reduce((total, hour) => {
              const hourDate = new Date(hour.date);
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              
              if (hourDate.getMonth() === currentMonth && hourDate.getFullYear() === currentYear) {
                return total + parseFloat(hour.totalTime || 0);
              }
              return total;
            }, 0);
            
            const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });
            const translatedText = t('home.tutorMonthlyHours', `You have worked ${monthlyHours} hours this ${monthName}`);
            const parts = translatedText.split(monthlyHours.toString());
            
            return (
              <>
                {parts[0]}
                <span style={{ color: "#192A88", fontWeight: "bold" }}>{monthlyHours}</span>
                {parts[1]}
              </>
            );
          } else {
            // For parents/students: show weekly hours
            const weeklyHours = hours.reduce((total, hour) => {
              const hourDate = new Date(hour.date);
              const now = new Date();
              const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              
              if (hourDate >= weekStart && hourDate <= weekEnd) {
                return total + parseFloat(hour.totalTime || 0);
              }
              return total;
            }, 0);
            
            // Different text for parents vs students
            const translatedText = user?.roles === 'student' 
              ? t('home.studentWorkedHours', { hours: weeklyHours })
              : t('home.childrenWorkedHours', { hours: weeklyHours });
            const parts = translatedText.split(weeklyHours.toString());
            
            return (
              <>
                {parts[0]}
                <span style={{ color: "#192A88", fontWeight: "bold" }}>{weeklyHours}</span>
                {parts[1]}
              </>
            );
          }
        })()}
      </div>

      {/* three‑column layout */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "1rem 2% 0",
          boxSizing: "border-box",
        }}
        className="home-three-column-layout"
      >
        {/* LEFT COL */}
        <div
          style={{
            width: "20%",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            marginTop: "0.5rem",
          }}
          className="home-left-column"
        >
          <div
            className="mobile-section logged-hours-section"
            style={{
              background: "#fff",
              border: "3px solid #E1E1E1",
              borderRadius: 12,
              padding: "1rem",
              height: 200,
              minHeight: 200,
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.loggedHours')}</h3>
            {hours.length ? (
              hours.map((h, index) => {
                return (
                <div 
                  key={h.id} 
                  style={{ 
                    fontSize: "0.9rem", 
                    margin: "0.8rem 0",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    backgroundColor: h.has_disputes ? "#f8d7da" : "transparent",
                    border: h.has_disputes ? "1px solid #f5c6cb" : "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <strong>{h.student_firstName && h.student_lastName ? `${h.student_firstName} ${h.student_lastName}` : h.studentName || h.student_name || h.student || t('common.unknownStudent')}</strong>
                  <br />
                  {h.totalTime} hrs — {h.subject}
                  <br />
                      {h.date}
                      {h.has_disputes && (
                        <div style={{ color: "#721c24", fontSize: "0.8rem", fontStyle: "italic", marginTop: "0.25rem" }}>
                          ⚠️ Disputed
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => h.dispute_id ? handleCancelDispute(h.dispute_id) : handleDisputeClick(h)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc3545",
                        padding: "0.25rem",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        marginLeft: "0.5rem",
                        height: "fit-content"
                      }}
                      title={h.dispute_id ? t('disputes.cancelDispute') : t('disputes.disputeSession')}
                    >
                      {h.dispute_id ? "✕" : "⚠️"}
                    </button>
                  </div>
                </div>
                );
              })
            ) : (
              <Link to="/request" style={{ color: "#192A88", textAlign: "center", display: "block" }}>
                {t('home.noHoursYet')} {t('home.requestTutorText')}
              </Link>
            )}
          </div>
          <div className="mobile-section announcements-section">
            <AnnouncementCarousel />
          </div>
        </div>

        {/* MIDDLE COL */}
        <div style={{ width: "55%", padding: "1rem 0", paddingTop: "14.05rem" }} className="home-middle-column">
          <div
            className="table-wrapper mobile-section scheduled-events-section"
            style={{
              background: "#fff",
              border: "3px solid #E1E1E1",
              borderRadius: 12,
              overflow: "auto",
              height: 355,
              minHeight: 355,
              maxHeight: 355,
            }}
          >
            <h3 style={{ textAlign: "center", margin: "1rem 0", padding: "0 1rem" }}>
              {t('home.scheduledEvents')}
            </h3>
            {events.length ? (
              <table className="events-table">
                <thead>
                  <tr>
                    <th>{t('common.title')}</th>
                    <th>{t('common.date')}</th>
                    <th>{t('events.startTime')}</th>
                    <th>{t('events.endTime')}</th>
                    <th>{t('common.description')}</th>
                    <th>{t('home.cantAttend')}</th>
                  </tr>
                </thead>
                <tbody>
                  {processedEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.title}</td>
                      <td>{ev.date}</td>
                      <td>{ev.startTime}</td>
                      <td>{ev.endTime}</td>
                      <td>{ev.description}</td>
                      <td>
                        <button
                          onClick={() => markCantAttend(ev.id)}
                          style={{
                            color: "red",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                          }}
                        >
                          {t('home.cantAttend')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                {user?.roles === 'parent' && !parentGoogleConnected ? (
                  <div>
                    <p style={{ color: "#666", marginBottom: "1rem" }}>
                      {t('home.connectCalendarMessage')}
                    </p>
                    <button
                      onClick={handleParentGoogleConnect}
                      style={{
                        backgroundColor: "#192A88",
                        color: "white",
                        border: "none",
                        padding: "0.75rem 1.5rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
{t('home.goToScheduledSessions')}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: "#888" }}>
                    {t('home.noScheduledEvents')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COL */}
        <div
          style={{
            width: "20%",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            textAlign: "center",
          }}
          className="home-right-column"
        >
          {user?.roles === 'student' ? (
            // STUDENT VIEW
            <>
              {/* My Tutor(s) Section */}
              <div
                className="mobile-section students-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  minHeight: 200,
                }}
              >
                <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.myTutors')}</h3>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {studentTutors.length > 0 ? `${studentTutors.length} tutor${studentTutors.length > 1 ? 's' : ''}` : 'No tutors yet'}
                </div>
                {studentTutors.length > 0 ? (
                  studentTutors.map((tutor, index) => (
                    <div key={tutor.id || index} style={{ margin: "1rem 0", textAlign: "left", border: "1px solid #eee", borderRadius: "8px", padding: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <strong style={{ fontSize: "1rem", color: "#192A88" }}>
                          {tutor.firstName} {tutor.lastName}
                          {tutor.subjects && tutor.subjects.length > 0 && (
                            <span style={{ fontSize: "0.8rem", color: "#666", fontWeight: "normal" }}>
                              {" - "}{tutor.subjects.join(", ")}
                            </span>
                          )}
                        </strong>
                        <button
                          onClick={() => handleComplaintClick(tutor)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ff8c00",
                            padding: "0.25rem",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            marginLeft: "0.5rem",
                            height: "fit-content"
                          }}
                          title={t('home.reportConcern')}
                        >
                          📝
                        </button>
                      </div>
                      {tutor.email && (
                        <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.25rem" }}>
                          📧 {tutor.email}
                        </div>
                      )}
                      {tutor.phone_number && (
                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                          📞 {tutor.phone_number}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "1rem" }}>
                    No tutoring sessions recorded yet.
                  </p>
                )}
              </div>
            </>
          ) : user?.roles === 'tutor' ? (
            // TUTOR VIEW
            <>
              {/* Tutor's Current Students */}
              <div
                className="mobile-section students-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  minHeight: 122,
                }}
              >
                <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.myStudents')}</h3>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {t('home.activeStudentsCount', { count: tutorStudents.length })}
                </div>
                {tutorStudents.length > 0 ? (
                  tutorStudents.map((s, index) => (
                    <div key={s.id || index} style={{ margin: "0.5rem 0", textAlign: "left" }}>
                      <strong>{s.student_firstName || s.student || s.student_username || t('home.student')} {s.student_lastName || ''}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>
                        {t('home.parent')}: {s.parent_email || 'N/A'}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#666" }}>{t('home.noStudentsAssigned')}</p>
                )}
              </div>

              {/* Tutor Documents */}
              <div
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                <h4 style={{ textAlign: "center", marginTop: 0 }}>{t('home.myDocuments')}</h4>
                {tutorDocuments.length > 0 ? (
                  <>
                    <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center", marginBottom: "0.5rem" }}>
                      {t('home.documentsUploaded', { count: tutorDocuments.length })}
                    </div>
                    {tutorDocuments.map((doc, index) => (
                      <div key={doc.id || index} style={{ margin: "0.5rem 0", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ flex: 1 }}>
                          <a 
                            href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${doc.file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#192A88", textDecoration: "none", fontSize: "0.9rem" }}
                          >
                            📄 {doc.file.split('/').pop()}
                          </a>
                          <div style={{ fontSize: "0.7rem", color: "#666" }}>
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDocumentDelete(doc.id, doc.file.split('/').pop())}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#dc3545",
                            cursor: "pointer",
                            fontSize: "1.1rem",
                            padding: "0.25rem",
                            marginLeft: "0.5rem"
                          }}
                          title={t('home.deleteDocument')}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
                      {t('home.noDocumentsUploaded')}
                    </p>
                    <button
                      onClick={handleDocumentUpload}
                      style={{
                        backgroundColor: "#192A88",
                        color: "white",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      {t('home.uploadDocuments')}
                    </button>
                  </>
                )}
              </div>

              {/* Google Calendar Status */}
              <div
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                }}
              >
                <h4 style={{ textAlign: "center", marginTop: 0 }}>{t('home.googleCalendar')}</h4>
                {googleConnected ? (
                  <div style={{ color: "#28a745", fontSize: "0.9rem" }}>
                    ✅ {t('home.connected')}
                    <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
                      {t('home.calendarConnectedMessage')}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ color: "#dc3545", fontSize: "0.9rem", marginBottom: "1rem" }}>
                      ❌ {t('home.notConnected')}
                    </div>
                    <button
                      onClick={handleGoogleConnect}
                      style={{
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      {t('home.connectGoogleCalendar')}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : user?.is_superuser ? (
            // ADMIN VIEW
            <>
              <div
                className="mobile-section admin-tools-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  minHeight: 200,
                }}
              >
                <h3 style={{ textAlign: "center", margin: 0, color: "#dc3545" }}>{t('admin.adminTools', 'Admin Tools')}</h3>
                <div style={{ marginTop: "1rem" }}>
                  <button
                    onClick={() => setShowTutorForm(true)}
                    style={{
                      width: "100%",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.createTutor', 'Create New Tutor')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/admin-disputes'}
                    style={{
                      width: "100%",
                      backgroundColor: "#ffc107",
                      color: "#212529",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageDisputes', 'Manage Disputes')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/admin-complaints'}
                    style={{
                      width: "100%",
                      backgroundColor: "#17a2b8",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem"
                    }}
                  >
                    {t('admin.manageComplaints', 'Manage Complaints')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // PARENT VIEW (original content)
            <>
              <div
                className="mobile-section students-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  minHeight: 122,
                  height: 200,
                }}
              >
                <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.students')}</h3>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {t('home.activeStudentsCount', { count: students.length })}
                </div>
                {students.length > 0 ? (
                  students.map((s, index) => {
                    const tutorName = s.has_tutor 
                      ? `${s.tutor_firstName || ''} ${s.tutor_lastName || ''}`.trim()
                      : t('common.noTutor');
                    return (
                    <div key={s.id || index} style={{ margin: "0.5rem 0", textAlign: "center" }}>
                      <strong>{s.student_firstName || t('common.unknown')} {s.student_lastName || ''}</strong> - {tutorName}
                    </div>
                    );
                  })
                ) : (
                  <Link to="/register" style={{ color: "#192A88", textAlign: "center", display: "block" }}>
                    {t('home.noStudentsYet')} {t('home.registerStudentText')}
                  </Link>
                )}
                {students.length > 0 && (
                  <div style={{ textAlign: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e1e1e1" }}>
                    <Link 
                      to="/students" 
                      style={{ 
                        color: "#192A88", 
                        textDecoration: "none", 
                        fontSize: "0.9rem",
                        fontWeight: "500"
                      }}
                    >
                      {t('home.viewMore')}
                    </Link>
                  </div>
                )}
              </div>

              <div className="mobile-section payment-progress-section">
                <h4
                  style={{
                    textAlign: "center",
                    marginTop: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  {t('home.paymentProgress')}
                </h4>
                <div
                  style={{
                    background: "#f8d7da",
                    width: "100%",
                    height: 20,
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${paidPct}%`,
                      height: "100%",
                      background: "#28a745",
                      transition: "width 0.5s",
                    }}
                  />
                </div>
                <p style={{ fontSize: "0.9rem", textAlign: "center" }}>
                  {t('home.paidPercentage', { percent: paidPct.toFixed(1) })}
                </p>
              </div>

              <div
                className="mobile-section paid-invoices-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  maxHeight: 125,
                  overflowY: "auto",
                  marginTop: "-1.15rem",
                }}
              >
                <h4 style={{ textAlign: "center", marginTop: 0 }}>{t('home.paidInvoices')}</h4>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {t('home.invoicesSummary', { total: invoices.length, paid: invoices.filter((i) => i.paid).length })}
                </div>
                {invoices.filter((i) => i.paid).length > 0 ? (
                  invoices
                    .filter((i) => i.paid)
                    .map((i) => (
                      <a
                        key={i.id}
                        href={i.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            backgroundColor: getInvoiceAgeColor(i.created),
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                            borderRadius: 5,
                            fontSize: "0.9rem",
                          }}
                        >
                          <strong>${(i.amount_paid / 100).toFixed(2)}</strong> —{" "}
                          {new Date(i.created * 1000).toLocaleDateString()}
                        </div>
                      </a>
                    ))
                ) : (
                  <p>{t('home.noPaidInvoices')}</p>
                )}
              </div>

              <div
                className="mobile-section unpaid-invoices-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "0.5rem",
                  maxHeight: 125,
                  overflowY: "auto",
                  marginTop: "-0.5rem",
                }}
              >
                <h4 style={{ textAlign: "center", marginTop: 0 }}>
                  {t('home.unpaidInvoices')}
                </h4>
                {invoices.filter((i) => !i.paid).length ? (
                  invoices
                    .filter((i) => !i.paid)
                    .map((i) => (
                      <a
                        key={i.id}
                        href={i.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          style={{
                            backgroundColor: getInvoiceAgeColor(i.created),
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                            borderRadius: 5,
                            fontSize: "0.9rem",
                          }}
                        >
                          <strong>${(i.amount_due / 100).toFixed(2)}</strong> — Due{" "}
                          {i.due_date
                            ? new Date(i.due_date * 1000).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </a>
                    ))
                ) : (
                  <p>{t('home.allCaughtUp')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      <DisputeModal
        isOpen={disputeModalOpen}
        onClose={handleDisputeModalClose}
        hourData={selectedHourForDispute}
        onSubmitSuccess={handleDisputeSubmitSuccess}
      />

      {/* Tutor Complaint Modal */}
      <TutorComplaintModal
        isOpen={complaintModalOpen}
        onClose={handleComplaintModalClose}
        tutorData={selectedTutorForComplaint}
        onSubmitSuccess={handleComplaintSubmitSuccess}
      />

      {/* Admin Tutor Registration Modal */}
      {showTutorForm && (
        <div className="modal-backdrop" onClick={() => setShowTutorForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px", width: "90%" }}>
            <h2 style={{ marginTop: 0, textAlign: "center" }}>{t('admin.createNewTutor', 'Create New Tutor')}</h2>
            <TutorRegistrationForm onClose={() => setShowTutorForm(false)} />
          </div>
        </div>
      )}

    </div>
  );
}
