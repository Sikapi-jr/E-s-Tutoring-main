import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import "../styles/Form.css";

function RegisterForm() {
    const CITY_CHOICES = [
        'Ajax', 'Aurora', 'Barrie', 'Belleville', 'Brampton', 'Brantford', 'Burlington',
        'Cambridge', 'Chatham-Kent', 'Clarington', 'Collingwood', 'Cornwall', 'Dryden',
        'Georgina', 'Grimsby', 'Guelph', 'Hamilton', 'Huntsville', 'Innisfil',
        'Kawartha Lakes', 'Kenora', 'Kingston', 'Kitchener', 'Leamington', 'London',
        'Markham', 'Midland', 'Milton', 'Mississauga', 'Newmarket', 'Niagara Falls',
        'Niagara-on-the-Lake', 'North Bay', 'Oakville', 'Orangeville', 'Orillia',
        'Oshawa', 'Ottawa', 'Peterborough', 'Pickering', 'Quinte West', 'Richmond Hill',
        'Sarnia', 'St. Catharines', 'St. Thomas', 'Stratford', 'Sudbury', 'Tecumseh',
        'Thunder Bay', 'Timmins', 'Toronto', 'Vaughan', 'Wasaga Beach', 'Waterloo',
        'Welland', 'Whitby', 'Windsor', 'Woodstock'
      ];
    const [username, setUsername] = useState("");
    const [parent, setParent] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [roles, setRole] = useState(""); 
    const [firstName, setFname] = useState("");
    const [lastName, setLname] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
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
                firstName,
                lastName,
                address,
                city, 
            };  //Payload to be sent to backend as a POST request
            const res = await api.post("/api/user/register/", payload);
            localStorage.setItem(ACCESS_TOKEN, res.data.access);
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
            //navigate("/verify-email");  // Redirect to home after successful registration
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
                    <h2>Your Private Information</h2>

                    <input
                        className="form-input"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFname(e.target.value)}
                        placeholder="First Name"
                        required
                    />
                    <input
                        className="form-input"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLname(e.target.value)}
                        placeholder="Last Name"
                        required
                    />
                    <input
                        className="form-input"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Home addresse"
                        required
                    />
                    <select
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                    >
                        <option value="" disabled>Select a city</option>
                        {CITY_CHOICES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
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
