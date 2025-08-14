// src/App.jsx
import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Eagerly load critical components for auth flow
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import UnauthNavbar from "./components/UnauthNavBar";
import Footer from "./components/Footer.jsx";

// Lazy load all other components
const Home = lazy(() => import("./pages/Home"));
const Request = lazy(() => import("./pages/ParentRequest"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const ViewReply = lazy(() => import("./pages/ViewReply"));
const Profile = lazy(() => import("./components/Profile"));
const Announcement = lazy(() => import("./pages/CreateAnnouncement"));
const Chatgpt = lazy(() => import("./components/Chatgpt"));
const LogHours = lazy(() => import("./pages/LogHours"));
const Settings = lazy(() => import("./pages/Settings"));
const SendWeekly = lazy(() => import("./pages/SendWeekly"));
const SendMonthly = lazy(() => import("./pages/SendMonthly"));
const ViewInvoices = lazy(() => import("./pages/ViewInvoices"));
const PasswordResetConfirm = lazy(() => import("./pages/PasswordResetConfirm"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const VerifyEmail = lazy(() => import("./components/VerifyEmail"));
const CalendarApp = lazy(() => import("./components/CalendarApp"));
const StripeReauth = lazy(() => import("./pages/stripeComplete"));
const CalendarConnect = lazy(() => import("./pages/CalendarConnect"));
const LoggedHoursPage = lazy(() => import("./components/LoggedHoursPage"));
const EventsPage = lazy(() => import("./components/EventsPage"));
const MonthlyReports = lazy(() => import("./pages/MonthlyReports"));

// Loading component
const LoadingSpinner = () => {
  // Note: We can't use useTranslation here as it may not be ready during lazy loading
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      Loading... / Chargement...
    </div>
  );
};

import { UserProvider } from "./components/UserProvider";

// Initialize i18n
import "./i18n";

import "./styles/App.css";
import "./styles/UnauthNavbar.css";
import "./styles/Navbar.css";
import "./components/CalendarApp.css";
import "./styles/Footer.css"; 

function Logout() {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function AppRoutes() {
  const location = useLocation();

  const unauthenticatedPaths = [
    "/login",
    "/register",
    "/logout",
    "/password-reset",
    "/password-reset-confirm",
    "/verify-email",
    "/stripe-reauth",
  ];

  const isUnauthenticatedRoute = unauthenticatedPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (!isUnauthenticatedRoute) {
      document.body.classList.add("has-fixed-footer");
    } else {
      document.body.classList.remove("has-fixed-footer");
    }
  }, [isUnauthenticatedRoute]);

  return (
    <div className="page-wrapper">
      {isUnauthenticatedRoute ? <UnauthNavbar /> : <Navbar />}

      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/parent-dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
            <Route path="/request" element={<ProtectedRoute><Request /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/create-announcement" element={<ProtectedRoute><Announcement /></ProtectedRoute>} />
            <Route path="/log" element={<ProtectedRoute><LogHours /></ProtectedRoute>} />
            <Route path="/request-reply" element={<ProtectedRoute><ViewReply /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarApp /></ProtectedRoute>} />
            <Route path="/weeklyhours" element={<ProtectedRoute><SendWeekly /></ProtectedRoute>} />
            <Route path="/monthlyhours" element={<ProtectedRoute><SendMonthly /></ProtectedRoute>} />
            <Route path="/viewinvoices" element={<ProtectedRoute><ViewInvoices /></ProtectedRoute>} />
            <Route path="/calendarConnect" element={<ProtectedRoute><CalendarConnect /></ProtectedRoute>} />
            <Route path="/chatgpt" element={<ProtectedRoute><Chatgpt /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/hours" element={<ProtectedRoute><LoggedHoursPage /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
            <Route path="/monthly-reports" element={<ProtectedRoute><MonthlyReports /></ProtectedRoute>} />

            {/* Public pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />
            <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
            <Route path="/stripe-reauth/:uid/:token" element={<StripeReauth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!isUnauthenticatedRoute && (
        <Footer />
      )}
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  );
}
