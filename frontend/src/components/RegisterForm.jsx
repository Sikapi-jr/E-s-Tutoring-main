// src/components/RegisterForm.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/RegistrationForm.css";

function RegisterForm() {
  const { t } = useTranslation();
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
  const [phone_number, setPhone_number] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clicked, setClicked] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  const validatePassword = (password) => {
    // Only allow keyboard characters: ASCII printable characters (32-126)
    const keyboardCharsRegex = /^[ -~]*$/;
    
    if (!keyboardCharsRegex.test(password)) {
      setPasswordError("Password can only contain keyboard characters");
      return false;
    }
    
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (newPassword) {
      validatePassword(newPassword);
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClicked(true);

    // Validate password before submitting
    if (!validatePassword(password)) {
      setLoading(false);
      return;
    }

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
        phone_number,
      };
      const res = await api.post("/api/user/register/", payload);
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
      alert(t('auth.verificationEmailSent', { email }));
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = (selectedRole) => {
    setRole(selectedRole);
  };

  return (
    <div className="form-container">
      <h1>{t('auth.registerTitle')}</h1>

      <div className="role-buttons">
        <button onClick={() => handleRoleSelection("student")}>{t('auth.student')}</button>
        <button onClick={() => handleRoleSelection("parent")}>{t('auth.parent')}</button>
      </div>

      {roles === "parent" && (
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('auth.username')}
              required
            />
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder={t('common.password')}
              required
            />
            {passwordError && <p className="password-error">{passwordError}</p>}
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('common.email')}
              required
            />
            <input
              className="form-input"
              type="tel"
              value={phone_number}
              onChange={(e) => setPhone_number(e.target.value)}
              placeholder={t('common.phoneNumber')}
              required
            />

            <h2 style={{ textAlign: 'center' }}>{t('auth.privateInformation')}</h2>

            <input
              className="form-input"
              type="text"
              value={firstName}
              onChange={(e) => setFname(e.target.value)}
              placeholder={t('common.firstName')}
              required
            />
            <input
              className="form-input"
              type="text"
              value={lastName}
              onChange={(e) => setLname(e.target.value)}
              placeholder={t('common.lastName')}
              required
            />
            <input
              className="form-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('auth.homeAddress')}
              required
            />
            <select
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              <option value="" disabled>{t('auth.selectCity')}</option>
              {CITY_CHOICES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              className={`form-button${clicked ? " clicked" : ""}`}
              type="submit"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.registerAs', { role: roles.charAt(0).toUpperCase() + roles.slice(1) })}
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
              placeholder={t('auth.username')}
              required
            />
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder={t('common.password')}
              required
            />
            {passwordError && <p className="password-error">{passwordError}</p>}
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.parentEmail')}
              required
            />
            <input
              className="form-input"
              type="text"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              placeholder={t('auth.parentUsername')}
              required
            />
            <h2 style={{ textAlign: 'center' }}>{t('auth.studentPrivateInformation')}</h2>

            <input
              className="form-input"
              type="text"
              value={firstName}
              onChange={(e) => setFname(e.target.value)}
              placeholder={t('common.firstName')}
              required
            />
            <input
              className="form-input"
              type="text"
              value={lastName}
              onChange={(e) => setLname(e.target.value)}
              placeholder={t('common.lastName')}
              required
            />
            <input
              className="form-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('auth.homeAddress')}
              required
            />
            <select
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              <option value="" disabled>{t('auth.selectCity')}</option>
              {CITY_CHOICES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              className={`form-button${clicked ? " clicked" : ""}`}
              type="submit"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.registerAs', { role: roles.charAt(0).toUpperCase() + roles.slice(1) })}
            </button>
          </form>
        </div>
      )}

      <p className="login-prompt">
        {t('auth.alreadyHaveAccount')}{" "}
        <span className="login-link" onClick={() => navigate("/login")}>
          {t('auth.signInHere')}
        </span>
      </p>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RegisterForm;
