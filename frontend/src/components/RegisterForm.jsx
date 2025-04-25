import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";

function RegisterForm() {
    const [username, setUsername] = useState("");
    const [parent, setParent] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [roles, setRole] = useState("");  // State to hold the role
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        try {
            const payload = { 
                username, 
                password, 
                roles,
                email, 
                parent, 
            };  //Payload to be sent to backend as a POST request
            const res = await api.post("/api/user/register/", payload);
            localStorage.setItem(ACCESS_TOKEN, res.data.access);
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
            navigate("/");  // Redirect to home after successful registration
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
                setError("Error setting up registration request: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRoleSelection = (selectedRole) => {
        setRole(selectedRole);
    };

    return (
        <div className="form-container">
            <h1>Register</h1>
            <div>
                <button onClick={() => handleRoleSelection("student")}>Student</button>
                <button onClick={() => handleRoleSelection("parent")}>Parent</button>
            </div>
            {roles === 'parent' && (  // Render form only if a parent is selected
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
                    <input
                        className="form-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />
                    <button className="form-button" type="submit" disabled={loading}>
                        Register as {roles.charAt(0).toUpperCase() + roles.slice(1)}
                    </button>
                </form>
            )}
            {roles === 'student' && (  // Render form only if a student is selected
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
                    <input
                        className="form-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />
                    <input
                        className="form-input"
                        type="text"
                        value={parent}
                        onChange={(e) => setParent(e.target.value)}
                        placeholder="Parent Username"
                        required
                    />
                    <button className="form-button" type="submit" disabled={loading}>
                        Register as {roles.charAt(0).toUpperCase() + roles.slice(1)}
                    </button>
                </form>
            )}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default RegisterForm;
