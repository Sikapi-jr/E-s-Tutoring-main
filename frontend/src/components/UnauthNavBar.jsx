// src/components/UnauthNavbar.jsx
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import EGSLogo from "./EGSLogo.jsx";
import "../styles/UnauthNavbar.css";

export default function UnauthNavbar() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="unauth-nav">
      <div className="nav-left">
        <NavLink to="/" className="nav-link brand-link">
          <EGSLogo className="nav-logo" />
        </NavLink>
        <LanguageSwitcher className="nav-language-switcher" />
      </div>

      {/* Mobile hamburger button */}
      <button
        className={`nav-burger ${mobileMenuOpen ? "is-open" : ""}`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle navigation"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <ul className={`nav-links ${mobileMenuOpen ? "is-open" : ""}`}>
        <li>
          <NavLink 
            to="/login" 
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('navigation.login')}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `btn-register${isActive ? " active-link" : ""}`
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('navigation.register')}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
