// src/pages/ParentDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import "../styles/TutorDashboard.css";

const ParentDashboard = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const { user } = useUser();
  const navigate = useNavigate();
  const [tutorDocuments, setTutorDocuments] = useState([]);

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('dashboard.parentDashboard')}</h1>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const tutor = user.username;

  const [showReplyBox, setShowReplyBox] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedRequestID, setSelectedRequestID] = useState(null);

  // Filters
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [search, setSearch] = useState("");

  if (user.roles !== "tutor" && user.is_superuser === 0) {
    navigate("/login");
  }

  const handleMessageClick = (request) => {
    setSelectedRequestID(request.id);
    setMessage("");
    setShowReplyBox((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        request: selectedRequestID,
        tutor: user.account_id,
        tutor_email: user.email,
        message,
      };
      await api.post("/api/requests/reply/", payload);
      navigate(0); // refresh
    } catch (error) {
      if (error.response) {
        setError(t('errors.serverError'));
      } else if (error.request) {
        setError(t('errors.networkError'));
      } else {
        setError(t('errors.somethingWentWrong'));
      }
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await api.get("/api/requests/list/");
        setRequests(response.data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
      }
    };

    const fetchTutorDocuments = async () => {
      try {
        const response = await api.get(`/api/tutor/documents/?id=${user?.account_id}`);
        setTutorDocuments(response.data || []);
      } catch (error) {
        console.error("Error fetching tutor documents:", error);
        setTutorDocuments([]);
      }
    };

    fetchRequests();
    if (user?.roles === 'tutor') {
      fetchTutorDocuments();
    }
  }, [user?.account_id, user?.roles]);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set((requests || []).map((r) => r.subject).filter(Boolean))
      ).sort(),
    [requests]
  );

  const grades = useMemo(
    () =>
      Array.from(
        new Set((requests || []).map((r) => String(r.grade)).filter(Boolean))
      ).sort((a, b) => {
        const na = Number(a),
          nb = Number(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      }),
    [requests]
  );

  const services = useMemo(
    () =>
      Array.from(
        new Set((requests || []).map((r) => r.service).filter(Boolean))
      ).sort(),
    [requests]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set((requests || []).map((r) => r.city).filter(Boolean))
      ).sort(),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (requests || []).filter((r) => {
      const bySubject = filterSubject ? r.subject === filterSubject : true;
      const byGrade = filterGrade
        ? String(r.grade) === String(filterGrade)
        : true;
      const byService = filterService ? r.service === filterService : true;
      const byCity = filterCity ? r.city === filterCity : true;
      const bySearch = s
        ? (r.subject || "").toLowerCase().includes(s) ||
          (r.description || "").toLowerCase().includes(s)
        : true;
      return bySubject && byGrade && byService && byCity && bySearch;
    });
  }, [requests, filterSubject, filterGrade, filterService, filterCity, search]);

  const clearFilters = () => {
    setFilterSubject("");
    setFilterGrade("");
    setFilterService("");
    setFilterCity("");
    setSearch("");
  };

  return (
    <div className="dash-wrapper">
      <div className="dash-card">
        <h1>{t('dashboard.parentDashboard')}</h1>

        {/* Document Reminder for Tutors without Documents */}
        {user?.roles === 'tutor' && tutorDocuments.length === 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
            border: '2px solid #ffc107',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 12px rgba(255, 193, 7, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              <h3 style={{
                margin: 0,
                color: '#856404',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                {t('dashboard.documentsRecommended', 'Documents Recommended')}
              </h3>
            </div>
            <p style={{
              margin: '0 0 0.75rem 0',
              color: '#856404',
              fontSize: '0.95rem',
              lineHeight: '1.4'
            }}>
              {t('dashboard.documentsRecommendationText', 'We recommend uploading your credentials and certifications before replying to tutoring requests. This helps parents make informed decisions and increases your chances of being selected.')}
            </p>
            <button
              onClick={() => navigate('/settings')}
              style={{
                backgroundColor: '#192A88',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0f1f5f'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#192A88'}
            >
              {t('dashboard.uploadDocuments', 'Upload Documents')}
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-row">
            <select
              className="filter-input"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              aria-label="Filter by subject"
            >
              <option value="">{t('dashboard.allSubjects')}</option>
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            <select
              className="filter-input"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              aria-label="Filter by grade"
            >
              <option value="">{t('dashboard.allGrades')}</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              className="filter-input"
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              aria-label="Filter by service"
            >
              <option value="">{t('dashboard.allServices')}</option>
              {services.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>

            <select
              className="filter-input"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              aria-label="Filter by city"
            >
              <option value="">{t('dashboard.allCities')}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <input
              className="filter-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              aria-label="Search"
            />

            <button className="filter-clear" onClick={clearFilters}>
              {t('dashboard.clearFilters')}
            </button>
          </div>

          <div
            className="filter-meta"
            style={{ marginTop: "0.25rem", fontSize: "0.9rem", opacity: 0.8 }}
          >
            {t('dashboard.showingResults', { filtered: filteredRequests.length, total: requests.length })}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <p>{t('dashboard.noRequestsAvailable')}</p>
        ) : (
          <ul className="req-list">
            {filteredRequests.map((request) => (
              <li key={request.id} className="req-box" style={{ position: 'relative' }}>
                <div
                  onClick={() => navigate(`/parent-request/${request.id}`)}
                  style={{
                    cursor: 'pointer',
                    padding: '0.5rem',
                    margin: '-0.5rem',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  title={t('dashboard.clickToViewDetails', 'Click to view full details')}
                >
                  <strong>{t('dashboard.subject')}:</strong> {request.subject} <br />
                  <strong>{t('requests.gradeLevel')}:</strong> {request.grade} <br />
                  <strong>{t('common.service')}:</strong> {request.service} <br />
                  <strong>{t('common.description')}:</strong> {request.description} <br />
                  <strong>{t('dashboard.createdAt')}:</strong>{" "}
                  {new Date(request.created_at).toLocaleString()} <br />
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #dee2e6' }}>
                  <button
                    className="reply-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMessageClick(request);
                    }}
                    style={{ marginRight: '1rem' }}
                  >
                    {selectedRequestID === request.id && showReplyBox
                      ? t('dashboard.cancel')
                      : t('dashboard.reply')}
                  </button>
                  <button
                    className="reply-btn"
                    onClick={() => navigate(`/parent-request/${request.id}`)}
                    style={{ backgroundColor: '#192A88' }}
                  >
                    {t('dashboard.viewDetails', 'View Details')}
                  </button>
                </div>

                {selectedRequestID === request.id && showReplyBox && (
                  <form onSubmit={handleSubmit}>
                    <input
                      className="reply-input"
                      type="text"
                      value={message || ""}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('dashboard.writeMessage')}
                      required
                    />
                    <button className="send-btn" type="submit">
                      {t('dashboard.sendMessage')}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default ParentDashboard;
