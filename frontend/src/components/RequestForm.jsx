import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from './UserProvider';
import "../styles/Form.css";

function RequestForm() {
    const navigate = useNavigate();
    const { user } = useUser();
    const parentUser = user.username;
    const parent = user.account_id;
    console.log("Parent from useUser:", parent);
    const [student, setStudent] = useState("");
    const [students, setStudents] = useState([]);
    const [subject, setSubject] = useState("");
    const [grade, setGrade] = useState("");
    const [service, setService] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(""); // Added missing state for error
    const [users, setUsers] = useState([]); // Store user list

    if (user.roles !== 'parent'){
        navigate('/login');
    }


    useEffect(() => {
        const fetchStudents = async () => {
          try {
            // Replace the URL with your actual endpoint that returns the student list
            const response = await api.get(`/api/students/?parent=${parent}`);
            setStudents(response.data);
          } catch (error) {
            console.error("Error fetching students:", error);
          }
        };
    
        if (parent) {
          fetchStudents();
        }
      }, [parent]);

    const handleSubmit = async (e) => {
        console.log("singe", student.id)
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                parent,
                student, 
                subject,
                grade,
                service,
                description,
            };
            const res = await api.post("/api/requests/create/", payload);
            console.log("Request created successfully:", res.data);
        } catch (error) {
            if (error.response) {
                setError(`Server responded with: ${error.response.status} - ${error.response.data.message}`);
            } else if (error.request) {
                setError("No response from server. Please check your network.");
            } else {
                setError("Error setting up tutoring request: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h1>Request a Tutor</h1>
            <form onSubmit={handleSubmit}>
                <select
                    className="form-input"
                    value={student}
                    onChange={(e) => {
                        setStudent(e.target.value);
                    }}
                >
                    <option value="">-- Select Student --</option>
                        {students.map((stud) => (
                            <option key={stud.id} value={stud.id}>
                                {stud.username} {/* or any other student display name */}
                            </option>
                ))}
                </select>

                {/* Subject Input */}
                <input
                    className="form-input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                />

                {/* Grade Selection */}
                <select id="form-input" name="selectedGrade" onChange={(e) => setGrade(e.target.value)}>
                    <option value="">Select Grade</option>
                    <option value="Kindergarten">Kindergarten</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                </select>

                {/* Service Selection */}
                <select id="form-input" name="selectedService" onChange={(e) => setService(e.target.value)}>
                    <option value="">Select Service</option>
                    <option value="Online">Online</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Both (Online & In-Person)">Both (Online & In-Person)</option>
                </select>

                {/* Description Input */}
                <input
                    className="form-input"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us any relevant details!"
                />

                {/* Submit Button */}
                <button className="form-button" type="submit" disabled={loading}>
                    I am ready to find a tutor!
                </button>
            </form>

            {/* Error Message */}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default RequestForm;

