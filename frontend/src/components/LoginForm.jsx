// src/components/LoginForm.jsx
import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from "./UserProvider";
import "../styles/RegistrationForm.css";

function LoginForm() {
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
        setError("Error! Account not verified, check your email.");
        return;
      }

      setUser(userRes.data);
      navigate("/");
    } catch (err) {
      if (err.response) {
        setError(
          `Server responded with: ${err.response.status} - ${err.response.data.message}`
        );
      } else if (err.request) {
        setError("No response from server. Please check your network.");
      } else {
        setError("Error setting up login request: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1>Login</h1>

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
          <button
            className={`form-button${clicked ? " clicked" : ""}`}
            type="submit"
            disabled={loading}
          >
            Login
          </button>
        </form>
      </div>

        <button
          className={`form-button${clickedReset ? " clicked" : ""}`}
          onClick={handleReset}
        >
          Reset Password?
        </button>

      <p className="login-prompt">
        Don’t have an account?{" "}
        <span className="login-link" onClick={() => navigate("/register")}>
          Register now!
        </span>
      </p>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default LoginForm;
