// src/pages/AdminUserSearch.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/AdminUserSearch.css";

export default function AdminUserSearch() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [userHours, setUserHours] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [relationships, setRelationships] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentRequests, setCurrentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Recent users state
  const [recentTutors, setRecentTutors] = useState([]);
  const [recentParents, setRecentParents] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentUsersError, setRecentUsersError] = useState("");

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Admin gate
  if (!user.is_superuser && user.roles !== 'admin') {
    navigate("/");
    return null;
  }

  // Fetch recent users on mount
  useEffect(() => {
    const fetchRecentUsers = async () => {
      setLoadingRecent(true);
      setRecentUsersError("");
      try {
        // Fetch recent tutors
        const tutorsRes = await api.get('/api/admin/recent-users/?role=tutor&limit=10');
        console.log('Tutors response:', tutorsRes.data);
        setRecentTutors(Array.isArray(tutorsRes.data) ? tutorsRes.data : []);

        // Fetch recent parents
        const parentsRes = await api.get('/api/admin/recent-users/?role=parent&limit=10');
        console.log('Parents response:', parentsRes.data);
        setRecentParents(Array.isArray(parentsRes.data) ? parentsRes.data : []);

        // Fetch recent students
        const studentsRes = await api.get('/api/admin/recent-users/?role=student&limit=10');
        console.log('Students response:', studentsRes.data);
        setRecentStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      } catch (err) {
        console.error("Error fetching recent users:", err);
        const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to fetch recent users";
        setRecentUsersError(errorMessage);
      } finally {
        setLoadingRecent(false);
      }
    };

    fetchRecentUsers();
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get(`/api/admin/users/search/?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.users || []);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchResults([]);
    }
  };

  const handleUserSelect = async (selectedUser) => {
    setSelectedUser(selectedUser);
    setError("");
    setLoading(true);

    try {
      const response = await api.get(`/api/admin/users/${selectedUser.id}/hours/`);
      setUserInfo(response.data.user_info);
      setUserStats(response.data.stats);
      setUserHours(response.data.hours);
      setRelationships(response.data.relationships || null);
      setDocuments(response.data.documents || []);
      setCurrentRequests(response.data.current_requests || []);
      setSearchResults([]); // Hide dropdown
    } catch (err) {
      console.error("Error fetching user hours:", err);
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setUserInfo(null);
    setUserHours([]);
    setUserStats(null);
    setRelationships(null);
    setDocuments([]);
    setCurrentRequests([]);
    setError("");
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleteLoading(true);
    try {
      const response = await api.delete(`/api/admin/users/${selectedUser.id}/delete/`);
      alert(response.data.message + (response.data.children_deleted > 0 ? ` (${response.data.children_deleted} children also deleted)` : ''));
      setShowDeleteModal(false);
      clearSearch();
      // Refresh recent users lists
      window.location.reload();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="admin-user-search">
      <div className="search-header">
        <h1>{t('admin.userSearch')}</h1>
        <p>{t('admin.userSearchDescription')}</p>
      </div>

      {/* Recent Users Tables */}
      {recentUsersError && (
        <div className="error-message" style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error loading recent users:</strong> {recentUsersError}
        </div>
      )}

      {loadingRecent ? (
        <div className="loading-message">
          <p>{t('common.loading')}...</p>
        </div>
      ) : (
        <div className="recent-users-section">
          {/* Recent Tutors */}
          <div className="recent-users-table-container">
            <h3>👨‍🏫 {t('admin.recentTutors', 'Recent Tutors')} ({recentTutors.length})</h3>
            <div className="table-wrapper">
              <table className="recent-users-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.phone')}</th>
                    <th>{t('admin.students', 'Students')}</th>
                    <th>{t('admin.memberSince')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTutors.length > 0 ? (
                    recentTutors.map((tutor) => (
                      <tr key={tutor.id} onClick={() => handleUserSelect(tutor)} style={{ cursor: 'pointer' }}>
                        <td>{tutor.firstName} {tutor.lastName}</td>
                        <td>{tutor.email}</td>
                        <td>{tutor.phone_number || 'N/A'}</td>
                        <td>{tutor.student_count || 0}</td>
                        <td>{new Date(tutor.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>
                        {t('admin.noTutorsFound', 'No tutors found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Parents */}
          <div className="recent-users-table-container">
            <h3>👨‍👩‍👧‍👦 {t('admin.recentParents', 'Recent Parents')} ({recentParents.length})</h3>
            <div className="table-wrapper">
              <table className="recent-users-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.phone')}</th>
                    <th>{t('admin.children')}</th>
                    <th>{t('admin.memberSince')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentParents.length > 0 ? (
                    recentParents.map((parent) => (
                      <tr key={parent.id} onClick={() => handleUserSelect(parent)} style={{ cursor: 'pointer' }}>
                        <td>{parent.firstName} {parent.lastName}</td>
                        <td>{parent.email}</td>
                        <td>{parent.phone_number || 'N/A'}</td>
                        <td>{parent.children_count || 0}</td>
                        <td>{new Date(parent.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>
                        {t('admin.noParentsFound', 'No parents found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Students */}
          <div className="recent-users-table-container">
            <h3>👨‍🎓 {t('admin.recentStudents', 'Recent Students')} ({recentStudents.length})</h3>
            <div className="table-wrapper">
              <table className="recent-users-table">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.parent')}</th>
                    <th>{t('admin.hasTutor', 'Has Tutor?')}</th>
                    <th>{t('admin.memberSince')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.length > 0 ? (
                    recentStudents.map((student) => (
                      <tr key={student.id} onClick={() => handleUserSelect(student)} style={{ cursor: 'pointer' }}>
                        <td>{student.firstName} {student.lastName}</td>
                        <td>{student.email}</td>
                        <td>{student.parent_name || 'N/A'}</td>
                        <td>
                          {student.has_tutor ? (
                            <span style={{ color: '#28a745' }}>✅ Yes</span>
                          ) : (
                            <span style={{ color: '#dc3545' }}>❌ No</span>
                          )}
                        </td>
                        <td>{new Date(student.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>
                        {t('admin.noStudentsFound', 'No students found')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="search-section">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder={t('admin.searchUserPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={clearSearch}>
              ×
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="search-results-dropdown">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="search-result-item"
                onClick={() => handleUserSelect(user)}
              >
                <div className="user-name">{user.firstName} {user.lastName}</div>
                <div className="user-details">
                  @{user.username} • {user.roles} • {user.email}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          <p>{t('common.loading')}...</p>
        </div>
      )}

      {/* User Information Section */}
      {userInfo && (
        <div className="user-info-section">
          {/* Status Information (Top Priority) */}
          <div className="user-status-section">
            {/* Google Calendar Status */}
            {userInfo.roles !== "student" && (
              <div className="status-card google-status">
                <h3>📅 {t('calendar.googleCalendar')}</h3>
                <div className="status-indicator">
                  {userInfo.google_calendar_connected ? (
                    <span className="status-connected">✅ {t('calendar.connected')}</span>
                  ) : (
                    <span className="status-disconnected">🔌 {t('calendar.notLinked')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Stripe Payment Status */}
            {userInfo.roles === "tutor" && (
              <div className="status-card stripe-status">
                <h3>💳 {t('settings.paymentAccount')}</h3>
                <div className="status-indicator">
                  {userInfo.stripe_account_id ? (
                    <span className="status-connected">✅ {t('settings.stripeAccountConnected')}</span>
                  ) : (
                    <span className="status-disconnected">❌ {t('settings.stripeNotSetup')}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-info-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{t('admin.userInformation')}</h2>
              {!userInfo.is_superuser && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}
                >
                  🗑️ Delete User
                </button>
              )}
            </div>
            <div className="user-info-grid">
              <div className="info-item">
                <label>{t('common.name')}:</label>
                <span>{userInfo.firstName} {userInfo.lastName}</span>
              </div>
              <div className="info-item">
                <label>{t('auth.username')}:</label>
                <span>{userInfo.username}</span>
              </div>
              <div className="info-item">
                <label>{t('auth.email')}:</label>
                <span>{userInfo.email}</span>
              </div>
              <div className="info-item">
                <label>{t('auth.role')}:</label>
                <span className={`role-badge ${userInfo.roles}`}>
                  {userInfo.roles}
                  {userInfo.is_superuser && <span style={{ marginLeft: '0.5rem', color: '#dc3545' }}>👑 Admin</span>}
                </span>
              </div>
              {userInfo.roles === 'tutor' && userInfo.tutor_referral_code && (
                <div className="info-item">
                  <label>{t('admin.tutorReferralCode', 'Tutor Referral Code')}:</label>
                  <span style={{
                    fontWeight: 'bold',
                    color: '#007bff',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace'
                  }}>
                    {userInfo.tutor_referral_code}
                  </span>
                </div>
              )}
              <div className="info-item">
                <label>{t('auth.phone')}:</label>
                <span>{userInfo.phone_number || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('auth.address')}:</label>
                <span>{userInfo.address ? `${userInfo.address}, ${userInfo.city}` : 'N/A'}</span>
              </div>
              {userInfo.parent_name && (
                <div className="info-item">
                  <label>{t('auth.parent')}:</label>
                  <span>{userInfo.parent_name}</span>
                </div>
              )}
              <div className="info-item">
                <label>{t('admin.memberSince')}:</label>
                <span>{new Date(userInfo.created_at).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.lastLogin', 'Last Login')}:</label>
                <span>{userInfo.last_login ? new Date(userInfo.last_login).toLocaleString() : 'Never'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.status')}:</label>
                <span className={`status-badge ${userInfo.is_active ? 'active' : 'inactive'}`}>
                  {userInfo.is_active ? t('admin.active') : t('admin.inactive')}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {userStats && (
            <div className="user-stats-card">
              <h3>{t('admin.sessionStatistics')}</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{userStats.total_sessions}</div>
                  <div className="stat-label">{t('admin.totalSessions')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{userStats.total_hours}</div>
                  <div className="stat-label">{t('admin.totalHours')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{userStats.as_student}</div>
                  <div className="stat-label">{t('admin.asStudent')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{userStats.as_parent}</div>
                  <div className="stat-label">{t('admin.asParent')}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{userStats.as_tutor}</div>
                  <div className="stat-label">{t('admin.asTutor')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Relationships Section */}
          {relationships && (
            <div className="relationships-section">
              {/* Students (for tutors) */}
              {relationships.students && relationships.students.length > 0 && (
                <div className="relationship-card">
                  <h3>👨‍🎓 {t('admin.currentStudents')} ({relationships.students.length})</h3>
                  <div className="relationship-list">
                    {relationships.students.map((student) => (
                      <div key={student.id} className="relationship-item">
                        <div className="relationship-name">{student.name}</div>
                        <div className="relationship-email">{student.email}</div>
                        <div className="relationship-date">
                          {t('admin.since')}: {new Date(student.accepted_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tutors (for students) */}
              {relationships.tutors && relationships.tutors.length > 0 && (
                <div className="relationship-card">
                  <h3>👨‍🏫 {t('admin.currentTutors')} ({relationships.tutors.length})</h3>
                  <div className="relationship-list">
                    {relationships.tutors.map((tutor) => (
                      <div key={tutor.id} className="relationship-item">
                        <div className="relationship-name">{tutor.name}</div>
                        <div className="relationship-email">{tutor.email}</div>
                        <div className="relationship-date">
                          {t('admin.since')}: {new Date(tutor.accepted_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Children (for parents) */}
              {relationships.children && relationships.children.length > 0 && (
                <div className="relationship-card">
                  <h3>👶 {t('admin.children')} ({relationships.children.length})</h3>
                  <div className="relationship-list">
                    {relationships.children.map((child) => (
                      <div key={child.id} className="relationship-item">
                        <div className="relationship-name">{child.name}</div>
                        <div className="relationship-email">{child.email}</div>
                        <div className="relationship-date">
                          {t('admin.joinedOn')}: {new Date(child.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Current Requests Section */}
          {currentRequests && currentRequests.length > 0 && (
            <div className="requests-section">
              <h3>📋 {t('requests.currentRequests', 'Current Tutoring Requests')} ({currentRequests.length})</h3>
              <div className="requests-list">
                {currentRequests.map((req) => (
                  <div key={req.id} className="request-item">
                    <div className="request-header">
                      <div className="request-subject">
                        {req.subject}
                        {req.type === 'referral' && (
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            🔗 REFERRAL
                          </span>
                        )}
                        {req.type === 'accepted' && (
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}>
                            ✓ ACCEPTED
                          </span>
                        )}
                      </div>
                      <div className={`request-status ${String(req.status).toLowerCase().replace(' ', '-')}`}>
                        {req.status}
                      </div>
                    </div>
                    <div className="request-details">
                      {req.student_name && (
                        <div className="request-detail">
                          <strong>{t('dashboard.student')}:</strong> {req.student_name}
                        </div>
                      )}
                      {req.parent_name && (
                        <div className="request-detail">
                          <strong>{t('auth.parent')}:</strong> {req.parent_name}
                        </div>
                      )}
                      {req.tutor_name && (
                        <div className="request-detail">
                          <strong>{t('dashboard.tutor')}:</strong> {req.tutor_name}
                        </div>
                      )}
                      {req.referral_code && (
                        <div className="request-detail">
                          <strong>{t('admin.referralCodeUsed', 'Referral Code Used')}:</strong>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#007bff',
                            fontFamily: 'monospace',
                            marginLeft: '0.5rem'
                          }}>
                            {req.referral_code}
                          </span>
                        </div>
                      )}
                      <div className="request-detail">
                        <strong>{t('requests.gradeLevel')}:</strong> {req.grade}
                      </div>
                      <div className="request-detail">
                        <strong>{t('common.service')}:</strong> {req.service}
                      </div>
                      <div className="request-detail">
                        <strong>{t('common.city')}:</strong> {req.city}
                      </div>
                      <div className="request-detail">
                        <strong>{t('dashboard.createdAt')}:</strong> {new Date(req.created_at).toLocaleDateString()}
                      </div>
                      {req.accepted_at && (
                        <div className="request-detail">
                          <strong>{t('admin.acceptedAt', 'Accepted At')}:</strong> {new Date(req.accepted_at).toLocaleDateString()}
                        </div>
                      )}
                      {req.responded_at && (
                        <div className="request-detail">
                          <strong>{t('admin.respondedAt', 'Responded At')}:</strong> {new Date(req.responded_at).toLocaleDateString()}
                        </div>
                      )}
                      {req.reply_count !== undefined && (
                        <div className="request-detail">
                          <strong>{t('dashboard.viewReplies')}:</strong> {req.reply_count} {req.reply_count === 1 ? 'reply' : 'replies'}
                        </div>
                      )}
                      {req.accepted_status && (
                        <div className="request-detail">
                          <strong>{t('admin.acceptedStatus', 'Relationship Status')}:</strong>
                          <span style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: req.accepted_status === 'Accepted' ? '#28a745' : '#dc3545',
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {req.accepted_status}
                          </span>
                        </div>
                      )}
                      {req.description && (
                        <div className="request-description">
                          <strong>{t('common.description')}:</strong> {req.description}
                        </div>
                      )}
                      {req.tutor_response && (
                        <div className="request-tutor-response">
                          <strong>{t('dashboard.tutorMessage')}:</strong>
                          <div className="tutor-response-text">{req.tutor_response}</div>
                          <div className="response-date">
                            {t('replies.sentAt')}: {new Date(req.response_date).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {documents && documents.length > 0 && (
            <div className="documents-section">
              <h3>📄 {t('admin.uploadedDocuments')} ({documents.length})</h3>
              <div className="documents-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-item">
                    <div className="document-icon">📎</div>
                    <div className="document-details">
                      <div className="document-title">{doc.title}</div>
                      <div className="document-meta">
                        <span className="document-type">{doc.document_type}</span>
                        <span className="document-date">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="document-filename">{doc.file_name}</div>
                    </div>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-download"
                      >
                        {t('admin.download')} ⬇
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hours List */}
      {userHours.length > 0 && (
        <div className="hours-section">
          <h3>{t('admin.allSessions')} ({userHours.length})</h3>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Showing all sessions involving this user as student, parent, or tutor
          </p>
          <div className="hours-list">
            {userHours.map((hour) => (
              <div key={hour.id} className="hour-card">
                <div className="hour-header">
                  <div className="hour-date">{hour.date}</div>
                  <div className="hour-time">
                    {hour.startTime} - {hour.endTime} ({hour.totalTime}h)
                  </div>
                </div>
                <div className="hour-details">
                  <div className="hour-participants">
                    <div className="participant">
                      <strong>{t('dashboard.student')}:</strong> {hour.student_firstName} {hour.student_lastName}
                    </div>
                    <div className="participant">
                      <strong>{t('auth.parent')}:</strong> {hour.parent_firstName} {hour.parent_lastName}
                    </div>
                    <div className="participant">
                      <strong>{t('dashboard.tutor')}:</strong> {hour.tutor_firstName} {hour.tutor_lastName}
                    </div>
                  </div>
                  <div className="hour-session-info">
                    <div className="session-detail">
                      <strong>{t('logHours.subject')}:</strong> {hour.subject}
                    </div>
                    <div className="session-detail">
                      <strong>{t('requests.location')}:</strong> {hour.location}
                    </div>
                    <div className="session-detail">
                      <strong>{t('admin.recordCreatedAt', 'Record Created')}:</strong>{' '}
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>
                        {new Date(hour.created_at).toLocaleString()}
                      </span>
                    </div>
                    {hour.edited_at && (
                      <div className="session-detail">
                        <strong>{t('admin.recordEditedAt', 'Last Edited')}:</strong>{' '}
                        <span style={{ color: '#f0ad4e', fontSize: '0.9rem' }}>
                          {new Date(hour.edited_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {hour.notes && (
                      <div className="session-detail">
                        <strong>{t('logHours.notes')}:</strong> {hour.notes}
                      </div>
                    )}
                  </div>
                </div>
                {hour.has_disputes && (
                  <div className="dispute-indicator">
                    ⚠️ {t('admin.hasDisputes')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedUser && userHours.length === 0 && !loading && (
        <div className="no-hours-message">
          <p>{t('admin.noSessionsFound')}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#dc3545' }}>
              ⚠️ Delete User
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Are you sure you want to delete <strong>{userInfo?.firstName} {userInfo?.lastName}</strong> ({userInfo?.email})?
            </p>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Role: <strong>{userInfo?.roles}</strong>
            </p>
            {userInfo?.roles === 'parent' && relationships?.children?.length > 0 && (
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '1px solid #ffc107'
              }}>
                <strong>⚠️ Warning:</strong> This parent has {relationships.children.length} student(s) who will also be deleted:
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                  {relationships.children.map(child => (
                    <li key={child.id}>{child.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <p style={{
              backgroundColor: '#f8d7da',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              color: '#721c24'
            }}>
              <strong>This action cannot be undone!</strong> All associated data (hours, requests, documents) will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {deleteLoading ? 'Deleting...' : '🗑️ Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}