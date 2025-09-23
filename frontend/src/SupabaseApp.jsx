import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Import Supabase auth components
import SupabaseAuthProvider from "./components/SupabaseAuthProvider";
import SupabaseLoginForm from "./components/SupabaseLoginForm";
import SupabaseRegisterForm from "./components/SupabaseRegisterForm";
import SupabaseProtectedRoute from "./components/SupabaseProtectedRoute";
import { useAuth } from "./hooks/useSupabaseAuth.jsx";

// Import navigation components  
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
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const PasswordResetConfirm = lazy(() => import("./pages/PasswordResetConfirm"));
const StripeComplete = lazy(() => import("./pages/stripeComplete"));
const VerifyEmail = lazy(() => import("./components/VerifyEmail"));
const MonthlyReports = lazy(() => import("./pages/MonthlyReports"));

// Navigation component that shows appropriate navbar
function NavigationWrapper() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  // Don't show navbar on auth pages
  const hideNavbarPaths = ['/login', '/register', '/reset-password'];
  const shouldHideNavbar = hideNavbarPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHideNavbar) return null;
  if (loading) return null;
  
  return isAuthenticated ? <Navbar /> : <UnauthNavbar />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <NavigationWrapper />
      
      <main className="main-content">
        <Suspense fallback={<div className="loading-spinner">Loading page...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/" /> : <SupabaseLoginForm />
            } />
            
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/" /> : <SupabaseRegisterForm />
            } />
            
            <Route path="/reset-password" element={<PasswordReset />} />
            <Route path="/reset-password-confirm" element={<PasswordResetConfirm />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <SupabaseProtectedRoute>
                <Home />
              </SupabaseProtectedRoute>
            } />

            <Route path="/profile" element={
              <SupabaseProtectedRoute>
                <Profile />
              </SupabaseProtectedRoute>
            } />

            <Route path="/settings" element={
              <SupabaseProtectedRoute>
                <Settings />
              </SupabaseProtectedRoute>
            } />

            {/* Parent-specific routes */}
            <Route path="/request" element={
              <SupabaseProtectedRoute requiredRole="parent">
                <Request />
              </SupabaseProtectedRoute>
            } />

            <Route path="/view-reply" element={
              <SupabaseProtectedRoute requiredRole="parent">
                <ViewReply />
              </SupabaseProtectedRoute>
            } />

            <Route path="/view-invoices" element={
              <SupabaseProtectedRoute requiredRole="parent">
                <ViewInvoices />
              </SupabaseProtectedRoute>
            } />

            {/* Tutor-specific routes */}
            <Route path="/tutor-dashboard" element={
              <SupabaseProtectedRoute requiredRole="tutor">
                <ParentDashboard />
              </SupabaseProtectedRoute>
            } />

            <Route path="/log-hours" element={
              <SupabaseProtectedRoute requiredRole="tutor">
                <LogHours />
              </SupabaseProtectedRoute>
            } />

            <Route path="/send-weekly" element={
              <SupabaseProtectedRoute requiredRole="tutor">
                <SendWeekly />
              </SupabaseProtectedRoute>
            } />

            <Route path="/send-monthly" element={
              <SupabaseProtectedRoute requiredRole="tutor">
                <SendMonthly />
              </SupabaseProtectedRoute>
            } />

            <Route path="/monthly-reports" element={
              <SupabaseProtectedRoute requiredRole="tutor">
                <MonthlyReports />
              </SupabaseProtectedRoute>
            } />


            {/* Admin-specific routes */}
            <Route path="/create-announcement" element={
              <SupabaseProtectedRoute requiredRole="admin">
                <Announcement />
              </SupabaseProtectedRoute>
            } />

            {/* AI Chat - available to all authenticated users */}
            <Route path="/chat" element={
              <SupabaseProtectedRoute>
                <Chatgpt />
              </SupabaseProtectedRoute>
            } />

            {/* Stripe completion */}
            <Route path="/stripe/complete/:uid/:token" element={
              <SupabaseProtectedRoute>
                <StripeComplete />
              </SupabaseProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

function SupabaseApp() {
  return (
    <BrowserRouter>
      <SupabaseAuthProvider>
        <AppRoutes />
      </SupabaseAuthProvider>
    </BrowserRouter>
  );
}

export default SupabaseApp;