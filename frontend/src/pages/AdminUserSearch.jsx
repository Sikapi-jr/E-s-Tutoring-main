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

  // Recent users state
  const [recentTutors, setRecentTutors] = useState([]);
  const [recentParents, setRecentParents] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

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
      try {
        // Fetch recent tutors
        const tutorsRes = await api.get('/api/admin/recent-users/?role=tutor&limit=10');
        setRecentTutors(tutorsRes.data || []);

        // Fetch recent parents
        const parentsRes = await api.get('/api/admin/recent-users/?role=parent&limit=10');
        setRecentParents(parentsRes.data || []);

        // Fetch recent students
        const studentsRes = await api.get('/api/admin/recent-users/?role=student&limit=10');
        setRecentStudents(studentsRes.data || []);
      } catch (err) {
        console.error("Error fetching recent users:", err);
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

  return (
    <div className="admin-user-search">
      <div className="search-header">
        <h1>{t('admin.userSearch')}</h1>
        <p>{t('admin.userSearchDescription')}</p>
      </div>

      {/* Recent Users Tables */}
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
            <h2>{t('admin.userInformation')}</h2>
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
                </span>
              </div>
              <div className="info-item">
                <label>{t('auth.phone')}:</label>
                <span>{userInfo.phone_number || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('auth.address')}:</label>
                <span>{userInfo.address ? `${userInfo.address}, ${userInfo.city}` : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.memberSince')}:</label>
                <span>{new Date(userInfo.created_at).toLocaleDateString()}</span>
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
                      <div className="request-subject">{req.subject}</div>
                      <div className={`request-status ${req.status.toLowerCase().replace(' ', '-')}`}>
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
                      <div className="request-detail">
                        <strong>{t('dashboard.viewReplies')}:</strong> {req.reply_count} {req.reply_count === 1 ? 'reply' : 'replies'}
                      </div>
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
    </div>
  );
}