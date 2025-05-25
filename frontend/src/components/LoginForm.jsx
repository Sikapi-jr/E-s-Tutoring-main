import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from './UserProvider';
import "../styles/Form.css";

function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { setUser } = useUser();
    const navigate = useNavigate();

    const handleReset = async (e) => {
        navigate("/passwordReset")        
        //const response = await api.post('http://127.0.0.1:8000/api/password_reset/', resetEmail);
    }
    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        try {
            const payload = { 
                username, 
                password,  
            };  //Payload to be sent to backend as a POST request
            
            const res = await api.post("/api/token/", payload);
            localStorage.setItem(ACCESS_TOKEN, res.data.access);
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
            
            const userResponse = await api.get("/api/user/", {
                headers: { Authorization: `Bearer ${res.data.access}` },
            });

            if(userResponse.data.is_active===false){
                setError(`Error! Account not verified, check your email.`)
                return;
            }
            setUser(userResponse.data);
            navigate("/");  // Redirect to home after successful Login
        
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(`Server responded with: ${error.response.status} - ${error.response.data.message}`);
            } else if (error.request) {
                // The request was made but no response was received
                setError("No response from server. Please check your network.");
            } else {
                // Something happened in setting up the request that triggered an Error
                setError("Error setting up login request: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h1>Login</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        className="form-input"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                    <input
                        className="form-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                    />
                    <button className="form-button" type="submit" disabled={loading}>
                        Login
                    </button>
                </form>
                    <button className="form-button" onClick={() => handleReset()}>
                        Reset?
                    </button>
            
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default LoginForm;
