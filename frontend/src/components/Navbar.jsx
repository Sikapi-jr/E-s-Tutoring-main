// src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "./UserProvider";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Navbar.css";
import EGSLogo from "./EGSLogo.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import MyTutorsDropdown from "./MyTutorsDropdown.jsx";

/* ---------- DROPDOWN CONTEXT ---------- */
const DropdownContext = createContext();

function DropdownProvider({ children }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const closeAllDropdowns = () => setOpenDropdown(null);
  const toggleDropdown = (id) => setOpenDropdown(openDropdown === id ? null : id);
  
  return (
    <DropdownContext.Provider value={{ openDropdown, closeAllDropdowns, toggleDropdown }}>
      {children}
    </DropdownContext.Provider>
  );
}

const useDropdown = () => useContext(DropdownContext);

/* ---------- ROUTE DEFINITIONS ---------- */
// Define routes with translation keys instead of hardcoded labels
const getRoutes = (t) => ({
  Home:    { to: "/home",              label: t('navigation.home') },
  Students:{ to: "/students",          label: t('navigation.students') },
  Request: { to: "/request",           label: t('navigation.request') },
  Replies: { to: "/request-reply",     label: t('navigation.replies') },
  Log:     { to: "/log",               label: t('navigation.logHours') },
  Hours:   { to: "/hours",             label: t('navigation.loggedHours') },
  Weekly:  { to: "/WeeklyHours",       label: t('navigation.weeklyHours') },
  Monthly: { to: "/MonthlyHours",      label: t('navigation.monthlyHours') },
  Reports: { to: "/monthly-reports",   label: t('monthlyReports.title') },
  Ann:     { to: "/create-announcement", label: t('navigation.announcements') },
  Complaints: { to: "/admin-complaints", label: "Student Complaints" },
  Cal:     { to: "/calendar",          label: t('navigation.calendar') },
  Events:  { to: "/events",            label: t('navigation.events') },
  CalCon:  { to: "/calendarConnect",   label: t('navigation.scheduleSession') },
  Inv:     { to: "/ViewInvoices",      label: t('navigation.invoices') },
  Dash:    { to: "/parent-dashboard",  label: t('navigation.dashboard') },
  Set:     { to: "/settings",          label: t('navigation.settings') },
  Login:   { to: "/login",             label: t('navigation.login') },
  Register:{ to: "/register",          label: t('navigation.register') },
});

/* ---------- ROLE CONFIG ---------- */
// Role config now uses route keys instead of BASE objects
const getRoleConfig = (BASE) => ({
  superuser: {
    main:   [BASE.Home],
    tutor:  [BASE.Request, BASE.Replies, BASE.Log, BASE.Weekly, BASE.Monthly, BASE.Ann],
    cal:    [BASE.Events, BASE.CalCon, BASE.Hours],
    single: [BASE.Inv, BASE.Reports, BASE.Complaints],
  },
  parent: {
    main:   [BASE.Home],
    tutor:  [BASE.Students, BASE.Request, BASE.Replies],
    cal:    [BASE.Events, BASE.Hours],
    single: [BASE.Inv, BASE.Reports],
  },
  tutor: {
    main:   [BASE.Home, BASE.Dash],
    tutor:  [BASE.Log, BASE.CalCon],
    cal:    [BASE.Events, BASE.Hours],
    single: [BASE.Reports],
  },
  student: {
    main:   [BASE.Home],
    tutor:  [],
    cal:    [BASE.Events, BASE.Hours],
    single: [],
  },
});

/* ---------- GENERIC DROPDOWN ---------- */
function Dropdown({ label, items, onItemClick, dropdownId }) {
  const { openDropdown, toggleDropdown } = useDropdown();
  const ref = useRef(null);
  const location = useLocation();
  
  const open = openDropdown === dropdownId;

  // Check if any dropdown item is currently active
  const isActive = items.some(item => location.pathname === item.to);

  useEffect(() => {
    if (!open) return;
    const click = (e) =>
      ref.current && !ref.current.contains(e.target) && toggleDropdown(null);
    const esc = (e) => e.key === "Escape" && toggleDropdown(null);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [open, toggleDropdown, ref]);

  return (
    <div className="dd-wrapper" ref={ref}>
      <button
        type="button"
        className={`nav__link ${isActive ? 'active' : ''}`}
        onClick={() => toggleDropdown(dropdownId)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label} ▾
      </button>

      {open && (
        <ul className="dd-menu" role="menu">
          {items.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className="dd-item"
                role="menuitem"
                onClick={() => {
                  toggleDropdown(null);
                  onItemClick && onItemClick();
                }}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- PROFILE MENU ---------- */
function ProfileMenu({ user, BASE, onMobileClose }) {
  const { t } = useTranslation();
  const { openDropdown, toggleDropdown } = useDropdown();
  const ref = useRef(null);
  const navigate = useNavigate();
  
  const open = openDropdown === 'profile';

  const handleToggle = () => {
    if (onMobileClose) onMobileClose(); // Close mobile menu when profile dropdown opens
    toggleDropdown('profile');
  };

  const loggedIn = !!user;
  const items = loggedIn
    ? [
        { to: BASE.Set.to, label: t('navigation.settings') },
        { to: "#logout", label: t('navigation.logout'), action: "logout" },
      ]
    : [
        { to: BASE.Login.to, label: t('navigation.login') },
        { to: BASE.Register.to, label: t('navigation.register') },
      ];

  const handleLogout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    if (!open) return;
    const click = (e) =>
      ref.current && !ref.current.contains(e.target) && toggleDropdown(null);
    const esc = (e) => e.key === "Escape" && toggleDropdown(null);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [open, toggleDropdown, ref]);

  return (
    <div className="profile" ref={ref}>
      <button
        className="profile__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
      >
        {user.profile_picture && !user.profile_picture.includes('default-profile-picture.jpeg') ? (
          <img
            src={user.profile_picture}
            alt="Profile"
            className="profile__avatar profile__avatar--image"
          />
        ) : (
          <svg className="profile__avatar" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        )}
      </button>

      {open && (
        <ul className="profile__menu" role="menu">
          {items.map((it) =>
            it.action === "logout" ? (
              <li key={it.label}>
                <button
                  className="profile__item"
                  onClick={() => {
                    handleLogout();
                    toggleDropdown(null);
                  }}
                >
                  {it.label}
                </button>
              </li>
            ) : (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  className="profile__item"
                  role="menuitem"
                  onClick={() => toggleDropdown(null)}
                >
                  {it.label}
                </NavLink>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------- MAIN NAVBAR ---------- */
function NavbarContent() {
  const { user } = useUser();
  const { t } = useTranslation();
  const { closeAllDropdowns } = useDropdown();

  // If no user, don't render the authenticated navbar
  if (!user) return null;

  // Get routes with current translations
  const BASE = getRoutes(t);
  const ROLE = getRoleConfig(BASE);

  const roleKey = user.is_superuser ? "superuser" : user.roles || "student";
  const cfg = ROLE[roleKey];
  const [mob, setMob] = useState(false);

  const handleMobToggle = () => {
    closeAllDropdowns(); // Close any open dropdowns when hamburger is toggled
    setMob(!mob);
  };

  // Build "Admin Tools" for superuser = links not present in any other role
  const adminTools = useMemo(() => {
    if (roleKey !== "superuser") return [];

    const flatten = (r) => [
      ...(r.main || []),
      ...(r.tutor || []),
      ...(r.cal || []),
      ...(r.single || []),
    ];

    const superLinks = flatten(ROLE.superuser);
    const otherLinks = new Set(
      ["parent", "tutor", "student"]
        .flatMap((rk) => flatten(ROLE[rk]))
        .map((r) => r.to)
    );

    // unique to admin
    const unique = superLinks.filter((r) => !otherLinks.has(r.to));
    return unique;
  }, [roleKey, ROLE]);

  // Deduplicate: remove admin-unique items from the normal sections for superuser
  const adminToSet = new Set(adminTools.map((r) => r.to));
  const filt = (arr) =>
    roleKey === "superuser" ? arr.filter((r) => !adminToSet.has(r.to)) : arr;

  const mainLinks = filt(cfg.main);
  const tutorLinks = filt(cfg.tutor);
  const calLinks = filt(cfg.cal);
  const singleLinks = filt(cfg.single);

  return (
    <header className="nav">
      <NavLink to="/home" className="nav__brand">
        <EGSLogo className="nav__logo" />
      </NavLink>

      <button
        className={`nav__burger ${mob ? "is-open" : ""}`}
        onClick={handleMobToggle}
        aria-label="Toggle navigation"
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`nav__links ${mob ? "is-open" : ""}`}>
        {mainLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className="nav__link" onClick={() => setMob(false)}>
            {label}
          </NavLink>
        ))}

        {tutorLinks.length > 0 && <Dropdown dropdownId="tutoring" label={t('navbar.tutoring')} items={tutorLinks} onItemClick={() => setMob(false)} />}

        {calLinks.length > 1 ? (
          <Dropdown dropdownId="calendar" label={t('navigation.calendar')} items={calLinks} onItemClick={() => setMob(false)} />
        ) : (
          calLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className="nav__link" onClick={() => setMob(false)}>
              {label}
            </NavLink>
          ))
        )}

        {singleLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className="nav__link" onClick={() => setMob(false)}>
            {label}
          </NavLink>
        ))}

        {/* ADMIN TOOLS: only shows for superuser */}
        {adminTools.length > 0 && (
          <Dropdown dropdownId="admin" label={t('navbar.adminTools')} items={adminTools} onItemClick={() => setMob(false)} />
        )}
      </nav>

      <div className="nav__right">
        {user.roles === 'student' && <MyTutorsDropdown />}
        <LanguageSwitcher className="nav__language" />
        <ProfileMenu user={user} BASE={BASE} onMobileClose={() => setMob(false)} />
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <DropdownProvider>
      <NavbarContent />
    </DropdownProvider>
  );
}
