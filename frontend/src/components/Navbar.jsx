// src/components/Navbar.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "./UserProvider";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Navbar.css";
import EGSLogo from "./EGSLogo.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

/* ---------- ROUTE DEFINITIONS ---------- */
// Define routes with translation keys instead of hardcoded labels
const getRoutes = (t) => ({
  Home:    { to: "/home",              label: t('navigation.home') },
  Request: { to: "/request",           label: t('navigation.request') },
  Replies: { to: "/request-reply",     label: t('navigation.replies') },
  Log:     { to: "/log",               label: t('navigation.logHours') },
  Hours:   { to: "/hours",             label: t('navigation.loggedHours') },
  Weekly:  { to: "/WeeklyHours",       label: t('navigation.weeklyHours') },
  Monthly: { to: "/MonthlyHours",      label: t('navigation.monthlyHours') },
  Reports: { to: "/monthly-reports",   label: t('monthlyReports.title') },
  Ann:     { to: "/create-announcement", label: t('navigation.announcements') },
  Cal:     { to: "/calendar",          label: t('navigation.calendar') },
  Events:  { to: "/events",            label: t('navigation.events') },
  CalCon:  { to: "/calendarConnect",   label: t('navigation.scheduleSession') },
  Inv:     { to: "/ViewInvoices",      label: t('navigation.invoices') },
  Dash:    { to: "/parent-dashboard",  label: t('navigation.dashboard') },
  Chat:    { to: "/chatgpt",           label: t('navigation.chat') },
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
    single: [BASE.Inv, BASE.Chat, BASE.Reports],
  },
  parent: {
    main:   [BASE.Home],
    tutor:  [BASE.Request, BASE.Replies],
    cal:    [BASE.Events, BASE.Hours],
    single: [BASE.Inv, BASE.Chat, BASE.Reports],
  },
  tutor: {
    main:   [BASE.Home, BASE.Dash],
    tutor:  [BASE.Log, BASE.CalCon],
    cal:    [BASE.Events, BASE.Hours],
    single: [BASE.Chat, BASE.Reports],
  },
  student: {
    main:   [BASE.Home],
    tutor:  [],
    cal:    [BASE.Events, BASE.Hours],
    single: [BASE.Chat],
  },
});

/* ---------- GENERIC DROPDOWN ---------- */
function Dropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const click = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="dd-wrapper" ref={ref}>
      <button
        type="button"
        className="nav__link"
        onClick={() => setOpen((o) => !o)}
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
                onClick={() => setOpen(false)}
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
function ProfileMenu({ user, BASE }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

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
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="profile" ref={ref}>
      <button
        className="profile__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="profile__avatar" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
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
                    setOpen(false);
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
                  onClick={() => setOpen(false)}
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
export default function Navbar() {
  const { user } = useUser();
  const { t } = useTranslation();
  if (!user) return null;

  // Get routes with current translations
  const BASE = getRoutes(t);
  const ROLE = getRoleConfig(BASE);

  const roleKey = user.is_superuser ? "superuser" : user.roles || "student";
  const cfg = ROLE[roleKey];
  const [mob, setMob] = useState(false);

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
        onClick={() => setMob(!mob)}
        aria-label="Toggle navigation"
      >
        <span />
        <span />
        <span />
      </button>

      <nav className={`nav__links ${mob ? "is-open" : ""}`}>
        {mainLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className="nav__link">
            {label}
          </NavLink>
        ))}

        {tutorLinks.length > 0 && <Dropdown label={t('navbar.tutoring')} items={tutorLinks} />}

        {calLinks.length > 1 ? (
          <Dropdown label={t('navigation.calendar')} items={calLinks} />
        ) : (
          calLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className="nav__link">
              {label}
            </NavLink>
          ))
        )}

        {singleLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className="nav__link">
            {label}
          </NavLink>
        ))}

        {/* ADMIN TOOLS: only shows for superuser */}
        {adminTools.length > 0 && (
          <Dropdown label={t('navbar.adminTools')} items={adminTools} />
        )}
      </nav>

      <div className="nav__right">
        <LanguageSwitcher className="nav__language" />
        <ProfileMenu user={user} BASE={BASE} />
      </div>
    </header>
  );
}
