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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRole] = useState("parent"); // Always set to parent
  const [firstName, setFname] = useState("");
  const [lastName, setLname] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone_number, setPhone_number] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showChildRegisterLink, setShowChildRegisterLink] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
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

    // Check if password is entirely numeric (Django's NumericPasswordValidator)
    const numericOnlyRegex = /^\d+$/;
    if (numericOnlyRegex.test(password)) {
      console.log("Password is entirely numeric:", password); // Debug log
      setPasswordError("Password cannot be entirely numeric");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const validatePasswordMatch = (password, confirmPassword) => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
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
    // Check password match when password changes
    if (confirmPassword) {
      validatePasswordMatch(newPassword, confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    validatePasswordMatch(password, newConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClicked(true);

    // Validate password and confirm password before submitting
    if (!validatePassword(password)) {
      setLoading(false);
      return;
    }

    if (!validatePasswordMatch(password, confirmPassword)) {
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
      
      // Show different success messages based on role
      if (roles === 'parent') {
        setSuccess(t('auth.parentVerificationEmailSent', { email }));
        setShowChildRegisterLink(true);
        // Navigate after 5 seconds to give time to read the message
        setTimeout(() => navigate("/login"), 5000);
      } else {
        setSuccess(t('auth.verificationEmailSent', { email }));
        setTimeout(() => navigate("/login"), 3000);
      }
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
      <h1>
        {t('auth.registerAsParent')}
      </h1>

      {(
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
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder={t('auth.confirmPassword')}
              required
            />
            {confirmPasswordError && <p className="password-error">{confirmPasswordError}</p>}
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
              {loading ? t('common.loading') : t('auth.register')}
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

      {success && (
        <div className="success-message">
          <p>{success}</p>
          {showChildRegisterLink && (
            <p>
              <span 
                style={{ 
                  textDecoration: 'underline', 
                  cursor: 'pointer', 
                  color: '#28a745',
                  fontWeight: 'bold'
                }}
                onClick={() => navigate("/register")}
              >
                {t('auth.registerChildAccount')}
              </span>
            </p>
          )}
        </div>
      )}
      
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RegisterForm;
