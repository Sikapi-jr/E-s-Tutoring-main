import { useState } from "react";
import api from "../api";
import { useNavigate, useParams } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordResetConfirm() {
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
        
        try{
            const response = await api.post('/api/password_reset/confirm/', payload);
            alert("Password reset successful!");
            navigate("/login");
        }
        catch(error) {
            setError("Token already used or invalid. Request another password reset email.");
            setPassword("");
            setPasswordValid("");
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