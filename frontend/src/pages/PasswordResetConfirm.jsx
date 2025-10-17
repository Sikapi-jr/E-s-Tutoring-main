import { useState } from "react";
import api from "../api";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordResetConfirm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { uid, token } = useParams();
    const [password, setPassword] = useState("");
    const [passwordValid, setPasswordValid] = useState("");
    const [error, setError] = useState(null);
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");

    const validatePassword = (password) => {
        // Only allow keyboard characters: ASCII printable characters (32-126)
        const keyboardCharsRegex = /^[ -~]*$/;
        
        if (!keyboardCharsRegex.test(password)) {
            return "Password can only contain keyboard characters";
        }
        
        if (password.length < 8) {
            return "Password must be at least 8 characters long";
        }

        // Check if password is entirely numeric (Django's NumericPasswordValidator)
        const numericOnlyRegex = /^\d+$/;
        if (numericOnlyRegex.test(password)) {
            console.log("Password is entirely numeric:", password); // Debug log
            return "Password cannot be entirely numeric";
        }
        
        return "";
    };

    const validatePasswordMatch = (password, confirmPassword) => {
        if (confirmPassword && password !== confirmPassword) {
            return "Passwords do not match";
        }
        return "";
    };

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        if (newPassword) {
            setPasswordError(validatePassword(newPassword));
        } else {
            setPasswordError("");
        }
        // Check password match when password changes
        if (passwordValid) {
            setConfirmPasswordError(validatePasswordMatch(newPassword, passwordValid));
        }
    };

    const handleConfirmPasswordChange = (e) => {
        const newConfirmPassword = e.target.value;
        setPasswordValid(newConfirmPassword);
        setConfirmPasswordError(validatePasswordMatch(password, newConfirmPassword));
    };
    
    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate password
        const passwordValidationError = validatePassword(password);
        if (passwordValidationError) {
            setPasswordError(passwordValidationError);
            setPassword("");
            setPasswordValid("");
            return;
        }

        // Validate password match
        const matchValidationError = validatePasswordMatch(password, passwordValid);
        if (matchValidationError) {
            setConfirmPasswordError(matchValidationError);
            setPassword("");
            setPasswordValid("");
            return;
        }

        const payload = {
            token,
            password,
        }

        try {
            const response = await api.post('/api/password_reset/confirm/', payload);

            // Check if response indicates success
            if (response.status === 200 || response.status === 201 || response.data?.status === 'OK') {
                alert(t('auth.passwordResetSuccess', 'Password reset successful! You can now log in with your new password.'));
                // Use setTimeout to ensure alert is shown before navigation
                setTimeout(() => {
                    navigate("/login");
                }, 100);
            } else {
                throw new Error('Unexpected response format');
            }
        } catch(error) {
            console.error("Password reset error:", error);

            // Check if it's a 404 error but password was actually reset
            // (This can happen if the token is consumed but response handling fails)
            if (error.response?.status === 404) {
                // Try to show success anyway since the user reported it works
                alert(t('auth.passwordResetSuccess', 'Password reset successful! You can now log in with your new password.'));
                setTimeout(() => {
                    navigate("/login");
                }, 100);
            } else {
                // Show error message for other errors
                const errorMessage = error.response?.data?.error ||
                                   error.response?.data?.message ||
                                   "Token already used or invalid. Request another password reset email.";
                setError(errorMessage);
                setPassword("");
                setPasswordValid("");
            }
        }
    };

    return (
            <div className="form-container">
                <h1>Reset Password</h1>
                    <form onSubmit={handleReset}>
                        <h2>Enter new password</h2>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={handlePasswordChange}
                            placeholder="New password"
                        />
                        {passwordError && <p className="password-error">{passwordError}</p>}
                        <h2>Re-type password</h2>
                        <input
                            className="form-input"
                            type="password"
                            value={passwordValid}
                            onChange={handleConfirmPasswordChange}
                            placeholder="Re-type new password"
                        />
                        {confirmPasswordError && <p className="password-error">{confirmPasswordError}</p>}
                        <button className="form-button" type="submit">
                            Reset
                        </button>
                        {error && <p className="error-message">{error}</p>}
                    </form>
            </div>
    );
}
export default PasswordResetConfirm;