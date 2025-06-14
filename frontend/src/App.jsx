//Handles navigation structure of entire application by including the main router. 
// Place to define routes that determine which component should be rendered based on the url pattern accessed
import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import Request from "./pages/ParentRequest"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"
import ParentDashboard from "./pages/ParentDashboard"
import ViewReply from "./pages/ViewReply"
import Profile from "./components/Profile"
import Chatgpt from "./components/Chatgpt"
import LogHours from "./pages/LogHours"
import Settings from "./pages/Settings"
import SendWeekly from "./pages/SendWeekly"
import SendMonthly from "./pages/SendMonthly"
import ViewInvoices from "./pages/ViewInvoices"
import PasswordResetConfirm from "./pages/PasswordResetConfirm"
import Navbar from "./components/Navbar"
import PasswordReset from "./pages/PasswordReset"
import VerifyEmail from "./components/VerifyEmail"
import CalendarApp from './components/CalendarApp'
import './components/CalendarApp.css'
import { UserProvider } from "./components/UserProvider"


function Logout() {
  localStorage.clear()
  return <Navigate to="/login" />

}

//Logs out by removing the tokens first

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
      <Navbar />
        <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          <Route path="/parent-dashboard" element={
            <ProtectedRoute>
              <ParentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/request" element={
            <ProtectedRoute>
              <Request />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/Log" element={
            <ProtectedRoute>
              <LogHours />
            </ProtectedRoute>
          } />

          <Route path="/request-reply" element={
            <ProtectedRoute>
              <ViewReply />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <CalendarApp />
            </ProtectedRoute>
          } />

          <Route path="/WeeklyHours" element={
            <ProtectedRoute>
              <SendWeekly />
            </ProtectedRoute>
          } />

          <Route path="/verify-email/:uid/:token" element={<VerifyEmail />}></Route>

          <Route path="/ViewInvoices" element={
            <ProtectedRoute>
              <ViewInvoices />
            </ProtectedRoute>
          } />

          <Route path="/MonthlyHours" element={
            <ProtectedRoute>
              <SendMonthly />
            </ProtectedRoute>
          } />

          <Route path="/chatgpt" element={
            <ProtectedRoute>
              <Chatgpt />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />}></Route> 
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}

export default App
