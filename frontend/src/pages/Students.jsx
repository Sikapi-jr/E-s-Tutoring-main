import React, { useState, useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/Students.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ONTARIO_CITIES = [
  'Ajax', 'Aurora', 'Barrie', 'Belleville', 'Brampton', 'Brantford', 'Burlington', 'Cambridge',
  'Chatham-Kent', 'Clarington', 'Collingwood', 'Cornwall', 'Dryden', 'Georgina', 'Grimsby', 'Guelph',
  'Hamilton', 'Huntsville', 'Innisfil', 'Kawartha Lakes', 'Kenora', 'Kingston', 'Kitchener', 'Leamington',
  'London', 'Markham', 'Midland', 'Milton', 'Mississauga', 'Newmarket', 'Niagara Falls',
  'Niagara-on-the-Lake', 'North Bay', 'Oakville', 'Orangeville', 'Orillia', 'Oshawa', 'Ottawa',
  'Peterborough', 'Pickering', 'Quinte West', 'Richmond Hill', 'Sarnia', 'St. Catharines', 'St. Thomas',
  'Stratford', 'Sudbury', 'Tecumseh', 'Thunder Bay', 'Timmins', 'Toronto', 'Vaughan', 'Wasaga Beach',
  'Waterloo', 'Welland', 'Whitby', 'Windsor', 'Woodstock'
].sort();

// Turns an axios error into a specific, actionable message instead of a
// generic "please try again" - prefers whatever detail the backend sent.
const describeApiError = (err, fallback) => {
  if (!err?.response) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }

  const { status, data } = err.response;
  const backendMessage = typeof data === 'string'
    ? data
    : (data?.error || data?.detail || data?.message);

  // Unhandled server errors can come back as an HTML error page rather than
  // JSON - never show that raw markup to the user.
  const looksLikeHtml = typeof backendMessage === 'string' && backendMessage.trim().startsWith('<');

  if (backendMessage && typeof backendMessage === 'string' && !looksLikeHtml) {
    return backendMessage;
  }

  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'The requested information could not be found.';
  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.';

  return fallback;
};

const Students = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  const parent = user?.account_id;

  /* state */
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudentForChange, setSelectedStudentForChange] = useState(null);
  const [availableTutors, setAvailableTutors] = useState([]);
  const [showChangeTutorModal, setShowChangeTutorModal] = useState(false);
  
  /* edit student state */
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState({
    firstName: "",
    lastName: ""
  });
  const [profilePicture, setProfilePicture] = useState(null);

  /* add student state */
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    firstName: "",
    lastName: "",
    livesWithParent: true,
    city: "",
    birthYear: ""
  });
  const [addStudentProfilePicture, setAddStudentProfilePicture] = useState(null);

  /* fetch students for parent or all students for admin - same single-query
     pattern Settings.jsx uses (GET /api/students/) rather than piggybacking
     on the heavier /api/homeParent/ endpoint plus a per-student fan-out */
  useEffect(() => {
    if (!user) return;
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError("");

        // Admins with no parent filter get every student; parents get their own
        const params = user.is_superuser ? {} : { parent };
        const res = await api.get('/api/students/', { params });
        const studentsData = Array.isArray(res.data) ? res.data : [];

        setStudents(studentsData.map((student) => ({
          ...student,
          address: student.address || t('common.notProvided'),
          city: student.city || t('common.notProvided'),
        })));
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(describeApiError(err, t('errors.couldNotLoadStudents')));
        setStudents([]); // Set empty array to prevent undefined issues
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [user, parent, t]);

  /* redirect non-parents and non-admins */
  useEffect(() => {
    if (user && user.roles !== "parent" && !user.is_superuser) {
      navigate("/login");
    }
  }, [user, navigate]);

  /* handle change tutor functionality */
  const handleChangeTutor = async (student) => {
    try {
      setSelectedStudentForChange(student);
      // Fetch available tutors for the subject
      const tutorsRes = await api.get('/api/tutors/available/');
      setAvailableTutors(tutorsRes.data || []);
      setShowChangeTutorModal(true);
    } catch (error) {
      console.error("Error fetching available tutors:", error);
      setError(describeApiError(error, t('errors.couldNotLoadTutors')));
    }
  };

  const handleTutorChangeSubmit = async (newTutorId) => {
    if (!selectedStudentForChange || !newTutorId) return;
    
    try {
      const payload = {
        student_id: selectedStudentForChange.id,
        current_tutor_id: selectedStudentForChange.tutors[0]?.tutor_id || null,
        new_tutor_id: newTutorId,
        parent_id: parent,
        reason: "Parent requested tutor change"
      };

      await api.post('/api/tutor-change-requests/', payload);
      
      alert(t('students.tutorChangeRequestSent') || 'Tutor change request sent successfully!');
      setShowChangeTutorModal(false);
      setSelectedStudentForChange(null);
      
      // Refresh students data
      window.location.reload();
    } catch (error) {
      console.error("Error submitting tutor change request:", error);
      alert(describeApiError(error, t('errors.tutorChangeRequestFailed') || 'Failed to submit tutor change request. Please try again.'));
    }
  };

  /* handle edit student functionality */
  const handleEditStudent = (student) => {
    setSelectedStudentForEdit(student);
    setEditStudentForm({
      firstName: student.firstName || "",
      lastName: student.lastName || ""
    });
    setProfilePicture(null);
    setShowEditStudentModal(true);
  };

  const handleSaveStudentEdit = async () => {
    if (!selectedStudentForEdit) return;

    try {
      const formData = new FormData();
      formData.append("firstName", editStudentForm.firstName.trim());
      formData.append("lastName", editStudentForm.lastName.trim());

      if (profilePicture) {
        formData.append("profile_picture", profilePicture);
      }

      await api.patch(`/api/profile/${selectedStudentForEdit.id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update local state
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === selectedStudentForEdit.id
            ? {
                ...student,
                firstName: editStudentForm.firstName,
                lastName: editStudentForm.lastName
              }
            : student
        )
      );

      setShowEditStudentModal(false);
      setSelectedStudentForEdit(null);
      alert(t('students.studentUpdatedSuccessfully') || 'Student updated successfully!');

    } catch (error) {
      console.error("Error updating student:", error);
      alert(describeApiError(error, t('errors.studentUpdateFailed') || 'Failed to update student. Please try again.'));
    }
  };

  /* handle add student functionality */
  const handleAddStudent = async () => {
    // Validation
    if (!addStudentForm.firstName.trim() || !addStudentForm.lastName.trim()) {
      alert(t('students.pleaseProvideNames') || 'Please provide first and last name.');
      return;
    }

    if (!addStudentForm.livesWithParent && !addStudentForm.city.trim()) {
      alert(t('students.cityRequired') || 'Please specify which city the student lives in.');
      return;
    }

    if (!addStudentForm.birthYear) {
      alert(t('students.birthYearRequired') || 'Please provide the student\'s birth year.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append("firstName", addStudentForm.firstName.trim());
      formData.append("lastName", addStudentForm.lastName.trim());
      formData.append("livesWithParent", addStudentForm.livesWithParent);
      if (!addStudentForm.livesWithParent) {
        formData.append("city", addStudentForm.city);
      }
      formData.append("birthYear", addStudentForm.birthYear);

      if (addStudentProfilePicture) {
        formData.append("profile_picture", addStudentProfilePicture);
      }

      await api.post(`/api/students/create/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Refresh students list
      window.location.reload();

      alert(t('students.studentAddedSuccessfully') || 'Student added successfully!');

    } catch (error) {
      console.error("Error adding student:", error);
      alert(describeApiError(error, t('errors.studentAddFailed') || 'Failed to add student. Please try again.'));
    }
  };

  // Wait for user to load
  if (!user) {
    return (
      <div className="students-wrapper">
        <div className="students-card">
          <h1>{t('students.title')}</h1>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Non-parents/non-admins are redirected by the effect above
  if (user.roles !== "parent" && !user.is_superuser) {
    return null;
  }

  if (loading) {
    return (
      <div className="students-wrapper">
        <div className="students-card">
          <h1>{user.is_superuser ? t('students.adminTitle') : t('students.title')}</h1>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-wrapper">
      <div className="students-card">
        <div className="students-header-container">
          <div className="students-header-text">
            <h1 style={{ margin: 0 }}>{user.is_superuser ? t('students.adminTitle') : t('students.title')}</h1>
            <p className="students-subtitle" style={{ margin: "0.5rem 0 0 0" }}>
              {user.is_superuser ? t('students.adminSubtitle') : t('students.subtitle')}
            </p>
          </div>
          {user.roles === "parent" && students.length > 0 && (
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="add-student-header-btn"
              style={{
                backgroundColor: "#192A88",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: "500",
                whiteSpace: "nowrap"
              }}
            >
              + {t('students.addStudent')}
            </button>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        {students.length === 0 ? (
          <div className="no-students">
            <p>{t('students.noStudents')}</p>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="register-link"
              style={{
                backgroundColor: "#192A88",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500"
              }}
            >
              {t('students.addStudent')}
            </button>
          </div>
        ) : (
          <div className="students-grid">
            {students.map(student => (
              <div key={student.id} className="student-card">
                <div className="student-header">
                  <div className="student-avatar">
                    {student.profile_picture && !student.profile_picture.includes('default-profile-picture.jpeg') ? (
                      <img
                        src={student.profile_picture}
                        alt={`${student.firstName} ${student.lastName}`}
                        className="profile-picture"
                      />
                    ) : (
                      <div className="default-avatar">
                        {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="student-info">
                    <h2 className="student-name">
                      {student.firstName} {student.lastName}
                    </h2>
                    <div className="student-details">
                      <p><strong>{t('students.totalHours')}:</strong> {student.totalHours || 0} {t('common.hours')}</p>
                      {student.birth_year && (
                        <p><strong>{t('students.birthYear')}:</strong> {student.birth_year}</p>
                      )}
                      <p>
                        <strong>{t('students.livesWithParent')}:</strong>{' '}
                        {student.lives_with_parent ? t('common.yes') : `${t('common.no')} (${student.city})`}
                      </p>
                    </div>
                  </div>
                  {user.roles === "parent" && (
                    <button
                      className="edit-student-btn"
                      onClick={() => handleEditStudent(student)}
                      title={t('students.editStudent')}
                    >
                      ✏️
                    </button>
                  )}
                </div>

                <div className="student-tutors">
                  <h3>{t('students.currentTutors')}</h3>
                  {student.tutors && student.tutors.length > 0 ? (
                    <div className="tutors-list">
                      {student.tutors.map((tutorRelation, index) => (
                        <div key={index} className="tutor-item">
                          <div className="tutor-info">
                            <strong>{tutorRelation.firstName} {tutorRelation.lastName}</strong>
                            <span className="tutor-subject">{tutorRelation.subject}</span>
                          </div>
                          <div className="tutor-contact">
                            <p>{t('common.email')}: {tutorRelation.email || 'N/A'}</p>
                            <p>{t('common.phone')}: {tutorRelation.phone_number || 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <button
                          className="change-tutor-btn"
                          onClick={() => handleChangeTutor(student)}
                        >
                          {t('students.changeTutor')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="no-tutors">
                      <p>{t('students.noTutorsAssigned')}</p>
                      <a href="/request-reply" className="request-tutor-link">
                        {t('students.requestTutor')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change Tutor Modal */}
        {showChangeTutorModal && (
          <div className="modal-backdrop" onClick={() => setShowChangeTutorModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{t('students.changeTutorFor')} {selectedStudentForChange?.firstName}</h2>
              <div className="available-tutors">
                <h3>{t('students.availableTutors')}</h3>
                {availableTutors.length > 0 ? (
                  <div className="tutors-list">
                    {availableTutors.map(tutor => (
                      <div key={tutor.id} className="tutor-option">
                        <div className="tutor-details">
                          <strong>{tutor.firstName} {tutor.lastName}</strong>
                          <p>{t('common.email')}: {tutor.email}</p>
                          <p>{t('students.subjects')}: {tutor.subjects?.join(', ') || 'N/A'}</p>
                        </div>
                        <button
                          className="select-tutor-btn"
                          onClick={() => handleTutorChangeSubmit(tutor.id)}
                        >
                          {t('students.selectTutor')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{t('students.noAvailableTutors')}</p>
                )}
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setShowChangeTutorModal(false)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Edit Student Modal */}
        {showEditStudentModal && (
          <div className="modal-backdrop" onClick={() => setShowEditStudentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{t('students.editStudentInfo')} {selectedStudentForEdit?.firstName}</h2>

              <div className="edit-form">
                <div className="form-group">
                  <label>{t('common.firstName')}</label>
                  <input
                    type="text"
                    value={editStudentForm.firstName}
                    onChange={(e) => setEditStudentForm({...editStudentForm, firstName: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>{t('common.lastName')}</label>
                  <input
                    type="text"
                    value={editStudentForm.lastName}
                    onChange={(e) => setEditStudentForm({...editStudentForm, lastName: e.target.value})}
                  />
                </div>



                <div className="form-group">
                  <label>{t('students.profilePicture')}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfilePicture(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="close-modal-btn"
                  onClick={() => setShowEditStudentModal(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="save-student-btn"
                  onClick={handleSaveStudentEdit}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{t('students.addNewStudent')}</h2>
              <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                {t('students.addStudentDescription')}
              </p>

              <div className="edit-form">
                <div className="form-group">
                  <label>{t('common.firstName')} *</label>
                  <input
                    type="text"
                    value={addStudentForm.firstName}
                    onChange={(e) => setAddStudentForm({...addStudentForm, firstName: e.target.value})}
                    placeholder={t('students.enterFirstName')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('common.lastName')} *</label>
                  <input
                    type="text"
                    value={addStudentForm.lastName}
                    onChange={(e) => setAddStudentForm({...addStudentForm, lastName: e.target.value})}
                    placeholder={t('students.enterLastName')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('students.birthYear') || 'Birth Year'} *</label>
                  <input
                    type="number"
                    value={addStudentForm.birthYear}
                    onChange={(e) => setAddStudentForm({...addStudentForm, birthYear: e.target.value})}
                    placeholder={t('students.enterBirthYear') || 'e.g. 2012'}
                    min={new Date().getFullYear() - 100}
                    max={new Date().getFullYear()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('students.livesWithParent') || 'Does this student live with you?'} *</label>
                  <select
                    value={addStudentForm.livesWithParent ? 'yes' : 'no'}
                    onChange={(e) => setAddStudentForm({
                      ...addStudentForm,
                      livesWithParent: e.target.value === 'yes',
                      city: e.target.value === 'yes' ? '' : addStudentForm.city
                    })}
                    required
                  >
                    <option value="yes">{t('common.yes') || 'Yes'}</option>
                    <option value="no">{t('common.no') || 'No'}</option>
                  </select>
                </div>

                {!addStudentForm.livesWithParent && (
                  <div className="form-group">
                    <label>{t('students.studentCity') || 'City'} *</label>
                    <select
                      value={addStudentForm.city}
                      onChange={(e) => setAddStudentForm({...addStudentForm, city: e.target.value})}
                      required
                    >
                      <option value="">{t('requests.selectCity') || 'Select a city'}</option>
                      {ONTARIO_CITIES.map(cityName => (
                        <option key={cityName} value={cityName}>{cityName}</option>
                      ))}
                    </select>
                    <small style={{ color: "#666", fontSize: "0.8rem" }}>
                      {t('students.cityHelp') || "This city will be used as the student's address for tutoring requests."}
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label>{t('students.profilePicture')} ({t('common.optional')})</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAddStudentProfilePicture(e.target.files[0])}
                  />
                </div>

                <div style={{
                  backgroundColor: "#f0f4ff",
                  padding: "1rem",
                  borderRadius: "6px",
                  marginTop: "1rem",
                  border: "1px solid #192A88"
                }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#192A88" }}>
                    <strong>{t('students.autoFillNotice')}</strong><br/>
                    {addStudentForm.livesWithParent
                      ? (t('students.autoFillDescription') || "The student's address will match your own.")
                      : (t('students.autoFillDescriptionAway') || "The city you select will be used as the student's address.")}
                  </p>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  className="cancel"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setAddStudentForm({
                      firstName: "",
                      lastName: "",
                      livesWithParent: true,
                      city: "",
                      birthYear: ""
                    });
                    setAddStudentProfilePicture(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    minWidth: '150px'
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="save"
                  onClick={handleAddStudent}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#192A88',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    minWidth: '150px'
                  }}
                >
                  {t('students.addStudent')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;