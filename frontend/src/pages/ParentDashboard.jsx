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
    fetchRequests();
  }, []);

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
              <li key={request.id} className="req-box">
                <strong>{t('dashboard.subject')}:</strong> {request.subject} <br />
                <strong>{t('requests.gradeLevel')}:</strong> {request.grade} <br />
                <strong>{t('common.service')}:</strong> {request.service} <br />
                <strong>{t('common.description')}:</strong> {request.description} <br />
                <strong>{t('dashboard.createdAt')}:</strong>{" "}
                {new Date(request.created_at).toLocaleString()} <br />
                <button
                  className="reply-btn"
                  onClick={() => handleMessageClick(request)}
                >
                  {selectedRequestID === request.id && showReplyBox
                    ? t('dashboard.cancel')
                    : t('dashboard.reply')}
                </button>

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
