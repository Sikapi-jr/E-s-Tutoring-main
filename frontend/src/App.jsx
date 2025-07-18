// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Request from "./pages/ParentRequest";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ParentDashboard from "./pages/ParentDashboard";
import ViewReply from "./pages/ViewReply";
import Profile from "./components/Profile";
import Announcement from "./pages/CreateAnnouncement";
import Chatgpt from "./components/Chatgpt";
import LogHours from "./pages/LogHours";
import Settings from "./pages/Settings";
import SendWeekly from "./pages/SendWeekly";
import SendMonthly from "./pages/SendMonthly";
import ViewInvoices from "./pages/ViewInvoices";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import PasswordReset from "./pages/PasswordReset";
import VerifyEmail from "./components/VerifyEmail";
import CalendarApp from "./components/CalendarApp";
import Navbar from "./components/Navbar";
import UnauthNavbar from "./components/UnauthNavBar";  
import StripeReauth from "./pages/stripeComplete";
import CalendarConnect from "./pages/CalendarConnect";
import { UserProvider } from "./components/UserProvider";

import "./styles/App.css";
import "./styles/UnauthNavbar.css";
import "./styles/Navbar.css";
import "./components/CalendarApp.css";

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

  return (
    <div className="page-wrapper">
      {/* Top navbar */}
      {isUnauthenticatedRoute ? <UnauthNavbar /> : <Navbar />}

      {/* Main route content */}
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent-dashboard"
            element={
              <ProtectedRoute>
                <ParentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request"
            element={
              <ProtectedRoute>
                <Request />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-announcement"
            element={
              <ProtectedRoute>
                <Announcement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/log"
            element={
              <ProtectedRoute>
                <LogHours />
              </ProtectedRoute>
            }
          />
          <Route
            path="/request-reply"
            element={
              <ProtectedRoute>
                <ViewReply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weeklyhours"
            element={
              <ProtectedRoute>
                <SendWeekly />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monthlyhours"
            element={
              <ProtectedRoute>
                <SendMonthly />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewinvoices"
            element={
              <ProtectedRoute>
                <ViewInvoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendarConnect"
            element={
              <ProtectedRoute>
                <CalendarConnect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chatgpt"
            element={
              <ProtectedRoute>
                <Chatgpt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/register" element={<Register />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route
            path="/password-reset-confirm/:uid/:token"
            element={<PasswordResetConfirm />}
          />
          <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
          <Route path="/stripe-reauth/:uid/:token" element={<StripeReauth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

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
