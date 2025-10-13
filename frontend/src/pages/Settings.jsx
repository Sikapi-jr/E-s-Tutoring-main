// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useUser } from "../components/UserProvider";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import TutorDocumentUpload from "../components/TutorDocumentUpload";
import NotificationSettings from "../components/NotificationSettings";
import { refreshUserDataIfNeeded } from "../utils/refreshUserData";
// Using standard media URLs served by Django
import "../styles/Settings.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Settings() {
  const { t } = useTranslation();
  const { user, setUser } = useUser();

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const [children, setChildren] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [documents, setDocuments] = useState([]);
  // No longer need separate state for image src since it's served directly

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    address: user.address || "",
    city: user.city || "",
  });

  const [showRefModal, setShowRefModal] = useState(false);
  const [refEmail, setRefEmail] = useState("");

  // Add student modal state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [addStudentProfilePicture, setAddStudentProfilePicture] = useState(null);

  // Refresh user data if needed (e.g., missing tutor_referral_code for tutors)
  useEffect(() => {
    refreshUserDataIfNeeded(user, setUser);
  }, [user, setUser]);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (user.roles !== "student" && token) {
      api
        .get(`/api/google/status/?id=${user.account_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setIsConnected(res.data.connected))
        .catch((err) => {
          console.error("Google status check failed:", err);
          setIsConnected(false);
        });
    }
  }, [user.roles, user.account_id]);

  useEffect(() => {
    if (user.roles === "parent") {
      (async () => {
        try {
          const res = await api.get(`/api/students/?parent=${user.account_id}`);
          setChildren(
            (Array.isArray(res.data) ? res.data : []).map((s) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              email: s.email,
            }))
          );
        } catch (err) {
          console.error("Failed to load students", err);
          setChildren([]);
        }
      })();
    }
  }, [user.account_id, user.roles]);

  const loadReferrals = () => {
    if (user.roles === "parent") {
      api
        .get(`/api/referral/list/?id=${user.account_id}`)
        .then((res) => setReferrals(Array.isArray(res.data) ? res.data : []))
        .catch((err) => {
          console.error("Failed to load referrals", err);
          setReferrals([]);
        });
    }
  };
  useEffect(loadReferrals, [user.account_id, user.roles]);

  // Profile images are now served directly from frontend public directory

  // Load documents for tutors
  const loadDocuments = () => {
    if (user.roles === "tutor") {
      api
        .get(`/api/tutor/documents/?id=${user.account_id}`)
        .then((res) => setDocuments(Array.isArray(res.data) ? res.data : []))
        .catch((err) => {
          console.error("Failed to load documents", err);
          setDocuments([]);
        });
    }
  };
  useEffect(loadDocuments, [user.account_id, user.roles]);

  const saveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append("firstName", editForm.firstName.trim());
      formData.append("lastName", editForm.lastName.trim());
      formData.append("address", editForm.address.trim());
      formData.append("city", editForm.city.trim());
      if (profilePicture) {
        formData.append("profile_picture", profilePicture);
      }

      const response = await api.patch(`/api/profile/${user.account_id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = { ...user, ...editForm };
      // Update profile picture if response contains it
      if (response.data?.profile_picture) {
        updatedUser.profile_picture = response.data.profile_picture;
      }
      setUser?.(updatedUser);
      setShowEdit(false);
      setProfilePicture(null); // Reset file input
    } catch (err) {
      console.error("Profile update failed", err);
    }
  };

  const createReferral = async () => {
    // Validate email contains @
    if (!refEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      await api.post("/api/referral/create/", {
        receiver_email: refEmail,
        sender_id: user.account_id,
      });
      setShowRefModal(false);
      setRefEmail("");
      loadReferrals();
      alert(t('settings.referralSent', 'Referral sent successfully!'));
    } catch (err) {
      console.error("Referral creation failed", err);
      alert(t('settings.referralFailed', 'Failed to send referral'));
    }
  };

  const handleGoogleConnect = () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    window.location.href = `${API_BASE_URL}/api/google/oauth/init?token=${token}`;
  };

  const handleDocumentUpload = (uploadedDoc) => {
    loadDocuments(); // Refresh the documents list
  };

  const handleDocumentDelete = async (documentId, documentName) => {
    if (!window.confirm(t('settings.confirmDeleteDocument', { name: documentName }))) {
      return;
    }

    try {

      await api.delete(`/api/tutor/documents/${documentId}/`);

      // Refresh the documents list
      loadDocuments();

      alert(t('settings.documentDeletedSuccess'));
    } catch (error) {
      console.error("Document deletion failed:", error);

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          'Failed to delete document';

      alert(errorMessage);
    }
  };

  const handleAddStudent = async () => {
    // Validation
    if (!addStudentForm.firstName.trim() || !addStudentForm.lastName.trim()) {
      alert(t('students.pleaseProvideNames') || 'Please provide first and last name.');
      return;
    }

    if (!addStudentForm.username.trim() || addStudentForm.username.length < 3) {
      alert(t('students.usernameRequired') || 'Username must be at least 3 characters.');
      return;
    }

    if (!addStudentForm.password.trim() || addStudentForm.password.length < 6) {
      alert(t('students.passwordMinLength') || 'Password must be at least 6 characters.');
      return;
    }

    if (addStudentForm.password !== addStudentForm.confirmPassword) {
      alert(t('students.passwordsMustMatch') || 'Passwords do not match.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append("firstName", addStudentForm.firstName.trim());
      formData.append("lastName", addStudentForm.lastName.trim());
      formData.append("username", addStudentForm.username.trim());
      formData.append("password", addStudentForm.password);

      if (addStudentProfilePicture) {
        formData.append("profile_picture", addStudentProfilePicture);
      }

      await api.post(`/api/students/create/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Refresh the page to show the new student
      window.location.reload();

      alert(t('students.studentAddedSuccessfully') || 'Student added successfully!');

    } catch (error) {
      console.error("Error adding student:", error);
      const errorMessage = error.response?.data?.error ||
                           error.response?.data?.message ||
                           t('errors.studentAddFailed') || 'Failed to add student. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <div className="settings-wrapper">
      <h1 className="settings-title">Settings</h1>

      {/* ===== profile ===== */}
      <section className="profile-card">
        <div
          className="profile-head"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt="Profile"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #ccc",
              }}
            />
          ) : (
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                border: "2px solid #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: "50px",
                  height: "50px",
                  fill: "#666"
                }}
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>
          )}

          <div>
            <h2 className="profile-name">
              {user.firstName} {user.lastName}
            </h2>
            <p className="profile-email">{user.email}</p>
            <p className="profile-username" style={{ color: "#666", fontSize: "0.9rem", margin: "0.25rem 0" }}>
              Username: {user.username}
            </p>
            <span className="role-badge">{user.roles}</span>
          </div>
        </div>

        {(user.address || user.city) && (
          <div className="profile-address">
            {user.address && <p>{user.address}</p>}
            {user.city && <p>{user.city}</p>}
          </div>
        )}

        {/* ===== Rate Display (Parents and Tutors Only) ===== */}
        {(user.roles === "parent" || user.roles === "tutor") && (
          <div className="rate-display">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{t('settings.currentRates')}</h4>
            <div style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
              <div>
                <span style={{ fontWeight: "bold" }}>{t('settings.onlineRate')}:</span> ${user.rateOnline || 0}/hr
              </div>
              <div>
                <span style={{ fontWeight: "bold" }}>{t('settings.inPersonRate')}:</span> ${user.rateInPerson || 0}/hr
              </div>
            </div>
          </div>
        )}

        {/* ===== Referral Credit Display (Parents and Tutors Only) ===== */}
        {(user.roles === "parent" || user.roles === "tutor") && user.availableReferralCredit > 0 && (
          <div className="referral-credit-display">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{t('settings.referralCredits')}</h4>
            <div style={{ fontSize: "0.9rem", color: "#28a745" }}>
              <span style={{ fontWeight: "bold" }}>${user.availableReferralCredit || 0}</span> {t('settings.creditAvailable')}
            </div>
          </div>
        )}

        {/* ===== Stripe Account Status (Tutors Only) ===== */}
        {user.roles === "tutor" && (
          <div className="stripe-status-display">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{t('settings.paymentAccount')}</h4>
            {!user.stripe_account_id ? (
              <div style={{ 
                backgroundColor: "#fff3cd", 
                border: "1px solid #ffeaa7", 
                borderRadius: "6px", 
                padding: "1rem", 
                marginBottom: "1rem" 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>💳</span>
                  <span style={{ fontWeight: "bold", color: "#856404" }}>{t('settings.stripeNotSetup')}</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#856404", margin: "0 0 1rem 0" }}>
                  {t('settings.stripeSetupRequired')}
                </p>
                <button
                  onClick={() => alert(t('settings.checkEmailStripe'))}
                  style={{
                    backgroundColor: "#192A88",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "bold"
                  }}
                >
                  {t('settings.setupStripeAccount')}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: "0.9rem", color: "#28a745", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>✅</span>
                <span>{t('settings.stripeAccountConnected')}</span>
              </div>
            )}
          </div>
        )}

        {/* ===== Tutor Referral Code (Tutors Only) ===== */}
        {user.roles === "tutor" && user.tutor_referral_code && (
          <div className="tutor-referral-code-display">
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>{t('settings.yourTutorCode')}</h4>
            <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "0.75rem" }}>
              {t('settings.tutorCodeDescription')}
            </p>
            <div style={{
              backgroundColor: "#f0f4ff",
              border: "2px solid #192A88",
              borderRadius: "8px",
              padding: "1rem",
              textAlign: "center"
            }}>
              <div style={{
                fontSize: "2rem",
                fontWeight: "700",
                letterSpacing: "5px",
                color: "#192A88",
                fontFamily: "monospace"
              }}>
                {user.tutor_referral_code}
              </div>
            </div>
          </div>
        )}

        <button className="edit-btn" onClick={() => setShowEdit(true)}>
          EDIT PROFILE
        </button>
      </section>


      {/* ===== Google Calendar Status ===== */}
      {user.roles !== "student" && (
        <section className="google-status-box">
          <h3>Google Account</h3>
          {!isConnected ? (
            <>
              <p>🔌 You haven't linked your Google Calendar.</p>
              <button className="form-button" onClick={handleGoogleConnect}>
                Connect Google Account
              </button>
            </>
          ) : (
            <p>✅ Google Calendar is connected!</p>
          )}
        </section>
      )}

      {/* ===== Password Reset ===== */}
      <section className="password-reset-section">
        <h3>{t('settings.passwordReset')}</h3>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          {t('settings.passwordResetDescription')}
        </p>
        <button 
          className="form-button"
          onClick={() => window.open('https://egstutoring-portal.ca/password-reset', '_blank')}
        >
          {t('settings.resetPassword')}
        </button>
      </section>

      {/* ===== Email Notification Settings ===== */}
      <NotificationSettings />

      {/* ===== Document Upload (only for tutors) ===== */}
      {user.roles === "tutor" && (
        <section className="documents-section">
          <h3>{t('settings.documents')}</h3>
          <TutorDocumentUpload onUpload={handleDocumentUpload} />
          
          {documents.length > 0 && (
            <div className="documents-list">
              <h4>{t('settings.uploadedDocuments')}</h4>
              <ul>
                {documents.map((doc) => (
                  <li key={doc.id} className="document-item">
                    <div className="document-info">
                      <a 
                        href={`${API_BASE_URL}${doc.file}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        📄 {doc.file.split('/').pop()} 
                      </a>
                      <span className="upload-date">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDocumentDelete(doc.id, doc.file.split('/').pop())}
                      className="delete-btn"
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ===== children & referrals (only for parents) ===== */}
      {user.roles === "parent" && (
        <>
          <div className="children-header">
            <h3>CHILDREN</h3>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="add-child-btn"
            >
              + Add Child
            </button>
          </div>

          {children.length === 0 ? (
            <section className="children-empty-card">
              <p>No Children accounts made</p>
            </section>
          ) : (
            <ul className="children-list">
              {children.map((c) => (
                <li key={c.id} className="child-card">
                  <div className="avatar sm" />
                  <div className="child-info">
                    <strong>{c.name}</strong>
                    <span className="email">{c.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="referrals-header">
            <h3>MY REFERRALS</h3>
            <button
              className="add-referral-btn"
              onClick={() => setShowRefModal(true)}
            >
              + Add Referral
            </button>
          </div>

          <section className="referral-card" style={{ maxHeight: "200px", overflowY: "auto" }}>
            {referrals.length === 0 ? (
              <p>No referrals yet.</p>
            ) : (
              <ul className="referral-list">
                {referrals.map((r) => (
                  <li key={r.id} className="referral-item">
                    <span>
                      {r.prospective_email ||
                        (r.referred && r.referred.email) ||
                        "—"}
                    </span>
                    <span className="date">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className={r.reward_given ? "reward yes" : "reward no"}>
                      {r.reward_given ? "✅ Applied" : "❌ Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* ===== edit-profile modal ===== */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Profile</h2>
            {["firstName", "lastName", "address", "city"].map((f) => (
              <label key={f}>
                {f.replace(/^\w/, (c) => c.toUpperCase())}
                <input
                  type="text"
                  name={f}
                  value={editForm[f]}
                  onChange={(e) =>
                    setEditForm({ ...editForm, [f]: e.target.value })
                  }
                />
              </label>
            ))}

            <label>
              Profile Picture
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files[0])}
              />
            </label>

            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button className="save" onClick={saveProfile}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== add-referral modal ===== */}
      {showRefModal && (
        <div className="modal-backdrop" onClick={() => setShowRefModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Send Referral</h2>
            <label>
              Receiver Email
              <input
                type="email"
                value={refEmail}
                onChange={(e) => setRefEmail(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowRefModal(false)}>
                Cancel
              </button>
              <button className="save" onClick={createReferral}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== add-student modal ===== */}
      {showAddStudentModal && (
        <div className="modal-backdrop" onClick={() => setShowAddStudentModal(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              maxWidth: '600px'
            }}
          >
            <h2>{t('students.addNewStudent')}</h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              {t('students.addStudentDescription')}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('common.firstName')} *
              </label>
              <input
                type="text"
                value={addStudentForm.firstName}
                onChange={(e) => setAddStudentForm({...addStudentForm, firstName: e.target.value})}
                placeholder={t('students.enterFirstName')}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('common.lastName')} *
              </label>
              <input
                type="text"
                value={addStudentForm.lastName}
                onChange={(e) => setAddStudentForm({...addStudentForm, lastName: e.target.value})}
                placeholder={t('students.enterLastName')}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('common.username')} *
              </label>
              <input
                type="text"
                value={addStudentForm.username}
                onChange={(e) => setAddStudentForm({...addStudentForm, username: e.target.value})}
                placeholder={t('students.enterUsername')}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: "#666", fontSize: "0.8rem", display: 'block', marginTop: '0.25rem' }}>
                {t('students.usernameHelp')}
              </small>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('common.password')} *
              </label>
              <input
                type="password"
                value={addStudentForm.password}
                onChange={(e) => setAddStudentForm({...addStudentForm, password: e.target.value})}
                placeholder={t('students.enterPassword')}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: "#666", fontSize: "0.8rem", display: 'block', marginTop: '0.25rem' }}>
                {t('students.passwordHelp')}
              </small>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('students.confirmPassword')} *
              </label>
              <input
                type="password"
                value={addStudentForm.confirmPassword}
                onChange={(e) => setAddStudentForm({...addStudentForm, confirmPassword: e.target.value})}
                placeholder={t('students.confirmPasswordPlaceholder')}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('students.profilePicture')} ({t('common.optional')})
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAddStudentProfilePicture(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{
              backgroundColor: "#f0f4ff",
              padding: "1rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              border: "1px solid #192A88"
            }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#192A88" }}>
                <strong>{t('students.autoFillNotice')}</strong><br/>
                {t('students.autoFillDescription')}
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="cancel"
                onClick={() => {
                  setShowAddStudentModal(false);
                  setAddStudentForm({
                    firstName: "",
                    lastName: "",
                    username: "",
                    password: "",
                    confirmPassword: ""
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
                  fontWeight: '500'
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
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                {t('students.addStudent')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
