// src/components/UnauthNavbar.jsx
import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import EGSLogo from "./EGSLogo.jsx";
import "../styles/UnauthNavbar.css";

// Anchors into LandingPage.jsx's sections, only shown while actually on
// the home page, since the ids only exist there.
const HOME_SECTION_LINKS = [
  { id: "getting-started", key: "gettingStarted" },
  { id: "about", key: "about" },
  { id: "goals", key: "goals" },
  { id: "pricing", key: "pricing" },
  { id: "why-choose-us", key: "whyChooseUs" },
  { id: "subjects", key: "subjects" },
  { id: "service-area", key: "serviceArea" },
  { id: "features", key: "features" },
];

export default function UnauthNavbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isContactPage = location.pathname === "/contact";
  const isMailingListPage = location.pathname === "/mailing-list";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const navRef = useRef(null);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setSectionsOpen(false);
  };

  // Close mobile menu / sections dropdown when clicking outside, or on Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        closeMenus();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const firstColumnLinks = HOME_SECTION_LINKS.slice(0, 4);
  const secondColumnLinks = HOME_SECTION_LINKS.slice(4);

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
        {isHomePage && (
          <li className={`nav-dropdown ${sectionsOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-link nav-dropdown-trigger"
              aria-haspopup="true"
              aria-expanded={sectionsOpen}
              onClick={() => setSectionsOpen((open) => !open)}
            >
              {t('landing.nav.menuLabel')}
              <span className="nav-dropdown-caret" aria-hidden="true">&#9662;</span>
            </button>
            <div className="nav-dropdown-panel">
              <div className="nav-dropdown-col">
                {firstColumnLinks.map(({ id, key }) => (
                  <a key={id} href={`#${id}`} className="nav-link nav-section-link" onClick={closeMenus}>
                    {t(`landing.nav.${key}`)}
                  </a>
                ))}
              </div>
              <div className="nav-dropdown-col">
                {secondColumnLinks.map(({ id, key }) => (
                  <a key={id} href={`#${id}`} className="nav-link nav-section-link" onClick={closeMenus}>
                    {t(`landing.nav.${key}`)}
                  </a>
                ))}
              </div>
            </div>
          </li>
        )}
        <li className="nav-language-desktop-wrapper">
          <LanguageSwitcher className="nav-language-switcher nav-language-desktop" />
        </li>
        {isContactPage || isMailingListPage ? (
          <li>
            <NavLink
              to="/"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('navigation.home')}
            </NavLink>
          </li>
        ) : (
          <li>
            <NavLink
              to="/contact"
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('footer.contact')}
            </NavLink>
          </li>
        )}
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
