// src/pages/Settings.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useUser } from "../components/UserProvider";
import { ACCESS_TOKEN } from "../constants";
import api from "../api";
import TutorDocumentUpload from "../components/TutorDocumentUpload";
import NotificationSettings from "../components/NotificationSettings";
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
    try {
      await api.post("/api/referral/create/", {
        receiver_email: refEmail,
        sender_id: user.account_id,
      });
      setShowRefModal(false);
      setRefEmail("");
      loadReferrals();
    } catch (err) {
      console.error("Referral creation failed", err);
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
    if (!window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      
      await api.delete(`/api/tutor/documents/${documentId}/`);
      
      // Refresh the documents list
      loadDocuments();
      
      alert('Document deleted successfully');
    } catch (error) {
      console.error("Document deletion failed:", error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Failed to delete document';
      
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
                backgroundColor: "#ffffff",
                border: "2px solid #000000",
              }}
            />
          )}

          <div>
            <h2 className="profile-name">
              {user.firstName} {user.lastName}
            </h2>
            <p className="profile-email">{user.email}</p>
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
            <Link to="/register?role=student" className="add-child-btn">
              + Add Child
            </Link>
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
    </div>
  );
}
