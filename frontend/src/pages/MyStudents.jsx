import React, { useState, useEffect } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/Students.css";

const MyStudents = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div className="students-wrapper">
        <div className="students-card">
          <h1>{t('myStudents.title')}</h1>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Redirect non-tutors
  if (user.roles !== "tutor" && !user.is_superuser) {
    navigate("/login");
    return null;
  }

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudentForLeave, setSelectedStudentForLeave] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  // Fetch tutor's students
  useEffect(() => {
    if (!user) return;
    const fetchMyStudents = async () => {
      try {
        setLoading(true);
        // Get tutor's students from the TutorStudents API
        const studentsRes = await api.get('/api/TutorStudents/', { 
          params: { tutor: user.account_id } 
        });
        
        // Enhance student data with additional details if needed
        const enhancedStudents = await Promise.all(
          (studentsRes.data || []).map(async (studentRelation) => {
            try {
              // Get additional student details if needed
              return {
                ...studentRelation,
                // Add any additional student data processing here
                tutorStudentId: studentRelation.id, // Store the relation ID for deletion
              };
            } catch (error) {
              console.error(`Error fetching details for student ${studentRelation.student}:`, error);
              return {
                ...studentRelation,
                tutorStudentId: studentRelation.id,
              };
            }
          })
        );
        
        setStudents(enhancedStudents);
      } catch (err) {
        console.error("Error fetching my students:", err);
        setError(t('errors.couldNotLoadStudents'));
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMyStudents();
  }, [user, t]);

  // Handle leaving a student
  const handleLeaveStudent = (student) => {
    setSelectedStudentForLeave(student);
    setLeaveReason("");
    setShowLeaveModal(true);
  };

  const handleLeaveSubmit = async () => {
    if (!selectedStudentForLeave || !leaveReason.trim()) {
      alert(t('myStudents.pleaseProvideReason'));
      return;
    }

    try {
      const payload = {
        tutor_id: user.account_id,
        student_id: selectedStudentForLeave.student,
        parent_id: selectedStudentForLeave.parent,
        reason: leaveReason.trim(),
        tutor_student_relation_id: selectedStudentForLeave.tutorStudentId,
        request_id: selectedStudentForLeave.request || null
      };

      // Call API to handle tutor leaving student
      await api.post('/api/tutor-leave-student/', payload);
      
      alert(t('myStudents.leftStudentSuccessfully'));
      setShowLeaveModal(false);
      setSelectedStudentForLeave(null);
      
      // Remove the student from local state
      setStudents(prevStudents => 
        prevStudents.filter(s => s.tutorStudentId !== selectedStudentForLeave.tutorStudentId)
      );
      
    } catch (error) {
      console.error("Error leaving student:", error);
      const errorMessage = error.response?.data?.error || 
                           error.response?.data?.message || 
                           t('errors.leavingStudentFailed');
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="students-wrapper">
        <div className="students-card">
          <h1>{t('myStudents.title')}</h1>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-wrapper">
      <div className="students-card">
        <h1>{t('myStudents.title')}</h1>
        <p className="students-subtitle">{t('myStudents.subtitle')}</p>

        {error && <p className="error-message">{error}</p>}

        {students.length === 0 ? (
          <div className="no-students">
            <p>{t('myStudents.noStudents')}</p>
            <p>{t('myStudents.waitForAssignment')}</p>
          </div>
        ) : (
          <div className="students-grid">
            {students.map(studentRelation => (
              <div key={studentRelation.tutorStudentId} className="student-card">
                <div className="student-header">
                  <div className="student-avatar">
                    {studentRelation.profile_picture && !studentRelation.profile_picture.includes('default-profile-picture.jpeg') ? (
                      <img
                        src={studentRelation.profile_picture}
                        alt={`${studentRelation.student_firstName} ${studentRelation.student_lastName}`}
                        className="profile-picture"
                      />
                    ) : (
                      <div className="default-avatar">
                        {studentRelation.student_firstName?.charAt(0)}{studentRelation.student_lastName?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="student-info">
                    <h2 className="student-name">
                      {studentRelation.student_firstName || 'Unknown'} {studentRelation.student_lastName || ''}
                    </h2>
                    <div className="student-details">
                      <p><strong>{t('common.subject')}:</strong> {studentRelation.subject || 'N/A'}</p>
                      <p><strong>{t('myStudents.parentName')}:</strong> {studentRelation.parent_firstName || 'Unknown'} {studentRelation.parent_lastName || ''}</p>
                      <p><strong>{t('common.email')}:</strong> {studentRelation.parent_email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="student-actions">
                  <button
                    className="leave-student-btn"
                    onClick={() => handleLeaveStudent(studentRelation)}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      marginTop: "1rem",
                      width: "100%"
                    }}
                  >
                    {t('myStudents.leaveStudent')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leave Student Modal */}
        {showLeaveModal && (
          <div className="modal-backdrop" onClick={() => setShowLeaveModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{t('myStudents.leaveStudentConfirm')} {selectedStudentForLeave?.student_firstName}?</h2>
              <p style={{ color: "#666", marginBottom: "1rem" }}>
                {t('myStudents.leaveStudentWarning')}
              </p>
              
              <div className="form-group">
                <label>{t('myStudents.reasonForLeaving')} *</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder={t('myStudents.reasonPlaceholder')}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "0.9rem",
                    resize: "vertical"
                  }}
                  required
                />
              </div>
              
              <div className="modal-actions" style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowLeaveModal(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="confirm-leave-btn"
                  onClick={handleLeaveSubmit}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  disabled={!leaveReason.trim()}
                >
                  {t('myStudents.confirmLeave')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyStudents;