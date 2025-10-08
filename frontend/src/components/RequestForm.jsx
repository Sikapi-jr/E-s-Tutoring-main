    import { useState, useEffect } from "react";
    import { useTranslation } from "react-i18next";
    import api from "../api";
    import { useNavigate } from "react-router-dom";
    import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
    import { useUser } from './UserProvider';
    import "../styles/Form.css";

    function RequestForm() {
        const navigate = useNavigate();
        const { user } = useUser();
        const { t } = useTranslation();
        const parentUser = user.username;
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
        const [users, setUsers] = useState([]); // Store user list

        if (user.roles !== 'parent'){
            navigate('/login');
        }


        useEffect(() => {
            const fetchStudents = async () => {
            try {
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
                    tutor_code: tutorCode || null,  // Include tutor code if provided
                };
                const res = await api.post("/api/requests/create/", payload);
                
                // Redirect to view reply page after successful request
                navigate("/request-reply");
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

        return (
            <div className="form-container">
                <h1>{t('requests.requestTutor')}</h1>
                
                {/* No Students Message */}
                {students.length === 0 && (
                    <div className="no-students-message">
                        <p>{t('requests.noStudentsMessage', 'You dont have any students registered, Register a student now?')}</p>
                        <button 
                            type="button" 
                            className="register-student-button"
                            onClick={() => navigate('/register')}
                        >
                            {t('requests.registerStudent', 'Register Student')}
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <select
                        className="form-input"
                        value={student}
                        onChange={(e) => {
                            setStudent(e.target.value);
                        }}
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
                    />

                    {/* Grade Selection */}
                    <select className="form-input" name="selectedGrade" onChange={(e) => setGrade(e.target.value)}>
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
                    <select className="form-input" name="selectedService" onChange={(e) => setService(e.target.value)}>
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

                    {/* Submit Button */}
                    <button className="form-button" type="submit" disabled={loading}>
                        {t('requests.readyToFindTutor')}
                    </button>

                    {/* Tutor Referral Code Input at Bottom (Optional) */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.25rem',
                        backgroundColor: '#f0f4ff',
                        borderRadius: '8px',
                        border: '2px dashed #192A88',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: '0.95rem',
                            color: '#192A88',
                            marginBottom: '1rem',
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
                                maxWidth: '300px',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '3px',
                                fontWeight: '700',
                                fontSize: '1.1rem',
                                border: '2px solid #192A88'
                            }}
                        />
                        <p style={{
                            marginTop: '0.75rem',
                            fontSize: '0.8rem',
                            color: '#666',
                            fontStyle: 'italic'
                        }}>
                            {t('requests.tutorCodeOptional', 'Optional - Skip this if you don\'t have a code')}
                        </p>
                    </div>
                </form>

                {/* Error Message */}
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }

    export default RequestForm;

