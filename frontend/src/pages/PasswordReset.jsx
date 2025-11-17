import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordReset() {
    const { t } = useTranslation();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        
        try {
            await api.post('/api/password-reset-username/', { username });
            setMessage(t('auth.passwordResetEmailSent'));
        } catch (err) {
            setError(t('auth.passwordResetEmailError'));
        } finally {
            setLoading(false);
        }
    }

    return (
            <div className="form-container">
                <h1>{t('auth.resetPassword')}</h1>
                    <form onSubmit={handleReset}>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('auth.usernamePlaceholder')}
                        />
                        <button className="form-button" type="submit" disabled={loading}>
                            {loading ? t('common.sending') : t('auth.resetButton')}
                        </button>
                    </form>
                    {message && <p className="success-message">{message}</p>}
                    {error && <p className="error-message">{error}</p>}
            </div>
    );
}
export default PasswordReset;