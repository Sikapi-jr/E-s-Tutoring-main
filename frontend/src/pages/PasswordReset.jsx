import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';

function PasswordReset() {

    const [email, setEmail] = useState("");
    

    const handleReset = async (e) => {
        const response = await api.post('/api/password_reset/', { email });
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
                        <button className="form-button" type="submit">
                            Reset
                        </button>
                    </form>
            </div>
    );
}
export default PasswordReset;