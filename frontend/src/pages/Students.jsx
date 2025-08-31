import React, { useState, useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/Students.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const Students = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  // Early return if user is not loaded yet
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

  const parent = user.account_id;

  /* redirect non-parents and non-admins */
  if (user.roles !== "parent" && !user.is_superuser) {
    navigate("/login");
    return null;
  }

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

  /* fetch students for parent or all students for admin */
  useEffect(() => {
    if (!user) return;
    const fetchStudents = async () => {
      try {
        setLoading(true);
        let studentsData = [];
        
        if (user.is_superuser) {
          // For admins, we need to get all students across all parents
          // Since the API is parent-specific, we'll use the admin user's ID to try to get some data
          // This is a temporary solution - ideally there should be an admin-specific endpoint
          const res = await api.get(`/api/homeParent/?id=${user.account_id}`);
          studentsData = Array.isArray(res.data.students) ? res.data.students : [];
        } else {
          // For parents, fetch their students
          const res = await api.get(`/api/homeParent/?id=${parent}`);
          studentsData = Array.isArray(res.data.students) ? res.data.students : [];
        }
        
        // Fetch additional student details (tutors only, since user details API is not available)
        const enhancedStudents = await Promise.all(
          studentsData.map(async (student) => {
            try {
              const studentTutorsRes = await api.get(`/api/student-tutors/${student.id}/`);
              
              return {
                ...student,
                // Use existing student data or defaults since /api/users/ is not available
                profile_picture: student.profile_picture || null,
                address: student.address || t('common.notProvided'),
                city: student.city || t('common.notProvided'),
                tutors: studentTutorsRes.data || []
              };
            } catch (error) {
              console.error(`Error fetching tutors for student ${student.id}:`, error);
              return {
                ...student,
                profile_picture: student.profile_picture || null,
                address: student.address || t('common.notProvided'),
                city: student.city || t('common.notProvided'), 
                tutors: []
              };
            }
          })
        );
        
        setStudents(enhancedStudents);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(t('errors.couldNotLoadStudents'));
        setStudents([]); // Set empty array to prevent undefined issues
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [user, parent, t]);

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
      setError(t('errors.couldNotLoadTutors'));
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
      alert(t('errors.tutorChangeRequestFailed') || 'Failed to submit tutor change request. Please try again.');
    }
  };

  /* handle edit student functionality */
  const handleEditStudent = (student) => {
    setSelectedStudentForEdit(student);
    setEditStudentForm({
      firstName: student.student_firstName || "",
      lastName: student.student_lastName || ""
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
                student_firstName: editStudentForm.firstName,
                student_lastName: editStudentForm.lastName
              }
            : student
        )
      );

      setShowEditStudentModal(false);
      setSelectedStudentForEdit(null);
      alert(t('students.studentUpdatedSuccessfully') || 'Student updated successfully!');

    } catch (error) {
      console.error("Error updating student:", error);
      alert(t('errors.studentUpdateFailed') || 'Failed to update student. Please try again.');
    }
  };

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
        <h1>{user.is_superuser ? t('students.adminTitle') : t('students.title')}</h1>
        <p className="students-subtitle">{user.is_superuser ? t('students.adminSubtitle') : t('students.subtitle')}</p>

        {error && <p className="error-message">{error}</p>}

        {students.length === 0 ? (
          <div className="no-students">
            <p>{t('students.noStudents')}</p>
            <a href="/register" className="register-link">
              {t('students.registerStudent')}
            </a>
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
                        alt={`${student.student_firstName} ${student.student_lastName}`}
                        className="profile-picture"
                      />
                    ) : (
                      <div className="default-avatar">
                        {student.student_firstName?.charAt(0)}{student.student_lastName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="student-info">
                    <h2 className="student-name">
                      {student.student_firstName} {student.student_lastName}
                    </h2>
                    <div className="student-details">
                      <p><strong>Total Hours:</strong> {student.totalHours || 0} hours</p>
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
                            <strong>{tutorRelation.tutor_firstName} {tutorRelation.tutor_lastName}</strong>
                            <span className="tutor-subject">{tutorRelation.subject}</span>
                          </div>
                          <div className="tutor-contact">
                            <p>{t('common.email')}: {tutorRelation.tutor_email || 'N/A'}</p>
                            <p>{t('common.phone')}: {tutorRelation.tutor_phone || 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                      <button
                        className="change-tutor-btn"
                        onClick={() => handleChangeTutor(student)}
                      >
                        {t('students.changeTutor')}
                      </button>
                    </div>
                  ) : (
                    <div className="no-tutors">
                      <p>{t('students.noTutorsAssigned')}</p>
                      <a href="/request" className="request-tutor-link">
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
              <h2>{t('students.changeTutorFor')} {selectedStudentForChange?.student_firstName}</h2>
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
              <h2>{t('students.editStudentInfo')} {selectedStudentForEdit?.student_firstName}</h2>
              
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
      </div>
    </div>
  );
};

export default Students;