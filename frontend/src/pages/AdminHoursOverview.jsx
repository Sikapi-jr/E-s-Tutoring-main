// src/pages/AdminHoursOverview.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/AdminHoursOverview.css";

export default function AdminHoursOverview() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  const [hours, setHours] = useState([]);
  const [filteredHours, setFilteredHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter states
  const [statusFilter, setStatusFilter] = useState("all"); // all, Eligible, Late
  const [invoiceFilter, setInvoiceFilter] = useState("all"); // all, pending, invoiced
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    eligible: 0,
    late: 0,
    pending: 0,
    invoiced: 0
  });

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

  const fetchHours = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};
      if (startDate) params.start = startDate;
      if (endDate) params.end = endDate;

      const response = await api.get('/api/admin/all-hours/', { params });
      setHours(response.data.hours || []);
      setStats(response.data.stats || {
        total: 0,
        eligible: 0,
        late: 0,
        pending: 0,
        invoiced: 0
      });
    } catch (err) {
      console.error("Error fetching hours:", err);
      setError("Failed to load hours data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHours();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...hours];

    // Status filter (Eligible/Late)
    if (statusFilter !== "all") {
      filtered = filtered.filter(h => h.eligible === statusFilter);
    }

    // Invoice status filter
    if (invoiceFilter !== "all") {
      filtered = filtered.filter(h => h.invoice_status === invoiceFilter);
    }

    setFilteredHours(filtered);
  }, [hours, statusFilter, invoiceFilter]);

  const handleSearch = () => {
    fetchHours();
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setInvoiceFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="admin-hours-overview">
      <div className="overview-header">
        <h1>{t('admin.hoursOverview.title', 'Hours Overview')}</h1>
        <p>{t('admin.hoursOverview.subtitle', 'View and filter all hours in the system')}</p>
      </div>

      {/* Date Range Filter */}
      <div className="date-filter-section">
        <h3>Date Range</h3>
        <div className="date-inputs">
          <div className="date-input-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button onClick={handleSearch} className="btn-search" disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </button>
          <button onClick={clearFilters} className="btn-clear">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-section">
        <div className="stat-card stat-total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-card stat-eligible">
          <div className="stat-number">{stats.eligible}</div>
          <div className="stat-label">Eligible</div>
          <div className="stat-sublabel">(Logged on time)</div>
        </div>
        <div className="stat-card stat-late">
          <div className="stat-number">{stats.late}</div>
          <div className="stat-label">Late</div>
          <div className="stat-sublabel">(Admin-added)</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-sublabel">(Not yet invoiced)</div>
        </div>
        <div className="stat-card stat-invoiced">
          <div className="stat-number">{stats.invoiced}</div>
          <div className="stat-label">Invoiced</div>
          <div className="stat-sublabel">(Already billed)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Eligibility Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Eligible">Eligible (On-time)</option>
            <option value="Late">Late (Admin-added)</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Invoice Status:</label>
          <select value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending (Not invoiced)</option>
            <option value="invoiced">Invoiced (Already billed)</option>
          </select>
        </div>
        <div className="filter-summary">
          Showing {filteredHours.length} of {hours.length} hours
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Hours Table */}
      {!loading && filteredHours.length > 0 && (
        <div className="hours-table-section">
          <div className="table-wrapper">
            <table className="hours-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Tutor</th>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Location</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Eligibility</th>
                  <th>Invoice Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredHours.map((hour) => (
                  <tr key={hour.id}>
                    <td>{hour.id}</td>
                    <td>{hour.date}</td>
                    <td>{hour.tutor_firstName} {hour.tutor_lastName}</td>
                    <td>{hour.student_firstName} {hour.student_lastName}</td>
                    <td>{hour.parent_firstName} {hour.parent_lastName}</td>
                    <td>{hour.startTime} - {hour.endTime}</td>
                    <td>{hour.totalTime}</td>
                    <td>{hour.location}</td>
                    <td>{hour.subject}</td>
                    <td>
                      <span className={`badge badge-${hour.status.toLowerCase()}`}>
                        {hour.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${hour.eligible.toLowerCase()}`}>
                        {hour.eligible}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${hour.invoice_status}`}>
                        {hour.invoice_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#666' }}>
                      {new Date(hour.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredHours.length === 0 && hours.length > 0 && (
        <div className="no-results">
          <p>No hours match the current filters.</p>
        </div>
      )}

      {!loading && hours.length === 0 && (
        <div className="no-results">
          <p>No hours found for the selected date range.</p>
        </div>
      )}

      {loading && (
        <div className="loading-message">
          <p>Loading hours data...</p>
        </div>
      )}
    </div>
  );
}
