// src/components/UnauthNavbar.jsx
import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import EGSLogo from "./EGSLogo.jsx";
import "../styles/UnauthNavbar.css";

export default function UnauthNavbar() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="unauth-nav" ref={navRef}>
      <div className="nav-left">
        <NavLink to="/" className="nav-link brand-link">
          <EGSLogo className="nav-logo" />
        </NavLink>
        <LanguageSwitcher className="nav-language-switcher nav-language-mobile" />
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
        <li className="nav-language-desktop-wrapper">
          <LanguageSwitcher className="nav-language-switcher nav-language-desktop" />
        </li>
        <li>
          <a
            href="https://www.egstutoring.ca/about"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('footer.aboutUs')}
          </a>
        </li>
        <li>
          <NavLink
            to="/contact"
            className="nav-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('footer.contact')}
          </NavLink>
        </li>
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
