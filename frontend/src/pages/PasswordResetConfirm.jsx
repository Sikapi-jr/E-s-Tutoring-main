import { useState } from "react";
import api from "../api";
import { useNavigate, useSearchParams  } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordResetConfirm() {

    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState("");
    const [passwordValid, setPasswordValid] = useState("");    
    const token = searchParams.get("token");
    const [error, setError] = useState(null);

    
    console.log("Reset Token: ", token)

    
    const handleReset = async (e) => {
        e.preventDefault();
        setError(null)
        if(password !== passwordValid){
            setError("Passwords must match")
            return;
        }
        if(password.length < 8){
            setError("Password must be atleast 8 characters");
            return;
        }
        const payload = {
            token,
            password,
        }
        
        try{
            const response = await api.post('http://127.0.0.1:8000/api/password_reset/confirm/', payload);
            alert("Password reset successful!");
            navigate("/login");
        }
        catch(error) {
            setError("Token already used. Request another email");
            alert("Rerouting to request page...");
            navigate("/passwordReset");
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
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="New password"
                        />
                        <h2>Re-type password</h2>
                        <input
                            className="form-input"
                            type="password"
                            value={passwordValid}
                            onChange={(e) => setPasswordValid(e.target.value)}
                            placeholder="Re-type new password"
                        />
                        <button className="form-button" type="submit">
                            Reset
                        </button>
                        {error && <p className="error-message">{error}</p>}
                    </form>
            </div>
    );
}
export default PasswordResetConfirm;