import { Link } from "react-router-dom";
import "../styles/UnauthNavbar.css";

export default function UnauthNavbar() {
  return (
    <nav className="unauth-nav">
      <div className="brand">
        <Link to="/">Home</Link>
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/faq">FAQ</Link>
        </li>
        <li>
          <Link to="/login">Login</Link>
        </li>
        <li>
          <Link className="btn-register" to="/register">
            Register
          </Link>
        </li>
      </ul>
    </nav>
  );
}
