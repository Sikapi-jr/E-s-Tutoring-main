// src/components/UnauthNavbar.jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import EGSLogo from "./EGSLogo.jsx";
import "../styles/UnauthNavbar.css";

export default function UnauthNavbar() {
  const { t } = useTranslation();

  return (
    <nav className="unauth-nav">
      <div className="nav-left">
        <NavLink to="/" className="nav-link brand-link">
          <EGSLogo className="nav-logo" />
        </NavLink>
        <LanguageSwitcher className="nav-language-switcher" />
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/login" className="nav-link">
            {t('navigation.login')}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `btn-register${isActive ? " active-link" : ""}`
            }
          >
            {t('navigation.register')}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
