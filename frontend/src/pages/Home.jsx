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
import AdminNotificationTool from "../components/AdminNotificationTool";
import ResendVerificationTool from "../components/ResendVerificationTool";
import TutorDocumentUpload from "../components/TutorDocumentUpload";
import { refreshUserDataIfNeeded } from "../utils/refreshUserData";
import HomeTour from "../components/HomeTour";
import HomePopup from "../components/HomePopup";

/* helper for invoice colours */
const getInvoiceAgeColor = (ts) => {
  if (!ts) return "#f8d7da";
  const days = (Date.now() - ts * 1000) / 8.64e7;
  return days <= 7 ? "#d4edda" : days <= 14 ? "#fff3cd" : "#f8d7da";
};

export default function Home() {
  const { user, setUser } = useUser();
  const { t } = useTranslation();

  const [hours, setHours] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paidTotal, setPaidTotal] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);

  // Tutor-specific state
  const [tutorStudents, setTutorStudents] = useState([]);
  const [tutorDocuments, setTutorDocuments] = useState([]);
  const [recentParentRequests, setRecentParentRequests] = useState([]);
  const [paymentTransfers, setPaymentTransfers] = useState([]);

  // Admin state
  const [showTutorForm, setShowTutorForm] = useState(false);
  const [showNotificationTool, setShowNotificationTool] = useState(false);
  const [showResendVerificationTool, setShowResendVerificationTool] = useState(false);
  const [sendingHoursReminder, setSendingHoursReminder] = useState(false);

  // Document upload modal state
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  
  // Notifications state
  const [notifications, setNotifications] = useState([]);
  
  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedHourForDispute, setSelectedHourForDispute] = useState(null);

  // Tutor complaint modal state
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [selectedTutorForComplaint, setSelectedTutorForComplaint] = useState(null);

  // Student's tutors state
  const [studentTutors, setStudentTutors] = useState([]);

  // Tour state
  const [showTourManually, setShowTourManually] = useState(false);


  /* ───────── data fetch ───────── */
  useEffect(() => {
    if (!user) return;

    // Refresh user data if needed (e.g., missing tutor_referral_code)
    refreshUserDataIfNeeded(user, setUser);

    const fetchData = async () => {
      try {
        
        // Separate the API calls to handle errors independently
        let parentData = null;
        let studentHoursData = [];

        // Fetch data based on user role
        if (user.roles === 'parent') {
          // Fetch parent data
          try {
            const parentRes = await api.get('/api/homeParent/', { params: { id: user.account_id } });
            parentData = parentRes.data;
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

            // Get recent parent requests for tutors
            try {
              const requestsRes = await api.get('/api/requests/list/');
              const allRequests = requestsRes.data || [];
              // Show most recent 5 requests
              const recentRequests = allRequests.slice(0, 5);
              setRecentParentRequests(recentRequests);
            } catch (requestsError) {
              console.error("Recent requests fetch failed:", requestsError);
              setRecentParentRequests([]);
            }

          } catch (tutorError) {
            console.error("Tutor data fetch failed:", tutorError);
          }
        } else if (user.roles === 'student') {
          // Fetch student data
          try {
            // Get student's hours
            const hoursRes = await api.get('/api/parentHours/', { params: { id: user.account_id } });
            studentHoursData = hoursRes.data || [];
            setHours(studentHoursData);
            
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

          } catch (studentError) {
            console.error("Student data fetch failed:", studentError);
          }
        } else if (user.is_superuser) {
          // Fetch admin data - ALL hours for superuser
          try {
            // Get all hours for admin view
            const allHoursRes = await api.get('/api/allHours/'); // Assuming this endpoint exists
            setHours(allHoursRes.data || []);

          } catch (adminError) {
            console.error("Admin data fetch failed:", adminError);
          }
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
          // Stripe invoice objects expose `status` ('paid', 'open', etc.), not a `paid` boolean
          let paid = 0, unpaid = 0;
          invoicesData.forEach((i) =>
            i.status === 'paid'
              ? (paid += i.amount_paid / 100)
              : (unpaid += i.amount_due / 100)
          );
          setPaidTotal(paid);
          setUnpaidTotal(unpaid);
        }


        // Fetch data for second row components (for all users)
        try {
          // Get recent parent requests based on user role
          if (user.roles === 'parent') {
            // For parents, get their own tutoring requests
            const requestsRes = await api.get('/api/parentRequests/', { params: { parent: user.account_id } });
            setRecentParentRequests(requestsRes.data.slice(0, 5) || []);
          } else if (user.roles === 'tutor') {
            // For tutors, recent requests are already fetched in the tutor section above
            // Don't override the data here
          } else {
            setRecentParentRequests([]);
          }
        } catch (error) {
          console.error('Error fetching recent requests:', error);
          setRecentParentRequests([]);
        }
        
        try {
          // Get payment transfers/payouts based on user role
          if (user.roles === 'tutor') {
            // TODO: Replace with actual payout API when available
            setPaymentTransfers([]);
          } else if (user.roles === 'parent') {
            // For parents, show recent invoice payments
            if (parentData && parentData.invoices) {
              const recentPayments = parentData.invoices
                .filter(invoice => invoice.status === 'paid')
                .slice(0, 5)
                .map(invoice => ({
                  id: invoice.id,
                  amount: invoice.amount_paid,
                  status: 'completed',
                  description: 'Invoice payment',
                  created_at: invoice.created
                }));
              setPaymentTransfers(recentPayments);
            } else {
              setPaymentTransfers([]);
            }
          } else {
            setPaymentTransfers([]);
          }
        } catch (error) {
          console.error('Error fetching payment transfers:', error);
          setPaymentTransfers([]);
        }

        // Fetch notifications
        try {
          // Fetch user-specific notifications
          const notificationsRes = await api.get('/api/notifications/', { params: { user_id: user.account_id } });
          const userNotifications = notificationsRes.data || [];
          
          // Fetch system notifications that match user role
          let systemNotifications = [];
          try {
            const systemNotificationsRes = await api.get('/api/admin/system-notifications/active/', { 
              params: { user_role: user.roles } 
            });
            systemNotifications = systemNotificationsRes.data || [];
          } catch (systemError) {
            console.error('Error fetching system notifications:', systemError);
          }
          
          // Generate some realistic notifications based on user data and role
          const generatedNotifications = [];
          
          if (user.roles === 'parent') {
            const hoursData = Array.isArray(parentData?.hours) ? parentData.hours : [];
            const invoicesData = Array.isArray(parentData?.invoices) ? parentData.invoices : [];

            // Check for recent sessions
            if (hoursData.length > 0) {
              const recentSession = hoursData[0];
              generatedNotifications.push({
                id: `session-${recentSession.id}`,
                type: 'session_logged',
                title: 'Session Logged',
                message: `Tutoring session for ${recentSession.student_firstName || 'your child'} has been logged`,
                created_at: recentSession.created_at || new Date().toISOString(),
                read: false,
                icon: '📚'
              });
            }

            // Check for unpaid invoices
            if (invoicesData.some(i => i.status !== 'paid')) {
              const unpaidCount = invoicesData.filter(i => i.status !== 'paid').length;
              generatedNotifications.push({
                id: 'unpaid-invoices',
                type: 'payment_due',
                title: 'Payment Due',
                message: `You have ${unpaidCount} unpaid invoice${unpaidCount > 1 ? 's' : ''}`,
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                read: false,
                icon: '💳'
              });
            }

            // Check for recent payments
            if (invoicesData.some(i => i.status === 'paid')) {
              const recentPayment = invoicesData.find(i => i.status === 'paid');
              if (recentPayment) {
                generatedNotifications.push({
                  id: `payment-${recentPayment.id}`,
                  type: 'payment_success',
                  title: 'Payment Processed',
                  message: `Payment of $${(recentPayment.amount_paid / 100).toFixed(2)} processed successfully`,
                  created_at: new Date(recentPayment.created * 1000).toISOString(),
                  read: true,
                  icon: '✅'
                });
              }
            }
          } else if (user.roles === 'tutor') {
            // Check for recent parent requests
            if (recentParentRequests && recentParentRequests.length > 0) {
              const pendingRequests = recentParentRequests.filter(req => req.is_accepted === 'Pending' || !req.is_accepted);
              if (pendingRequests.length > 0) {
                generatedNotifications.push({
                  id: 'pending-requests',
                  type: 'pending_request',
                  title: 'Pending Parent Requests',
                  message: `${pendingRequests.length} parent request${pendingRequests.length > 1 ? 's' : ''} waiting for your response`,
                  created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
                  read: false,
                  icon: '👨‍👩‍👧‍👦'
                });
              }

              // Check for recently accepted requests
              const acceptedRequests = recentParentRequests.filter(req => req.is_accepted === 'Accepted');
              if (acceptedRequests.length > 0) {
                const latestAccepted = acceptedRequests[0];
                generatedNotifications.push({
                  id: `accepted-${latestAccepted.id}`,
                  type: 'request_accepted',
                  title: 'Request Accepted',
                  message: `Your acceptance of a ${latestAccepted.subject || 'tutoring'} request has been confirmed`,
                  created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                  read: true,
                  icon: '✅'
                });
              }
            }

            // Check for new students
            if (tutorStudents && tutorStudents.length > 0) {
              const recentStudent = tutorStudents[0];
              generatedNotifications.push({
                id: `student-${recentStudent.id}`,
                type: 'new_student',
                title: 'New Student Assignment',
                message: `New student ${recentStudent.student_firstName || 'assigned'} ${recentStudent.student_lastName || ''}`,
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                read: true,
                icon: '👨‍🎓'
              });
            }

            // Check for recent hours logged
            if (hours && hours.length > 0) {
              const recentHour = hours[0];
              generatedNotifications.push({
                id: `hour-${recentHour.id}`,
                type: 'session_complete',
                title: 'Session Logged',
                message: `Session with ${recentHour.student_firstName || 'student'} logged successfully`,
                created_at: recentHour.created_at || new Date().toISOString(),
                read: true,
                icon: '✅'
              });
            }

            // Check for payment transfers
            if (paymentTransfers && paymentTransfers.length > 0) {
              const recentTransfer = paymentTransfers[0];
              if (recentTransfer.status === 'completed') {
                generatedNotifications.push({
                  id: `payment-${recentTransfer.id}`,
                  type: 'payment_received',
                  title: 'Payment Received',
                  message: `Payment of $${((recentTransfer.amount || 0) / 100).toFixed(2)} has been transferred to your account`,
                  created_at: new Date(recentTransfer.created_at || Date.now()).toISOString(),
                  read: false,
                  icon: '💰'
                });
              }
            }

          } else if (user.roles === 'student') {
            // Check for completed sessions
            if (studentHoursData && studentHoursData.length > 0) {
              const recentSession = studentHoursData[0];
              generatedNotifications.push({
                id: `session-complete-${recentSession.id}`,
                type: 'session_complete',
                title: 'Session Complete',
                message: `Your tutoring session has been completed and logged`,
                created_at: recentSession.created_at || new Date().toISOString(),
                read: false,
                icon: '✅'
              });
            }
            
            // Add a resources notification
            generatedNotifications.push({
              id: 'new-resources',
              type: 'resources',
              title: 'Study Materials',
              message: 'New practice problems available in your dashboard',
              created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
              read: true,
              icon: '📚'
            });
          }
          
          // Add a system notification for all users
          generatedNotifications.push({
            id: 'system-update',
            type: 'system',
            title: 'System Update',
            message: 'Platform maintenance scheduled for next weekend',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
            read: false,
            icon: '🔔'
          });
          
          // Combine all notifications: API user notifications, system notifications, and generated ones
          const allNotifications = [
            ...userNotifications, 
            ...systemNotifications,
            ...generatedNotifications
          ]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5); // Show only latest 5 notifications
            
          setNotifications(allNotifications);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          // Fallback to basic notifications
          const fallbackNotifications = [
            {
              id: 'welcome',
              type: 'system',
              title: 'Welcome!',
              message: 'Welcome to the EGS Tutoring Portal',
              created_at: new Date().toISOString(),
              read: false,
              icon: '👋'
            }
          ];
          setNotifications(fallbackNotifications);
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

  // Requests for the home page's "Current Requests" widget: requests that
  // have NOT been fulfilled (no accepted tutor yet) listed first, then
  // requests that have been filled - each group keeping its original
  // (most-recent-first) order from the API.
  const sortedHomeRequests = useMemo(() => {
    return [...recentParentRequests].sort((a, b) => {
      const aFulfilled = a.is_accepted === 'Accepted' ? 1 : 0;
      const bFulfilled = b.is_accepted === 'Accepted' ? 1 : 0;
      return aFulfilled - bFulfilled;
    });
  }, [recentParentRequests]);

  /* handle document upload for tutors */
  const handleDocumentUpload = useCallback(() => {
    // Open the document upload modal
    setShowDocumentUploadModal(true);
  }, []);

  /* handle document upload success */
  const handleDocumentUploadSuccess = useCallback((newDoc) => {
    // Add the new document to the list and close modal
    setTutorDocuments(prev => [...prev, newDoc]);
    setShowDocumentUploadModal(false);
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

  const handleSendHoursReminder = useCallback(async () => {
    if (!user?.is_superuser) return;

    setSendingHoursReminder(true);
    try {
      await api.post('/api/admin/send-hours-reminder/', {});
      alert(t('admin.hoursReminderSent'));
    } catch (error) {
      console.error('Error sending hours reminder:', error);
      alert(t('admin.hoursReminderFailed'));
    } finally {
      setSendingHoursReminder(false);
    }
  }, [user?.is_superuser]);

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

  /* handle notification click/read */
  const handleNotificationClick = useCallback(async (notificationId) => {
    try {
      // Mark as read in backend (if API exists)
      // await api.post(`/api/notifications/${notificationId}/mark-read/`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);


  return (
    <div style={{ position: "relative", minHeight: "100vh" }} data-role={user?.roles}>
      {/* Home Popup - shows once per user */}
      <HomePopup />

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

            const translatedText = t('home.tutorMonthlyHours', { hours: monthlyHours, month: t('home.thisMonth') });
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

      {/* Tutor Referral Code - Below Hours Message */}
      {user?.roles === 'tutor' && user?.tutor_referral_code && (
        <div
          style={{
            position: "absolute",
            top: "12rem",
            left: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "auto",
            zIndex: 1,
          }}
          className="home-tutor-code"
        >
          <div style={{
            backgroundColor: "#f0f4ff",
            border: "2px solid #192A88",
            borderRadius: "12px",
            padding: "0.5rem 1.5rem",
            boxShadow: "0 2px 8px rgba(25, 42, 136, 0.15)",
            display: "inline-block"
          }}>
            <div style={{
              fontSize: "0.8rem",
              color: "#666",
              marginBottom: "0.15rem",
              textAlign: "center"
            }}>
              {t('settings.yourTutorCode')}
            </div>
            <div style={{
              fontSize: "1.4rem",
              fontWeight: "700",
              letterSpacing: "3px",
              color: "#192A88",
              fontFamily: "monospace",
              textAlign: "center"
            }}>
              {user.tutor_referral_code}
            </div>
          </div>
        </div>
      )}

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
            className="mobile-section current-requests-section"
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
            <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.currentRequests', 'Current Requests')}</h3>
            <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
              {sortedHomeRequests.length} total
            </div>
            {sortedHomeRequests.length ? (
              sortedHomeRequests.map((req, index) => {
                const fulfilled = req.is_accepted === 'Accepted';
                return (
                  <div
                    key={req.id || index}
                    style={{
                      fontSize: "0.85rem",
                      margin: "8px 0",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      backgroundColor: fulfilled ? "#d4edda" : "#fff3cd",
                      border: fulfilled ? "1px solid #c3e6cb" : "1px solid #ffeaa7",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <strong>
                        {req.subject || t('common.unknown')}
                        {req.student_firstName ? ` — ${req.student_firstName}` : ''}
                      </strong>
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          color: fulfilled ? "#155724" : "#856404",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fulfilled ? t('home.requestFulfilled', 'FILLED') : t('home.requestNotFulfilled', 'OPEN')}
                      </span>
                    </div>
                    <div style={{ color: "#555" }}>
                      {req.city || ''}{req.city && req.grade ? ' · ' : ''}{req.grade ? `${t('requests.grade', 'Grade')} ${req.grade}` : ''}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>
                      {new Date(req.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            ) : (
              <Link
                to="/request-reply"
                style={{ color: "#192A88", textAlign: "center", display: "block" }}
              >
                {user?.roles === 'parent' ? t('home.noTutoringRequests') : t('home.noRecentRequests')}
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
            className="table-wrapper mobile-section home-hours-section"
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1rem 0", padding: "0 1rem" }}>
              <h3 style={{ margin: 0 }}>
                {t('home.loggedHours')}
              </h3>
              <a
                href="/hours"
                style={{
                  color: "#192A88",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "500"
                }}
                onMouseOver={(e) => e.target.style.textDecoration = "underline"}
                onMouseOut={(e) => e.target.style.textDecoration = "none"}
              >
                {t('home.viewMore')}
              </a>
            </div>
            {hours.length ? (
              <table className="home-hours-table">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('dashboard.student')}</th>
                    {user?.roles !== 'tutor' && <th>{t('dashboard.tutor')}</th>}
                    <th>{t('logHours.subject')}</th>
                    <th>{t('events.startTime')}</th>
                    <th>{t('events.endTime')}</th>
                    <th>{t('loggedHours.totalHours')}</th>
                    <th>{t('requests.location')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.date).toLocaleDateString()}</td>
                      <td>
                        {h.student_firstName && h.student_lastName
                          ? `${h.student_firstName} ${h.student_lastName}`
                          : h.studentName || h.student_name || h.student || t('common.unknownStudent')}
                      </td>
                      {user?.roles !== 'tutor' && (
                        <td>
                          {h.tutor_firstName && h.tutor_lastName
                            ? `${h.tutor_firstName} ${h.tutor_lastName}`
                            : h.tutor || h.tutor_name || "-"}
                        </td>
                      )}
                      <td>{h.subject || "-"}</td>
                      <td>{h.startTime || h.start_time || "-"}</td>
                      <td>{h.endTime || h.end_time || "-"}</td>
                      <td>{h.totalTime || h.total_hours || "-"}</td>
                      <td>{h.location || "-"}</td>
                      <td data-status={h.status?.toLowerCase() || "pending"}>
                        {h.status === "Accepted" && t("loggedHours.statusAccepted")}
                        {h.status === "Disputed" && t("loggedHours.statusDisputed")}
                        {h.status === "Resolved" && t("loggedHours.statusResolved")}
                        {h.status === "Void" && t("loggedHours.statusVoid")}
                        {!["Accepted", "Disputed", "Resolved", "Void"].includes(h.status) && (h.status || t("common.unknown"))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Link
                  to={user?.roles === 'tutor' ? '/hours' : '/request-reply'}
                  style={{ color: "#192A88" }}
                >
                  {t('home.noHoursYet')} {user?.roles === 'tutor' ? t('home.startLoggingHours') : t('home.requestTutorText')}
                </Link>
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
              {/* Tutor's Current Students - aligned with the logged hours table */}
              <div
                className="mobile-section students-section"
                style={{
                  background: "#fff",
                  border: "3px solid #E1E1E1",
                  borderRadius: 12,
                  padding: "1rem",
                  height: 122,
                  minHeight: 122,
                  maxHeight: 122,
                  overflowY: "auto",
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
                        {t('home.parent')}: {s.parent_firstName || ''} {s.parent_lastName || ''}
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
                  height: 200,
                  maxHeight: 200,
                  minHeight: 200,
                  overflowY: "auto",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <h4 style={{ textAlign: "center", marginTop: 0, marginBottom: 0, flex: 1 }}>{t('home.myDocuments')}</h4>
                  {tutorDocuments.length > 0 && (
                    <button
                      onClick={handleDocumentUpload}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#192A88",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        padding: "0",
                        textDecoration: "underline",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Upload document?
                    </button>
                  )}
                </div>
                {tutorDocuments.length > 0 ? (
                  <>
                    <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center", marginBottom: "0.5rem" }}>
                      {t('home.documentsUploaded', { count: tutorDocuments.length })}
                    </div>
                    {tutorDocuments.map((doc, index) => (
                      <div
                        key={doc.id || index}
                        style={{
                          backgroundColor: "#e3f2fd", // Light blue background
                          border: "1px solid #90caf9",
                          borderRadius: "8px",
                          padding: "12px 16px", // Increased padding
                          margin: "8px 0",
                          fontSize: "0.85rem",
                          minWidth: "200px", // Added minimum width
                          width: "100%", // Full width of container
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <a 
                              href={`${import.meta.env.VITE_API_URL || ""}${doc.file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#192A88", textDecoration: "none", fontWeight: "bold" }}
                            >
                              📄 {doc.file.split('/').pop()}
                            </a>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              onClick={() => handleDocumentDelete(doc.id, doc.file.split('/').pop())}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#dc3545",
                                cursor: "pointer",
                                fontSize: "1.1rem",
                                padding: "0.25rem",
                              }}
                              title={t('home.deleteDocument')}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
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
                    onClick={() => setShowNotificationTool(true)}
                    style={{
                      width: "100%",
                      backgroundColor: "#192A88",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageNotifications', 'Manage Notifications')}
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
                    onClick={() => window.location.href = '/admin-schools'}
                    style={{
                      width: "100%",
                      backgroundColor: "#20c997",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageSchools', 'Manage Schools')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/admin-school-credits'}
                    style={{
                      width: "100%",
                      backgroundColor: "#6610f2",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageSchoolCredits', 'School Credit Requests')}
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
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageComplaints', 'Manage Complaints')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/admin-stale-requests'}
                    style={{
                      width: "100%",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.manageStaleRequests', 'Manage Stale Requests')}
                  </button>
                  <button
                    onClick={() => setShowResendVerificationTool(true)}
                    style={{
                      width: "100%",
                      backgroundColor: "#6f42c1",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('admin.resendVerificationEmail', 'Resend Verification Email')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/create-popup'}
                    style={{
                      width: "100%",
                      backgroundColor: "#e83e8c",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginBottom: "0.5rem"
                    }}
                  >
                    {t('popups.createPopup', 'Create Popup')}
                  </button>
                  <button
                    onClick={handleSendHoursReminder}
                    disabled={sendingHoursReminder}
                    style={{
                      width: "100%",
                      backgroundColor: "#fd7e14",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      cursor: sendingHoursReminder ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      opacity: sendingHoursReminder ? 0.7 : 1
                    }}
                  >
                    {sendingHoursReminder ? "Sending..." : "Send Hours Reminder to Tutors"}
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
                  maxHeight: 200,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h3 style={{ textAlign: "center", margin: 0 }}>{t('home.students')}</h3>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {t('home.activeStudentsCount', { count: students.length })}
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {students.length > 0 ? (
                    students.map((s, index) => {
                      const tutorName = s.has_tutor
                        ? `T: ${s.tutor_firstName || ''} ${s.tutor_lastName || ''}`.trim()
                        : t('common.noTutor');
                      return (
                      <div key={s.id || index} style={{ margin: "0.5rem 0", textAlign: "center" }}>
                        <strong>{s.student_firstName || t('common.unknown')} {s.student_lastName || ''}</strong> - {tutorName}
                      </div>
                      );
                    })
                  ) : (
                    <Link to="/students" style={{ color: "#192A88", textAlign: "center", display: "block" }}>
                      {t('home.noStudentsYet')} {t('home.registerStudentText')}
                    </Link>
                  )}
                </div>
                {students.length > 0 && (
                  <div style={{ textAlign: "center", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e1e1e1", flexShrink: 0 }}>
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

              {students.some((s) => Number(s.credit_balance) > 0) && (
                <div
                  className="mobile-section credit-balance-section"
                  style={{
                    background: "#fff",
                    border: "3px solid #E1E1E1",
                    borderRadius: 12,
                    padding: "1rem",
                  }}
                >
                  <h4 style={{ textAlign: "center", margin: "0 0 0.75rem 0" }}>
                    {t('home.creditBalance', 'Credits Remaining')}
                  </h4>
                  {students
                    .filter((s) => Number(s.credit_balance) > 0)
                    .map((s) => (
                      <div key={s.id} style={{ textAlign: "center", margin: "0.35rem 0" }}>
                        <strong>{s.student_firstName} {s.student_lastName}</strong>
                        {": "}
                        <span style={{ color: "#28a745", fontWeight: 600 }}>
                          {t('home.creditHoursValue', '{{count}} hrs', { count: Number(s.credit_balance) })}
                        </span>
                      </div>
                    ))}
                </div>
              )}

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
                  {t('home.invoicesSummary', { total: invoices.length, paid: invoices.filter((i) => i.status === 'paid').length })}
                </div>
                {invoices.filter((i) => i.status === 'paid').length > 0 ? (
                  invoices
                    .filter((i) => i.status === 'paid')
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
                            backgroundColor: "#d4edda",
                            border: "2px solid #28a745",
                            color: "#155724",
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
                  padding: "1rem",
                  maxHeight: 125,
                  minHeight: 125,
                  overflowY: "auto",
                  marginTop: "-0.5rem",
                }}
              >
                <h4 style={{ textAlign: "center", marginTop: 0 }}>
                  {t('home.unpaidInvoices')}
                </h4>
                <div style={{ fontSize: "0.8rem", color: "#888", textAlign: "center" }}>
                  {invoices.filter((i) => i.status !== 'paid').length} total
                </div>
                {invoices.filter((i) => i.status !== 'paid').length ? (
                  invoices
                    .filter((i) => i.status !== 'paid')
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
                            backgroundColor: "#f8d7da",
                            border: "2px solid #dc3545",
                            color: "#721c24",
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

      {/* Second Row - For Tutors Only */}
      {user && user.roles === 'tutor' && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "0 2% 1rem",
            boxSizing: "border-box",
            gap: "1rem",
          }}
          className="home-second-row"
        >
          {/* Notifications - Same width as announcements */}
          <div
            style={{
              width: "20%",
              display: "flex",
              flexDirection: "column",
              paddingTop: "0.5rem",
            }}
            className="home-notifications-column"
          >
            <div
              style={{
                background: "#fff",
                border: "3px solid #E1E1E1",
                borderRadius: 12,
                padding: "1rem",
                height: 177,
                maxHeight: 177,
                minHeight: 177,
                overflowY: "auto",
              }}
            >
              <h4 style={{ textAlign: "center", marginTop: 0, marginBottom: "1rem" }}>{t('home.notifications')}</h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    // Determine background color based on notification type and read status
                    const getNotificationStyle = (type, read) => {
                      const baseStyle = {
                        padding: "0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        opacity: read ? 0.7 : 1,
                      };
                      
                      switch (type) {
                        case 'payment_due':
                        case 'report_due':
                        case 'pending_request':
                        case 'upcoming_session':
                          return {
                            ...baseStyle,
                            backgroundColor: "#fff3cd",
                            border: "1px solid #ffeaa7"
                          };
                        case 'payment_success':
                        case 'payment_received':
                        case 'session_complete':
                        case 'request_accepted':
                          return {
                            ...baseStyle,
                            backgroundColor: "#d4edda",
                            border: "1px solid #c3e6cb"
                          };
                        case 'session_logged':
                        case 'new_student':
                        case 'resources':
                          return {
                            ...baseStyle,
                            backgroundColor: "#d1ecf1",
                            border: "1px solid #bee5eb"
                          };
                        case 'session_cancelled':
                          return {
                            ...baseStyle,
                            backgroundColor: "#ffebee",
                            border: "1px solid #ffcdd2"
                          };
                        case 'system':
                        default:
                          return {
                            ...baseStyle,
                            backgroundColor: "#f8d7da",
                            border: "1px solid #f5c6cb"
                          };
                      }
                    };
                    
                    return (
                      <div 
                        key={notification.id} 
                        style={{
                          ...getNotificationStyle(notification.type, notification.read),
                          position: "relative",
                          cursor: "pointer"
                        }}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "flex-start",
                          marginBottom: "0.25rem"
                        }}>
                          <div style={{ fontWeight: "bold", color: "#192A88" }}>
                            {notification.icon} {notification.title}
                          </div>
                          <div style={{ 
                            fontSize: "0.65rem", 
                            color: "#888",
                            marginLeft: "0.5rem"
                          }}>
                            {new Date(notification.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ color: "#666", fontSize: "0.7rem" }}>
                          {notification.message}
                        </div>
                        {!notification.read && (
                          <div style={{ 
                            position: "absolute", 
                            right: "0.5rem", 
                            top: "0.5rem",
                            width: "8px", 
                            height: "8px", 
                            backgroundColor: "#dc3545",
                            borderRadius: "50%"
                          }} />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔔</div>
                    <div style={{ fontSize: "0.8rem" }}>No notifications yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Parent Requests - Same width as the logged hours table */}
          <div
            style={{
              width: "55%",
              display: "flex",
              flexDirection: "column",
              paddingTop: "0.25rem",
              marginTop: "-0.5rem",
            }}
            className="home-requests-column"
          >
            <div
              className="table-wrapper mobile-section recent-requests-section"
              style={{
                background: "#fff",
                border: "3px solid #E1E1E1",
                borderRadius: 12,
                overflow: "auto",
                height: 177,
                minHeight: 177,
                maxHeight: 177,
              }}
            >
              <div style={{ padding: "1rem 1rem 0.25rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ textAlign: "center", margin: 0, fontSize: "1rem" }}>
                  {user?.roles === 'parent' ? t('home.myRequests') : user?.roles === 'tutor' ? t('home.recentParentRequests') : t('home.recentRequests')}
                </h4>
                <button
                  onClick={() => window.location.href = user?.roles === 'parent' ? '/replies' : 'https://egstutoring-portal.ca/parent-dashboard'}
                  style={{
                    backgroundColor: "#192A88",
                    color: "#fff",
                    border: "none",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    fontWeight: "bold"
                  }}
                >
                  {t('home.viewMore')}
                </button>
              </div>
              
              {recentParentRequests.length > 0 ? (
                <div style={{ padding: "0 1rem 1rem" }}>
                  {recentParentRequests.slice(0, 3).map((request, index) => (
                    <div 
                      key={request.id || index} 
                      style={{ 
                        backgroundColor: "#f8f9fa",
                        border: "1px solid #dee2e6",
                        borderRadius: "4px",
                        padding: "6px 8px",
                        margin: "4px 0",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                        <strong style={{ color: "#192A88", fontSize: "0.8rem" }}>
                          {request.subject || 'N/A'}
                        </strong>
                        <span style={{
                          fontSize: "0.65rem",
                          color: request.is_accepted === 'Accepted' ? '#28a745' : request.is_accepted === 'Rejected' ? '#dc3545' : '#ffc107',
                          fontWeight: "bold"
                        }}>
                          {request.is_accepted?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "0.15rem" }}>
                        <strong>City:</strong> {request.city || 'N/A'}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#666", marginBottom: "0.15rem" }}>
                        <strong>Grade:</strong> {request.grade || 'N/A'} | <strong>Service:</strong> {request.service || 'N/A'}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#888" }}>
                        {new Date(request.created_at || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <p style={{ color: "#888", fontSize: "0.8rem", margin: 0 }}>
                    {user?.roles === 'parent' ? t('home.noTutoringRequests') : t('home.noRecentRequests')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Transfers - Same width as monthly reports */}
          <div
            style={{
              width: "20%",
              display: "flex",
              flexDirection: "column",
              paddingTop: "0.5rem",
            }}
            className="home-payments-column"
          >
            <div
              style={{
                background: "#fff",
                border: "3px solid #E1E1E1",
                borderRadius: 12,
                padding: "1rem",
                height: 177,
                maxHeight: 177,
                minHeight: 177,
                overflowY: "auto",
              }}
            >
              <h4 style={{ textAlign: "center", marginTop: 0, fontSize: "1rem", marginBottom: "0.5rem" }}>{t('home.paymentTransfers')}</h4>
              <div style={{ fontSize: "0.7rem", color: "#888", textAlign: "center", marginBottom: "0.5rem" }}>
                {paymentTransfers.length} {t('home.recentTransfers')}
              </div>
              
              {paymentTransfers.length > 0 ? (
                paymentTransfers.map((transfer, index) => (
                  <div
                    key={transfer.id || index}
                    style={{
                      backgroundColor: getInvoiceAgeColor(transfer.created_at),
                      padding: "0.5rem",
                      marginBottom: "0.5rem",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      border: "1px solid #dee2e6",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <strong style={{ color: "#28a745" }}>
                        ${((transfer.amount || 0) / 100).toFixed(2)}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "#666" }}>
                        {transfer.status === 'completed' ? '✅' : transfer.status === 'pending' ? '⏳' : '❌'}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#666", marginBottom: "0.25rem" }}>
                      {transfer.description || t('home.monthlyPayout')}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>
                      {new Date(transfer.created_at || transfer.created || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  {!user?.stripe_account_id ? (
                    // Show Stripe setup message if tutor hasn't completed onboarding
                    <div>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>💳</div>
                      <p style={{ color: "#dc3545", fontSize: "0.9rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                        {t('home.stripeNotSetup')}
                      </p>
                      <p style={{ color: "#666", fontSize: "0.8rem", marginBottom: "1rem" }}>
                        {t('home.stripeSetupRequired')}
                      </p>
                      <button
                        onClick={() => alert(t('home.checkEmailStripe'))}
                        style={{
                          backgroundColor: "#192A88",
                          color: "white",
                          border: "none",
                          padding: "0.5rem 1rem",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "bold"
                        }}
                      >
                        {t('home.setupStripeAccount')}
                      </button>
                    </div>
                  ) : (
                    // Show normal "no transfers" message if Stripe is set up
                    <div>
                      <p style={{ color: "#888", fontSize: "0.9rem" }}>
                        {t('home.noPaymentTransfers')}
                      </p>
                      <p style={{ color: "#666", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                        {t('home.transfersWillAppearHere')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Admin Notification Tool Modal */}
      {showNotificationTool && (
        <AdminNotificationTool onClose={() => setShowNotificationTool(false)} />
      )}

      {/* Admin Resend Verification Tool Modal */}
      {showResendVerificationTool && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#192A88' }}>
                {t('admin.resendVerificationEmail', 'Resend Verification Email')}
              </h2>
              <button
                onClick={() => setShowResendVerificationTool(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <ResendVerificationTool onClose={() => setShowResendVerificationTool(false)} />
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#192A88' }}>
                {t('home.uploadDocuments', 'Upload Documents')}
              </h2>
              <button
                onClick={() => setShowDocumentUploadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            <TutorDocumentUpload onUpload={handleDocumentUploadSuccess} />
          </div>
        </div>
      )}

      {/* Onboarding Tour - Hidden on mobile and disabled for tutors */}
      {user?.roles !== 'tutor' && (
        <>
          <div className="tour-container">
            <HomeTour
              userRole={user?.roles}
              manualStart={showTourManually}
              onManualStartComplete={() => setShowTourManually(false)}
            />
          </div>

          {/* Help Button - Manual Tour Restart - Hidden on mobile */}
          <button
            onClick={() => setShowTourManually(true)}
            className="tour-help-button"
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#192A88',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(25, 42, 136, 0.3)',
          zIndex: 999,
          fontWeight: 'bold',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 16px rgba(25, 42, 136, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 12px rgba(25, 42, 136, 0.3)';
        }}
        title="Restart Tour"
          >
            ?
          </button>
        </>
      )}
      <style jsx>{`
        @media (max-width: 768px) {
          .tour-help-button {
            display: none !important;
          }
          .tour-container {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
