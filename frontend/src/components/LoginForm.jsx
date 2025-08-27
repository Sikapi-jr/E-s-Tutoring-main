// src/components/LoginForm.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from "./UserProvider";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/RegistrationForm.css";

function LoginForm() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clicked, setClicked] = useState(false);
  const [clickedReset, setClickedReset] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleReset = () => {
    setClickedReset(true);
    navigate("/password-reset");
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/resendVerification/", { email: resendEmail });
      alert("Verification email sent! Please check your inbox.");
      setShowResendVerification(false);
      setResendEmail("");
    } catch (err) {
      alert("Error sending verification email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClicked(true);
    setError(""); // Clear any previous errors

    try {
      const payload = { username, password };
      const res = await api.post("/api/token/", payload);
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

      const userRes = await api.get("/api/user/", {
        headers: { Authorization: `Bearer ${res.data.access}` },
      });

      if (!userRes.data.is_active) {
        setError(t("errors.accountNotVerified"));
        setShowResendVerification(true);
        setResendEmail(userRes.data.email || "");
      } else {
        setUser(userRes.data);
        navigate("/home");
      }
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="form-container">
      <h1>{t("auth.loginTitle")}</h1>

      <div className="form-section">
        <form onSubmit={handleSubmit}>
          <input
            className="form-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("auth.username")}
            required
          />
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("common.password")}
            required
          />
          <button
            className={`form-button${clicked ? " clicked" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? t("common.loading") : t("auth.loginButton")}
          </button>
        </form>
      </div>

      <button
        className={`form-button${clickedReset ? " clicked" : ""}`}
        onClick={handleReset}
      >
        {t("auth.forgotPassword")}
      </button>

      <p className="login-prompt">
        {t("auth.dontHaveAccount")}{" "}
        <span className="login-link" onClick={() => navigate("/register")}>
          {t("auth.signUpHere")}
        </span>
      </p>

      {error && <p className="error-message">{error}</p>}
      
      {showResendVerification && (
        <div className="resend-verification-section">
          <h3>Resend Verification Email</h3>
          <form onSubmit={handleResendVerification}>
            <input
              className="form-input"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Email address"
              required
            />
            <button
              className="form-button"
              type="submit"
              disabled={loading}
            >
              {loading ? t("common.loading") : "Resend Verification Email"}
            </button>
          </form>
          <button
            className="form-button secondary"
            onClick={() => setShowResendVerification(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default LoginForm;
