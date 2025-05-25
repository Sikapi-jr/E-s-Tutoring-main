import { useState, useEffect } from "react";
import api from "../api";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';
import "../styles/Form.css";

function LogHours() {
    const navigate = useNavigate();
    const { user } = useUser();
    //////////////////////////////////////////
    const tutor = user.username;
    const [student, setStudent] = useState("");
        //WIll add logic to find parent in view/serializer
    const [subject, setSubject] = useState("");
    const [date, setDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [totalTime, setTotalTime] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    //////////////////////////////////////////
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(""); // Added missing state for error
    const [users, setUsers] = useState([]); // Store user list

    if (user.roles !== "tutor" && user.is_superuser===0){
        navigate("/login");
    }
    


    useEffect(() => {
        const fetchStudents = async () => {
          try {
            // Replace the URL with your actual endpoint that returns the student list
            const response = await axios.get(`http://127.0.0.1:8000/api/TutorStudents/?tutor=${tutor}`);
            setStudents(response.data);
          } catch (error) {
            console.error("Error fetching students:", error);
          }
        };
    
        if (tutor) {
          fetchStudents();
        }
      }, [tutor]);

    const getTotalTime = (startTime, endTime) => {
        console.log("IM in")
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        const start = startHours * 60 + startMinutes;
        const end = endHours * 60 + endMinutes;
      
        const diffMinutes = end - start;
      
        if (diffMinutes < 0) return 0; 
        console.log("start: ", start)
        console.log("end: ", end)
        console.log("Difference: ", diffMinutes)

      
        return ((diffMinutes / 60).toFixed(2)); 

    };

    const handleSubmit = async (e) => {
        const decimalHours = getTotalTime(startTime, endTime)
        console.log("Decimal Hours: ", decimalHours)
        e.preventDefault();
        console.log("Student: ", student)


        try {
            const payload = {
                student,
                tutor,
                date,
                startTime : startTime,
                endTime : endTime,
                totalTime : decimalHours,
                location,
                subject,
                notes,
            };
            const res = await axios.post("http://127.0.0.1:8000/api/log/", payload);
            console.log("Hours logged successfully:", res.data);
        } catch (error) {
            if (error.response) {
                setError(`Server responded with: ${error.response.status} - ${error.response.data.message}`);
            } else if (error.request) {
                setError("No response from server. Please check your network.");
            } else {
                setError("Error logging the hours: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h1>Finished a session? Log your hours</h1>
            <form onSubmit={handleSubmit}>
                <select
                    className="form-input"
                    value={student}
                    onChange={(e) => setStudent(e.target.value)}
                >
                    <option value="">-- Select Student --</option>
                        {students.map((stud) => (
                            <option key={stud.id} value={stud.username}>
                                {stud.student} {/* or any other student display name */}
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
                <select id="form-input" name="selectedLocation" onChange={(e) => setLocation(e.target.value)}>
                    <option value="">Select Location</option>
                    <option value="Online">Online</option>
                    <option value="In-Person">In-Person</option>
                </select>

                <input
                    className="form-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Date"
                />

                {/* Description Input */}
                <input
                    className="form-input"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="Start Time"
                />

                <input
                    className="form-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="End Time"
                />

                <input
                    className="form-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe how the session went, what did you work on? (IMPORTANT)"
                />

                {/* Submit Button */}
                <button className="form-button" type="submit" disabled={loading}>
                    LOG HOURS
                </button>
            </form>

            {/* Error Message */}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
}

export default LogHours;