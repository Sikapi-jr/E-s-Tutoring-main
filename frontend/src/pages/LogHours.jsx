import { useState, useEffect, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { useUser } from '../components/UserProvider';
import "../styles/Form.css";

const LogHours = memo(() => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useUser();

    // Early return if user is not loaded yet
    if (!user) {
        return (
            <div style={{ padding: "2rem", textAlign: "center" }}>
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    //////////////////////////////////////////
    const tutor_id = user.account_id;
    const [student, setStudent] = useState("");
        //WIll add logic to find parent in view/serializer
    const [subject, setSubject] = useState("");
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    });
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [totalTime, setTotalTime] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    //////////////////////////////////////////
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [users, setUsers] = useState([]); // Store user list

    if (user.roles !== "tutor" && user.is_superuser===0){
        navigate("/login");
    }
    


    useEffect(() => {
        const fetchStudents = async () => {
          try {
            const response = await api.get(`/api/TutorStudents/?tutor=${tutor_id}`);
            setStudents(response.data);
          } catch (error) {
            console.error("Error fetching students:", error);
          }
        };
    
        if (tutor_id) {
          fetchStudents();
        }
      }, [tutor_id]);

    const getTotalTime = useCallback((startTime, endTime) => {
        if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') return 0;
        
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        const start = startHours * 60 + startMinutes;
        const end = endHours * 60 + endMinutes;
        const diffMinutes = end - start;
        
        return diffMinutes < 0 ? 0 : (diffMinutes / 60).toFixed(2);
    }, []);

    // Helper function to get current week date range (Monday to Sunday)
    const getCurrentWeekRange = useCallback(() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        // Get Monday as start of week (getDay() returns 0=Sunday, 1=Monday, etc.)
        const dayOfWeek = today.getDay();
        // Convert Sunday (0) to 7 for easier calculation, then subtract days to get to Monday
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysFromMonday); // Monday = start of week

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Sunday)

        // Debug logging
        console.log(`Today: ${today.toDateString()}, Day of week: ${dayOfWeek}`);
        console.log(`Start of week (Monday): ${startOfWeek.toDateString()}`);
        console.log(`End of week (Sunday): ${endOfWeek.toDateString()}`);

        return {
            min: startOfWeek.toISOString().split('T')[0], // Format: YYYY-MM-DD
            max: endOfWeek.toISOString().split('T')[0]    // Format: YYYY-MM-DD
        };
    }, []);

    // Client-side validation function
    const validateForm = () => {
        // Check required fields
        if (!student) {
            return t('logHours.selectStudentRequired');
        }
        if (!subject.trim()) {
            return t('logHours.subjectRequired');
        }
        if (!location) {
            return t('logHours.locationRequired');
        }
        if (!date) {
            return t('logHours.dateRequired');
        }
        if (!startTime) {
            return t('logHours.startTimeRequired');
        }
        if (!endTime) {
            return t('logHours.endTimeRequired');
        }
        if (!notes.trim()) {
            return t('logHours.notesRequired');
        }

        // Validate time range
        const totalHours = parseFloat(getTotalTime(startTime, endTime));
        if (totalHours <= 0) {
            return t('logHours.invalidTimeRange');
        }
        if (totalHours > 8) {
            return t('logHours.sessionTooLong');
        }

        // Validate date is not in the future
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (selectedDate > today) {
            return t('logHours.futureDate');
        }

        // Validate date is within current week (Monday to Sunday)
        const currentDate = new Date();
        const startOfWeek = new Date(currentDate);
        // Get Monday as start of week
        const dayOfWeek = currentDate.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(currentDate.getDate() - daysFromMonday); // Monday = start of week
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Sunday)
        endOfWeek.setHours(23, 59, 59, 999);

        if (selectedDate < startOfWeek || selectedDate > endOfWeek) {
            return t('logHours.currentWeekOnly') + ' (' + 
                   startOfWeek.toLocaleDateString() + ' - ' + endOfWeek.toLocaleDateString() + ')';
        }

        // Validate session time is not in the future
        const sessionDateTime = new Date(date + 'T' + endTime);
        const now = new Date();
        if (sessionDateTime > now) {
            return t('logHours.futureEndTime');
        }

        return null; // No validation errors
    };

    const handleSubmit = async (e) => {
        const decimalHours = getTotalTime(startTime, endTime)
        e.preventDefault();
        setError(""); // Clear error message on button press
        setSuccessMessage(""); // Clear success message
        
        // Run client-side validation first
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }
        
        setLoading(true);

        try {
            const payload = {
                student_id: student,
                tutor: tutor_id,
                date,
                start_time: startTime,
                end_time: endTime,
                totalTime : decimalHours,
                location,
                subject,
                notes,
            };
            const res = await api.post("/api/log/", payload);
            
            // Show success message with student name
            const selectedStudent = students.find(stud => stud.student == student);
            const studentName = selectedStudent ? `${selectedStudent.student_firstName} ${selectedStudent.student_lastName}` : "student";
            setSuccessMessage(t('logHours.hoursAddedSuccess', { hours: decimalHours, student: studentName }));
            
            // Clear form fields
            setStudent("");
            setSubject("");
            setDate(new Date().toISOString().split('T')[0]); // Format: YYYY-MM-DD
            setStartTime("");
            setEndTime("");
            setLocation("");
            setNotes("");
            
        } catch (error) {
            console.error('Error logging hours:', error);
            
            if (error.response && error.response.data) {
                // Handle specific backend validation errors
                const errorMessage = error.response.data.detail || error.response.data.message;
                
                if (typeof errorMessage === 'string') {
                    // Map common backend errors to user-friendly messages
                    if (errorMessage.includes('Cannot log hours for future dates/times')) {
                        setError('Cannot log hours for future dates or times. Please select a past date and time.');
                    } else if (errorMessage.includes('Cannot log hours that end in the future')) {
                        setError('The session end time cannot be in the future. Please check your date and end time.');
                    } else if (errorMessage.includes('Can only log hours for the current week')) {
                        setError('You can only log hours for the current week. Please select a date from this week.');
                    } else if (errorMessage.includes('Hours already logged for this tutor, student, date, and time slot')) {
                        setError('You have already logged hours for this student at this exact date and time. Please check your existing entries or select a different time.');
                    } else if (errorMessage.includes('Missing') && errorMessage.includes('field')) {
                        setError('Please fill in all required fields: student, subject, location, date, start time, end time, and session description.');
                    } else if (errorMessage.includes('Invalid date/time format')) {
                        setError('Invalid date or time format. Please check your entries and try again.');
                    } else {
                        setError(errorMessage);
                    }
                } else if (Array.isArray(errorMessage)) {
                    setError(errorMessage.join(', '));
                } else {
                    setError('Failed to log hours. Please check all fields and try again.');
                }
            } else if (error.response) {
                setError('Server error occurred. Please try again later or contact support if the problem persists.');
            } else if (error.request) {
                setError('Network connection error. Please check your internet connection and try again.');
            } else {
                setError('An unexpected error occurred while logging hours. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container" style={{ marginBottom: "2rem" }}>
            <h1>Finished a session?</h1>
            <h2 style={{ marginTop: "0.5rem", color: "#192A88" }}>Log your hours</h2>
            <form onSubmit={handleSubmit}>
                <select
                    className="form-input"
                    value={student}
                    onChange={(e) => setStudent(e.target.value)}
                >
                    <option value="">{t('logHours.selectStudent')}</option>
                        {students && students.map((stud) => (
                            <option key={stud.id} value={stud.student}>
                                {stud.student_firstName} {stud.student_lastName}
                            </option>
                        ))}
                </select>

                {/* Subject and Location Row */}
                <div className="form-row">
                    <input
                        className="form-input"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t('logHours.subject')}
                    />

                    <select className="form-input" name="selectedLocation" onChange={(e) => setLocation(e.target.value)}>
                        <option value="">{t('logHours.selectLocation')}</option>
                        <option value="Online">{t('logHours.online')}</option>
                        <option value="In-Person">{t('logHours.inPerson')}</option>
                    </select>
                </div>

                <input
                    className="form-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder={t('common.date')}
                    min={getCurrentWeekRange().min}
                    max={getCurrentWeekRange().max}
                    title="You can only select dates from the current week"
                />

                {/* Time Row */}
                <div className="form-row">
                    <div className="time-field">
                        <label className="time-label">{t('logHours.startTime')}</label>
                        <input
                            className="form-input"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>

                    <div className="time-field">
                        <label className="time-label">{t('logHours.endTime')}</label>
                        <input
                            className="form-input"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>

                <input
                    className="form-input"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('logHours.sessionDescription')}
                />

                {/* Submit Button */}
                <button className="form-button" type="submit" disabled={loading}>
                    {loading ? t('common.loading') : t('logHours.logHoursButton')}
                </button>
            </form>

            {/* Success Message */}
            {successMessage && (
                <div className="success-message" style={{ color: 'green' }}>
                    <p>{successMessage}</p>
                    <p>
                        <span 
                            style={{ textDecoration: 'underline', cursor: 'pointer', color: 'green' }}
                            onClick={() => navigate('/hours')}
                        >
                            {t('logHours.viewAllHours')}
                        </span>
                    </p>
                </div>
            )}
            
            {/* Error Message */}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
});

LogHours.displayName = 'LogHours';

export default LogHours;