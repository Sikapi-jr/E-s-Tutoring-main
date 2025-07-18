// src/components/Navbar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "./UserProvider";
import "../styles/Navbar.css";

const NAV_ITEMS = {
  superuser: [
    { to: "/",              label: "Home" },
    { to: "/profile",       label: "Profile" },
    { to: "/request",       label: "Request a Tutor" },
    { to: "/request-reply", label: "Replies" },
    { to: "/create-announcement",      label: "announcement" },
    { to: "/log",           label: "Log Hours" },
    { to: "/calendar",      label: "Calendar" },
    { to: "/WeeklyHours",   label: "Weekly Hours" },
    { to: "/ViewInvoices",  label: "View Invoices" },
    { to: "/calendarConnect",           label: "CalendarConnect" },
    { to: "/chatgpt",       label: "Chat" },
    { to: "/settings",      label: "Settings" },
  ],
  parent: [
    { to: "/",              label: "Home" },
    { to: "/profile",       label: "Profile" },
    { to: "/request",       label: "Request a Tutor" },
    { to: "/request-reply", label: "Replies" },
    { to: "/calendar",      label: "Calendar" },
    { to: "/calendarConnect",           label: "CalendarConnect" },
    { to: "/ViewInvoices",  label: "View Invoices" },
    { to: "/chatgpt",       label: "Chat" },
    { to: "/settings",      label: "Settings" },
  ],
  tutor: [
    { to: "/",                label: "Home" },
    { to: "/profile",         label: "Profile" },
    { to: "/parent-dashboard",label: "Dashboard" },
    { to: "/log",             label: "Log Hours" },
    { to: "/calendar",        label: "Calendar" },
    { to: "/chatgpt",         label: "Chat" },
    { to: "/calendarConnect",           label: "CalendarConnect" },
    { to: "/settings",        label: "Settings" },
  ],
  student: [
    { to: "/",         label: "Home" },
    { to: "/profile",  label: "Profile" },
    { to: "/calendar", label: "Calendar" },
    { to: "/calendarConnect",           label: "CalendarConnect" },
    { to: "/chatgpt",  label: "Chat" },
    { to: "/settings", label: "Settings" },
  ],
};

export default function Navbar() {
  const { user } = useUser();
  if (!user) return null;

  const roleKey = user.is_superuser ? "superuser" : user.roles;
  const links   = NAV_ITEMS[roleKey] || [];

  return (
    <nav className="navbar">
      <NavLink to="/" className="logo">
        EGS Tutoring
      </NavLink>
      <ul className="nav-links">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                isActive ? "active-link" : undefined
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
