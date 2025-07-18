// src/components/UnauthNavbar.jsx
import { NavLink } from "react-router-dom";
import "../styles/UnauthNavbar.css";

export default function UnauthNavbar() {
  return (
    <nav className="unauth-nav">
      <div className="brand">
        <NavLink to="/" className="nav-link">
          Home
        </NavLink>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/faq" className="nav-link">
            FAQ
          </NavLink>
        </li>
        <li>
          <NavLink to="/login" className="nav-link">
            Login
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              `btn-register${isActive ? " active-link" : ""}`
            }
          >
            Register
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
