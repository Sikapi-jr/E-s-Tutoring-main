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
    //////////////////////////////////////////
    const tutor_id = user.account_id;
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
    const [error, setError] = useState("");
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
        if (!startTime || !endTime) return 0;
        
        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        const start = startHours * 60 + startMinutes;
        const end = endHours * 60 + endMinutes;
        const diffMinutes = end - start;
        
        return diffMinutes < 0 ? 0 : (diffMinutes / 60).toFixed(2);
    }, []);

    const handleSubmit = async (e) => {
        const decimalHours = getTotalTime(startTime, endTime)
        e.preventDefault();


        try {
            const payload = {
                student,
                tutor: tutor_id,
                date,
                startTime : startTime,
                endTime : endTime,
                totalTime : decimalHours,
                location,
                subject,
                notes,
            };
            const res = await api.post("/api/log/", payload);
        } catch (error) {
            if (error.response) {
                setError(t('errors.serverError'));
            } else if (error.request) {
                setError(t('errors.networkError'));
            } else {
                setError(t('logHours.errorLogging'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container" style={{ marginBottom: "2rem" }}>
            <h1>{t('logHours.sessionTitle')}</h1>
            <form onSubmit={handleSubmit}>
                <select
                    className="form-input"
                    value={student}
                    onChange={(e) => setStudent(e.target.value)}
                >
                    <option value="">{t('logHours.selectStudent')}</option>
                        {students.map((stud) => (
                            <option key={stud.id} value={stud.username}>
                                {stud.student}
                            </option>
                ))}
                </select>

                {/* Subject Input */}
                <input
                    className="form-input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('logHours.subject')}
                />

                {/* Grade Selection */}
                <select id="form-input" name="selectedLocation" onChange={(e) => setLocation(e.target.value)}>
                    <option value="">{t('logHours.selectLocation')}</option>
                    <option value="Online">{t('logHours.online')}</option>
                    <option value="In-Person">{t('logHours.inPerson')}</option>
                </select>

                <input
                    className="form-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder={t('common.date')}
                />

                {/* Description Input */}
                <input
                    className="form-input"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder={t('logHours.startTime')}
                />

                <input
                    className="form-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder={t('logHours.endTime')}
                />

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

            {/* Error Message */}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
});

LogHours.displayName = 'LogHours';

export default LogHours;