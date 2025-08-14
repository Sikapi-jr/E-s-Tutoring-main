// src/components/LoginForm.jsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from "./UserProvider";
import "../styles/RegistrationForm.css";

function LoginForm() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [clicked, setClicked] = useState(false);
  const [clickedReset, setClickedReset] = useState(false);
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleReset = () => {
    setClickedReset(true);
    navigate("/passwordReset");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setClicked(true);

    try {
      const payload = { username, password };
      const res = await api.post("/api/token/", payload);
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

      const userRes = await api.get("/api/user/", {
        headers: { Authorization: `Bearer ${res.data.access}` },
      });

      if (!userRes.data.is_active) {
        setError(t('errors.accountNotVerified'));
        return;
      }

      setUser(userRes.data);
      navigate("/");
    } catch (err) {
      if (err.response) {
        setError(t('errors.serverError'));
      } else if (err.request) {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.somethingWentWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>{t('auth.loginTitle')}</h1>

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
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('common.password')}
            required
          />
          <button
            className={`form-button${clicked ? " clicked" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('auth.loginButton')}
          </button>
        </form>
      </div>

        <button
          className={`form-button${clickedReset ? " clicked" : ""}`}
          onClick={handleReset}
        >
          {t('auth.forgotPassword')}
        </button>

      <p className="login-prompt">
        {t('auth.dontHaveAccount')}{" "}
        <span className="login-link" onClick={() => navigate("/register")}>
          {t('auth.signUpHere')}
        </span>
      </p>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default LoginForm;
