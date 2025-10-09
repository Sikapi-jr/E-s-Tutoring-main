import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { useUser } from './UserProvider';
import "../styles/Modal.css";
import "../styles/Form.css";

function RequestTutorModal({ isOpen, onClose, onSuccess }) {
    const navigate = useNavigate();
    const { user } = useUser();
    const { t } = useTranslation();
    const parent = user.account_id;
    const [student, setStudent] = useState("");
    const [students, setStudents] = useState([]);
    const [subject, setSubject] = useState("");
    const [grade, setGrade] = useState("");
    const [service, setService] = useState("");
    const [city, setCity] = useState("");
    const [description, setDescription] = useState("");
    const [tutorCode, setTutorCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await api.get(`/api/students/?parent=${parent}`);
                setStudents(response.data);
            } catch (error) {
                console.error("Error fetching students:", error);
            }
        };

        if (parent && isOpen) {
            fetchStudents();
        }
    }, [parent, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                parent,
                student,
                subject,
                grade,
                service,
                city,
                description,
                tutor_code: tutorCode || null,
            };
            const res = await api.post("/api/requests/create/", payload);

            // Reset form
            setStudent("");
            setSubject("");
            setGrade("");
            setService("");
            setCity("");
            setDescription("");
            setTutorCode("");
            setError("");

            // Show success alert
            alert(t('requests.requestSubmittedSuccess', 'Request submitted successfully!'));

            // Close modal and refresh parent component
            onSuccess && onSuccess();
            onClose();

            // Refresh the page
            window.location.reload();
        } catch (error) {
            if (error.response) {
                setError(t('errors.serverError'));
            } else if (error.request) {
                setError(t('errors.networkError'));
            } else {
                setError(t('requests.requestError'));
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>{t('requests.requestTutor')}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {students.length === 0 && (
                        <div className="no-students-message">
                            <p>{t('requests.noStudentsMessage', 'You dont have any students registered, Register a student now?')}</p>
                            <button
                                type="button"
                                className="register-student-button"
                                onClick={() => {
                                    onClose();
                                    navigate('/register');
                                }}
                            >
                                {t('requests.registerStudent', 'Register Student')}
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <select
                            className="form-input"
                            value={student}
                            onChange={(e) => setStudent(e.target.value)}
                            required
                        >
                            <option value="">{t('requests.selectStudent')}</option>
                            {students.map((stud) => (
                                <option key={stud.id} value={stud.id}>
                                    {stud.firstName} {stud.lastName}
                                </option>
                            ))}
                        </select>

                        {/* City Selection */}
                        <select className="form-input" value={city} onChange={e => setCity(e.target.value)} required>
                            <option value="">{t('requests.selectCity')}</option>
                            {[
                                'Ajax','Aurora','Barrie','Belleville','Brampton','Brantford','Burlington','Cambridge','Chatham-Kent','Clarington','Collingwood','Cornwall','Dryden','Georgina','Grimsby','Guelph','Hamilton','Huntsville','Innisfil','Kawartha Lakes','Kenora','Kingston','Kitchener','Leamington','London','Markham','Midland','Milton','Mississauga','Newmarket','Niagara Falls','Niagara-on-the-Lake','North Bay','Oakville','Orangeville','Orillia','Oshawa','Ottawa','Peterborough','Pickering','Quinte West','Richmond Hill','Sarnia','St. Catharines','St. Thomas','Stratford','Sudbury','Tecumseh','Thunder Bay','Timmins','Toronto','Vaughan','Wasaga Beach','Waterloo','Welland','Whitby','Windsor','Woodstock'
                            ].sort().map(cityName => (
                                <option key={cityName} value={cityName}>{cityName}</option>
                            ))}
                        </select>

                        {/* Subject Input */}
                        <input
                            className="form-input"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={t('dashboard.subject')}
                            required
                        />

                        {/* Grade Selection */}
                        <select className="form-input" name="selectedGrade" value={grade} onChange={(e) => setGrade(e.target.value)} required>
                            <option value="">{t('requests.selectGrade')}</option>
                            <option value="Kindergarten">{t('requests.kindergarten')}</option>
                            <option value="1">{t('requests.grade1')}</option>
                            <option value="2">{t('requests.grade2')}</option>
                            <option value="3">{t('requests.grade3')}</option>
                            <option value="4">{t('requests.grade4')}</option>
                            <option value="5">{t('requests.grade5')}</option>
                            <option value="6">{t('requests.grade6')}</option>
                            <option value="7">{t('requests.grade7')}</option>
                            <option value="8">{t('requests.grade8')}</option>
                            <option value="9">{t('requests.grade9')}</option>
                            <option value="10">{t('requests.grade10')}</option>
                            <option value="11">{t('requests.grade11')}</option>
                            <option value="12">{t('requests.grade12')}</option>
                            <option value="College">{t('requests.college')}</option>
                            <option value="University">{t('requests.university')}</option>
                        </select>

                        {/* Service Selection */}
                        <select className="form-input" name="selectedService" value={service} onChange={(e) => setService(e.target.value)} required>
                            <option value="">{t('requests.selectService')}</option>
                            <option value="Online">{t('logHours.online')}</option>
                            <option value="In-Person">{t('logHours.inPerson')}</option>
                            <option value="Both (Online & In-Person)">{t('requests.bothServices')}</option>
                        </select>

                        {/* Description Input */}
                        <input
                            className="form-input"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('requests.additionalDetails')}
                        />

                        {/* Tutor Referral Code Input (Optional) */}
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#f0f4ff',
                            borderRadius: '8px',
                            border: '2px dashed #192A88',
                            textAlign: 'center'
                        }}>
                            <p style={{
                                fontSize: '0.85rem',
                                color: '#192A88',
                                marginBottom: '0.75rem',
                                fontWeight: '500'
                            }}>
                                {t('requests.alreadyKnowTutor', 'Already know one of our tutors? Enter their unique tutor code')}
                            </p>
                            <input
                                className="form-input"
                                type="text"
                                value={tutorCode}
                                onChange={(e) => setTutorCode(e.target.value.toUpperCase())}
                                placeholder={t('requests.enterTutorCode', 'Enter 6-digit tutor code')}
                                maxLength={6}
                                style={{
                                    margin: '0 auto',
                                    maxWidth: '250px',
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                    letterSpacing: '3px',
                                    fontWeight: '700',
                                    fontSize: '1rem',
                                    border: '2px solid #192A88'
                                }}
                            />
                            <p style={{
                                marginTop: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#666',
                                fontStyle: 'italic'
                            }}>
                                {t('requests.tutorCodeOptional', 'Optional - Skip this if you don\'t have a code')}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            className="form-button"
                            type="submit"
                            disabled={loading}
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            {loading ? t('common.loading') : t('requests.readyToFindTutor')}
                        </button>

                        {/* Error Message */}
                        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default RequestTutorModal;
