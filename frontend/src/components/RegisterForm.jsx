// src/components/RegisterForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/RegistrationForm.css";

function RegisterForm() {
  const CITY_CHOICES = [
    "Ajax", "Aurora", "Barrie", "Belleville", "Brampton", "Brantford", "Burlington",
    "Cambridge", "Chatham-Kent", "Clarington", "Collingwood", "Cornwall", "Dryden",
    "Georgina", "Grimsby", "Guelph", "Hamilton", "Huntsville", "Innisfil",
    "Kawartha Lakes", "Kenora", "Kingston", "Kitchener", "Leamington", "London",
    "Markham", "Midland", "Milton", "Mississauga", "Newmarket", "Niagara Falls",
    "Niagara-on-the-Lake", "North Bay", "Oakville", "Orangeville", "Orillia",
    "Oshawa", "Ottawa", "Peterborough", "Pickering", "Quinte West", "Richmond Hill",
    "Sarnia", "St. Catharines", "St. Thomas", "Stratford", "Sudbury", "Tecumseh",
    "Thunder Bay", "Timmins", "Toronto", "Vaughan", "Wasaga Beach", "Waterloo",
    "Welland", "Whitby", "Windsor", "Woodstock"
  ];

  const [username, setUsername] = useState("");
  const [parent, setParent] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRole] = useState("");
  const [firstName, setFname] = useState("");
  const [lastName, setLname] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clicked, setClicked] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClicked(true);

    try {
      const payload = {
        username,
        password,
        roles,
        email,
        parent,
        firstName,
        lastName,
        address,
        city,
      };
      const res = await api.post("/api/user/register/", payload);
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      alert(`Verification email sent to ${email}`);
      navigate("/login");
    } catch (err) {
      if (err.response) {
        setError(`Server responded with: ${err.response.status} - ${err.response.data.message}`);
      } else if (err.request) {
        setError("No response from server. Please check your network.");
      } else {
        setError("Error setting up registration request: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (selectedRole) => {
    setRole(selectedRole);
  };

  return (
    <div className="form-container">
      <h1>Register</h1>

      <div className="role-buttons">
        <button onClick={() => handleRoleSelection("student")}>Student</button>
        <button onClick={() => handleRoleSelection("parent")}>Parent</button>
        <button onClick={() => handleRoleSelection("tutor")}>Tutor</button>
      </div>

      {(roles === "parent" || roles === "tutor") && (
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />

            <h2>Your Private Information</h2>

            <input
              className="form-input"
              type="text"
              value={firstName}
              onChange={(e) => setFname(e.target.value)}
              placeholder="First Name"
              required
            />
            <input
              className="form-input"
              type="text"
              value={lastName}
              onChange={(e) => setLname(e.target.value)}
              placeholder="Last Name"
              required
            />
            <input
              className="form-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Home Address"
              required
            />
            <select
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              <option value="" disabled>Select a city</option>
              {CITY_CHOICES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              className={`form-button${clicked ? " clicked" : ""}`}
              type="submit"
              disabled={loading}
            >
              Register as {roles.charAt(0).toUpperCase() + roles.slice(1)}
            </button>
          </form>
        </div>
      )}

      {roles === "student" && (
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="form-input"
              type="text"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              placeholder="Parent Username"
              required
            />
            <button
              className={`form-button${clicked ? " clicked" : ""}`}
              type="submit"
              disabled={loading}
            >
              Register as Student
            </button>
          </form>
        </div>
      )}

      <p className="login-prompt">
        Already have an account?{" "}
        <span className="login-link" onClick={() => navigate("/login")}>
          Login
        </span>
      </p>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RegisterForm;
