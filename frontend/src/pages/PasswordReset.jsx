import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordReset() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        
        try {
            await api.post('/api/password_reset/', { email });
            setMessage("Password reset email sent! Please check your inbox.");
        } catch (err) {
            setError("Error sending password reset email. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
            <div className="form-container">
                <h1>Reset Password</h1>
                    <form onSubmit={handleReset}>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                        />
                        <button className="form-button" type="submit" disabled={loading}>
                            {loading ? "Sending..." : "Reset"}
                        </button>
                    </form>
                    {message && <p className="success-message">{message}</p>}
                    {error && <p className="error-message">{error}</p>}
            </div>
    );
}
export default PasswordReset;