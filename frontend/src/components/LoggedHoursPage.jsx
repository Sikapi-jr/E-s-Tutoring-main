// src/pages/LoggedHoursPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import DisputeModal from "../components/DisputeModal";
import EditHoursModal from "../components/EditHoursModal";
import EditHistoryModal from "../components/EditHistoryModal";
import TutorReplyModal from "../components/TutorReplyModal";
import LogHoursModal from "../components/LogHoursModal";
import "../styles/HoursPage.css";

export default function LoggedHoursPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    location: "",
    period: "all",
  });

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedHourForDispute, setSelectedHourForDispute] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedHourForEdit, setSelectedHourForEdit] = useState(null);
  const [editHistoryModalOpen, setEditHistoryModalOpen] = useState(false);
  const [selectedHourForHistory, setSelectedHourForHistory] = useState(null);
  const [logHoursModalOpen, setLogHoursModalOpen] = useState(false);

  const handleDisputeClick = useCallback((hour) => {
    setSelectedHourForDispute(hour);
    setDisputeModalOpen(true);
  }, []);

  const handleEditClick = useCallback((hour) => {
    setSelectedHourForEdit(hour);
    setEditModalOpen(true);
  }, []);

  const handleEditHistoryClick = useCallback((hour) => {
    setSelectedHourForHistory(hour);
    setEditHistoryModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(async (hour) => {
    if (!window.confirm(t('loggedHours.confirmDelete', { date: new Date(hour.date).toLocaleDateString() }))) {
      return;
    }

    try {
      await api.delete(`/api/hours/${hour.id}/edit/`);
      
      // Refresh hours data
      const res = await api.get(`/api/parentHours/?id=${user.account_id}`);
      setHours(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to delete hour:", error);
      alert(error.response?.data?.detail || t('errors.failedToDeleteHour'));
    }
  }, [user, t]);

  const [tutorReplyModalOpen, setTutorReplyModalOpen] = useState(false);
  const [selectedHourForReply, setSelectedHourForReply] = useState(null);

  const handleTutorReplyClick = useCallback((hour) => {
    setSelectedHourForReply(hour);
    setTutorReplyModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setSelectedHourForEdit(null);
  }, []);

  const handleEditHistoryModalClose = useCallback(() => {
    setEditHistoryModalOpen(false);
    setSelectedHourForHistory(null);
  }, []);

  const handleTutorReplyModalClose = useCallback(() => {
    setTutorReplyModalOpen(false);
    setSelectedHourForReply(null);
  }, []);

  const handleEditSuccess = useCallback(async () => {
    try {
      const res = await api.get(`/api/parentHours/?id=${user.account_id}`);
      setHours(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to refresh hours data:", error);
    }
  }, [user]);

  const handleCancelDispute = useCallback(async (disputeId) => {
    if (!disputeId) {
      console.error('No dispute ID provided');
      return;
    }
    
    try {
      console.log('Canceling dispute with ID:', disputeId);
      const response = await api.delete(`/api/disputes/${disputeId}/cancel/`);
      console.log('Cancel response:', response);
      
      // Refresh hours data
      const res = await api.get(`/api/parentHours/?id=${user.account_id}`);
      console.log('Refreshed hours after cancel:', res.data);
      setHours(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to cancel dispute:", error);
      console.error("Error details:", error.response?.data);
    }
  }, [user]);

  const handleDisputeModalClose = useCallback(() => {
    setDisputeModalOpen(false);
    setSelectedHourForDispute(null);
  }, []);

  const handleDisputeSuccess = useCallback(async () => {
    try {
      const res = await api.get(`/api/parentHours/?id=${user.account_id}`);
      console.log('Updated hours data after dispute:', res.data); // Debug log
      setHours(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to refresh hours data:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get(`/api/parentHours/?id=${user.account_id}`);
        setHours(Array.isArray(res.data) ? res.data : []);
      } catch {
        setErr(t("errors.failedToLoadLoggedHours"));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, t]);

  if (!user || loading) {
    return (
      <div className="hrs-spinner-wrap">
        <div className="hrs-spinner" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }
  if (err) return <p style={{ padding: "2rem" }}>{err}</p>;

  const isWithinPeriod = (dateStr, period) => {
    const date = new Date(dateStr);
    const now = new Date();
    switch (period) {
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return date >= weekStart && date <= weekEnd;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return date >= monthStart && date <= monthEnd;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return date >= yearStart && date <= yearEnd;
      default:
        return true;
    }
  };

  const filteredHours = hours.filter((h) => {
    return (
      (filters.status ? h.status === filters.status : true) &&
      (filters.location ? h.location === filters.location : true) &&
      isWithinPeriod(h.date, filters.period)
    );
  });

  const disputedHours = filteredHours.filter(h => {
    return h.status === "Disputed" || h.dispute_id;
  });
  
  // Non-disputed hours for the main table (exclude disputed hours)
  const nonDisputedHours = filteredHours.filter(h => {
    return !(h.status === "Disputed" || h.dispute_id);
  });
  
  const totalHours = filteredHours.reduce((sum, h) => sum + parseFloat(h.totalTime || h.total_hours || 0), 0);

  const getPeriodLabel = () => {
    switch (filters.period) {
      case "week": return t("loggedHours.thisWeek");
      case "month": return t("loggedHours.thisMonth");
      case "year": return t("loggedHours.thisYear");
      default: return t("loggedHours.allTime");
    }
  };

  return (
    <div className="hours-page">
      {/* Filters */}
      <div className="filters-bar">
        <div className="period-filter">
          <label>{t("loggedHours.timePeriod")}:</label>
          <button
            className={filters.period === "all" ? "active" : ""}
            onClick={() => setFilters({ ...filters, period: "all" })}
          >
            {t("loggedHours.allTime")}
          </button>
          <button
            className={filters.period === "week" ? "active" : ""}
            onClick={() => setFilters({ ...filters, period: "week" })}
          >
            {t("loggedHours.thisWeek")}
          </button>
          <button
            className={filters.period === "month" ? "active" : ""}
            onClick={() => setFilters({ ...filters, period: "month" })}
          >
            {t("loggedHours.thisMonth")}
          </button>
          <button
            className={filters.period === "year" ? "active" : ""}
            onClick={() => setFilters({ ...filters, period: "year" })}
          >
            {t("loggedHours.thisYear")}
          </button>
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">{t("loggedHours.allStatuses")}</option>
          <option value="Accepted">{t("loggedHours.statusAccepted")}</option>
          <option value="Disputed">{t("loggedHours.statusDisputed")}</option>
          <option value="Resolved">{t("loggedHours.statusResolved")}</option>
          <option value="Void">{t("loggedHours.statusVoid")}</option>
        </select>

        <select
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        >
          <option value="">{t("loggedHours.allLocations")}</option>
          <option value="Online">{t("logHours.online")}</option>
          <option value="In-Person">{t("logHours.inPerson")}</option>
        </select>
      </div>

      {/* Main Grid */}
      <div className="hours-grid">
        {/* Left column: logged hours */}
        <div className="logged-hours">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="hrs-title" style={{ margin: 0 }}>{t("myHours.title")}</h2>
            {user.roles === 'tutor' && (
              <button
                className="add-hours-button"
                onClick={() => setLogHoursModalOpen(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#192A88',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0d1654'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#192A88'}
              >
                + {t('myHours.addHours')}
              </button>
            )}
          </div>

          {/* Mobile filters - above table */}
          <div className="mobile-filters">
            <div className="mobile-filter-item">
              <label>{t("loggedHours.timePeriod")}:</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              >
                <option value="all">{t("loggedHours.allTime")}</option>
                <option value="week">{t("loggedHours.thisWeek")}</option>
                <option value="month">{t("loggedHours.thisMonth")}</option>
                <option value="year">{t("loggedHours.thisYear")}</option>
              </select>
            </div>

            <div className="mobile-filter-item">
              <label>{t("common.status")}:</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">{t("loggedHours.allStatuses")}</option>
                <option value="Accepted">{t("loggedHours.statusAccepted")}</option>
                <option value="Disputed">{t("loggedHours.statusDisputed")}</option>
                <option value="Resolved">{t("loggedHours.statusResolved")}</option>
                <option value="Void">{t("loggedHours.statusVoid")}</option>
              </select>
            </div>

            <div className="mobile-filter-item">
              <label>{t("requests.location")}:</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              >
                <option value="">{t("loggedHours.allLocations")}</option>
                <option value="Online">{t("logHours.online")}</option>
                <option value="In-Person">{t("logHours.inPerson")}</option>
              </select>
            </div>
          </div>
          
          {nonDisputedHours.length ? (
            <table className="hours-table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("dashboard.student")}</th>
                  {user.roles !== "tutor" && <th>{t("dashboard.tutor")}</th>}
                  <th>{t("logHours.subject")}</th>
                  <th>{t("events.startTime")}</th>
                  <th>{t("events.endTime")}</th>
                  <th>{t("loggedHours.totalHours")}</th>
                  <th>{t("requests.location")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {nonDisputedHours.map((h) => (
                  <tr 
                    key={h.id} 
                    className={h.edited_at ? 'edited-row clickable-row' : ''} 
                    onClick={h.edited_at ? () => handleEditHistoryClick(h) : null}
                    style={h.edited_at ? { cursor: 'pointer' } : {}}
                  >
                    <td data-label="Date">
                      {new Date(h.date).toLocaleDateString()}
                      {h.edited_at && (
                        <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#ff8c00' }}>
                          ✏️ Edited
                        </span>
                      )}
                    </td>
                    <td data-label="Student">
                      {h.student_firstName && h.student_lastName
                        ? `${h.student_firstName} ${h.student_lastName}`
                        : h.studentName || h.student_name || h.student || h.student_username || t("common.unknownStudent")}
                    </td>
                    {user.roles !== "tutor" && (
                      <td data-label="Tutor">
                        {h.tutor_firstName && h.tutor_lastName
                          ? `${h.tutor_firstName} ${h.tutor_lastName}`
                          : h.tutor || h.tutor_name || "-"}
                      </td>
                    )}
                    <td data-label="Subject">{h.subject || "-"}</td>
                    <td data-label="Start">{h.startTime || h.start_time || "-"}</td>
                    <td data-label="End">{h.endTime || h.end_time || "-"}</td>
                    <td data-label="Total (h)">{h.totalTime || h.total_hours || "-"}</td>
                    <td data-label="Location">{h.location || "-"}</td>
                    <td data-label="Status" data-status={h.status?.toLowerCase() || "pending"}>
                      {h.status === "Accepted" && t("loggedHours.statusAccepted")}
                      {h.status === "Disputed" && t("loggedHours.statusDisputed")}
                      {h.status === "Resolved" && t("loggedHours.statusResolved")}
                      {h.status === "Void" && t("loggedHours.statusVoid")}
                      {!["Accepted", "Disputed", "Resolved", "Void"].includes(h.status) && (h.status || t("common.unknown"))}
                    </td>
                    <td data-label="">
                      {user.roles === "tutor" ? (
                        // Tutor view: Edit button for non-disputed hours, reply option for disputed
                        h.status === "Disputed" ? (
                          <div>
                            <button
                              className="reply-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTutorReplyClick(h);
                              }}
                              title="Add tutor reply"
                            >
                              💬 Reply
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(h);
                              }}
                              title="Edit hours"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(h);
                              }}
                              title="Delete hours"
                              style={{ 
                                backgroundColor: '#dc3545', 
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        )
                      ) : (
                        // Parent view: Dispute/Cancel buttons
                        h.dispute_id ? (
                          <button
                            className="cancel-dispute-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Cancel button clicked for dispute:', h.dispute_id);
                              handleCancelDispute(h.dispute_id);
                            }}
                            title="Cancel dispute"
                          >
                            ❌ Cancel
                          </button>
                        ) : (
                          <button
                            className="dispute-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisputeClick(h);
                            }}
                          >
                            ⚠️ Dispute
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-hours">{t("loggedHours.noHours")}</p>
          )}
        </div>

        {/* Right column */}
        <div className="right-col">
          <div className="disputed-hours">
            <h3>{t("loggedHours.disputedTitle")}</h3>
            {disputedHours.length > 0 ? (
              <div className="disputed-list">
                <p className="disputed-count">
                  {t("loggedHours.disputedCount", { count: disputedHours.length })}
                </p>
                {disputedHours.map((h) => (
                  <div key={h.id} className="disputed-item">
                    <div>{new Date(h.date).toLocaleDateString()}</div>
                    <div>
                      {h.student_firstName && h.student_lastName
                        ? `${h.student_firstName} ${h.student_lastName}`
                        : h.studentName || h.student_name || h.student || h.student_username || t("common.unknownStudent")}
                    </div>
                    <div>{h.totalTime || h.total_hours}h</div>
                    {h.dispute_id && user.roles !== "tutor" && (
                      <div>
                        <button
                          className="cancel-dispute-btn small"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancelDispute(h.dispute_id);
                          }}
                          title="Cancel dispute"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-disputes">{t("loggedHours.noDisputes")}</p>
            )}
          </div>

          <div className="summary-box">
            <h3>{t("loggedHours.summaryTitle")} ({getPeriodLabel()})</h3>
            <p className="summary-value">{totalHours.toFixed(1)}h</p>
            <div className="summary-details">
              <p>{t("loggedHours.totalSessions")}: {filteredHours.length}</p>
              <p>{t("loggedHours.avgPerSession")}: {filteredHours.length > 0 ? (totalHours / filteredHours.length).toFixed(1) : 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeModalOpen && selectedHourForDispute && (
        <DisputeModal
          isOpen={disputeModalOpen}
          onClose={handleDisputeModalClose}
          hourData={selectedHourForDispute}
          onSubmitSuccess={handleDisputeSuccess}
        />
      )}

      {/* Edit Hours Modal */}
      {editModalOpen && selectedHourForEdit && (
        <EditHoursModal
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          hourData={selectedHourForEdit}
          onSubmitSuccess={handleEditSuccess}
        />
      )}

      {/* Edit History Modal */}
      {editHistoryModalOpen && selectedHourForHistory && (
        <EditHistoryModal
          isOpen={editHistoryModalOpen}
          onClose={handleEditHistoryModalClose}
          hourData={selectedHourForHistory}
        />
      )}

      {/* Tutor Reply Modal */}
      {tutorReplyModalOpen && selectedHourForReply && (
        <TutorReplyModal
          isOpen={tutorReplyModalOpen}
          onClose={handleTutorReplyModalClose}
          hourData={selectedHourForReply}
          onSubmitSuccess={handleEditSuccess}
        />
      )}

      {/* Log Hours Modal */}
      <LogHoursModal
        isOpen={logHoursModalOpen}
        onClose={() => setLogHoursModalOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
