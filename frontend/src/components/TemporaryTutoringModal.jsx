// src/components/TemporaryTutoringModal.jsx
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from './UserProvider';
import "../styles/Form.css";

export default function TemporaryTutoringModal({ isOpen, onClose, onSuccess, onBack }) {
    const { t } = useTranslation();
    const { user } = useUser();

    const tutor_id = user?.account_id;
    const [studentUsername, setStudentUsername] = useState("");
    const [subject, setSubject] = useState("");
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [location, setLocation] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const getTotalTime = useCallback((startTime, endTime) => {
        if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') return 0;

        const [startHours, startMinutes] = startTime.split(":").map(Number);
        const [endHours, endMinutes] = endTime.split(":").map(Number);

        const start = startHours * 60 + startMinutes;
        const end = endHours * 60 + endMinutes;
        const diffMinutes = end - start;

        return diffMinutes < 0 ? 0 : (diffMinutes / 60).toFixed(2);
    }, []);

    // Format date as yyyy-mm-dd
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getCurrentWeekRange = useCallback(() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysFromMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return {
            min: startOfWeek.toISOString().split('T')[0],
            max: endOfWeek.toISOString().split('T')[0]
        };
    }, []);

    const validateForm = () => {
        if (!studentUsername.trim()) return "Student username is required";
        if (!subject.trim()) return t('logHours.subjectRequired');
        if (!location) return t('logHours.locationRequired');
        if (!date) return t('logHours.dateRequired');
        if (!startTime) return t('logHours.startTimeRequired');
        if (!endTime) return t('logHours.endTimeRequired');
        if (!notes.trim()) return t('logHours.notesRequired');

        const totalHours = parseFloat(getTotalTime(startTime, endTime));
        if (totalHours <= 0) return t('logHours.invalidTimeRange');
        if (totalHours > 8) return t('logHours.sessionTooLong');

        // Parse date in local timezone, not UTC
        const [year, month, day] = date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (selectedDate > today) return t('logHours.futureDate');

        const currentDate = new Date();
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(currentDate.getDate() - daysFromMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        if (selectedDate < startOfWeek || selectedDate > endOfWeek) {
            return t('logHours.currentWeekOnly') + ' (' +
                   formatDate(startOfWeek) + ' - ' + formatDate(endOfWeek) + ')';
        }

        // Create session end datetime in local timezone
        const sessionDateTime = new Date(year, month - 1, day);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        sessionDateTime.setHours(endHours, endMinutes, 0, 0);
        const now = new Date();
        if (sessionDateTime > now) return t('logHours.futureEndTime');

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const decimalHours = getTotalTime(startTime, endTime);
            const payload = {
                student_username: studentUsername.trim(),
                tutor: tutor_id,
                date,
                start_time: startTime,
                end_time: endTime,
                totalTime: decimalHours,
                location,
                subject,
                notes,
            };
            await api.post("/api/log-temporary/", payload);

            setSuccessMessage(t('logHours.hoursAddedSuccess', { hours: decimalHours, student: studentUsername }));

            // Clear form
            setStudentUsername("");
            setSubject("");
            setDate(new Date().toISOString().split('T')[0]);
            setStartTime("");
            setEndTime("");
            setLocation("");
            setNotes("");

            // Call success callback to refresh parent data
            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                    setSuccessMessage("");
                    onClose();
                }, 1500);
            }

        } catch (error) {
            console.error('Error logging temporary tutoring hours:', error);

            if (error.response?.data) {
                const errorMessage = error.response.data.detail || error.response.data.message;

                if (typeof errorMessage === 'string') {
                    if (errorMessage.includes('Student with username') && errorMessage.includes('not found')) {
                        setError('Student with username "' + studentUsername + '" not found. Please check the username and try again.');
                    } else if (errorMessage.includes('Cannot log hours for future dates/times')) {
                        setError(t('logHours.cannotLogFuture'));
                    } else if (errorMessage.includes('Cannot log hours that end in the future')) {
                        setError(t('logHours.endTimeCannotBeFuture'));
                    } else if (errorMessage.includes('Can only log hours for the current week')) {
                        setError(t('logHours.currentWeekOnly'));
                    } else if (errorMessage.includes('Hours already logged for this tutor, student, date, and time slot')) {
                        setError(t('logHours.duplicateEntry'));
                    } else {
                        setError(errorMessage);
                    }
                } else {
                    setError(t('logHours.failedToLog'));
                }
            } else {
                setError(t('logHours.failedToLog'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError("");
        setSuccessMessage("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>Log Temporary Tutoring Hours</h2>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <input
                            className="form-input"
                            type="text"
                            value={studentUsername}
                            onChange={(e) => setStudentUsername(e.target.value)}
                            placeholder="Student Username (exact match required)"
                        />

                        <div className="form-row">
                            <input
                                className="form-input"
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder={t('logHours.subject')}
                            />

                            <select className="form-input" value={location} onChange={(e) => setLocation(e.target.value)}>
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
                            title={t('logHours.currentWeekOnly')}
                        />

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

                        <button className="form-button" type="submit" disabled={loading}>
                            {loading ? t('common.loading') : t('logHours.logHoursButton')}
                        </button>

                        <button
                            type="button"
                            className="form-button"
                            onClick={onBack}
                            style={{
                                marginTop: '0.5rem',
                                backgroundColor: '#6c757d',
                                border: 'none'
                            }}
                        >
                            ← Back to Regular Hours
                        </button>
                    </form>

                    {successMessage && (
                        <div className="success-message" style={{ color: 'green', marginTop: '1rem' }}>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
                </div>
            </div>
        </div>
    );
}
