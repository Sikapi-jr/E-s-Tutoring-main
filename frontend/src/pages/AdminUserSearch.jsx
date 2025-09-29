// src/pages/AdminUserSearch.jsx
import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    setError("");
  };

  return (
    <div className="admin-user-search">
      <div className="search-header">
        <h1>{t('admin.userSearch')}</h1>
        <p>{t('admin.userSearchDescription')}</p>
      </div>

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