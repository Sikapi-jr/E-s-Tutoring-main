import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/UserProvider';
import api from '../api';
import '../styles/HoursPage.css';

const STATUS_COLORS = {
  sent:    { background: '#d4edda', color: '#155724' },
  failed:  { background: '#f8d7da', color: '#721c24' },
  skipped: { background: '#fff3cd', color: '#856404' },
};

const TYPE_LABELS = {
  weekly_hours:        'Weekly Hours',
  monthly_hours:       'Monthly Hours',
  invoice:             'Invoice',
  invoice_reminder:    'Invoice Reminder',
  verification:        'Verification',
  welcome_tutor:       'Tutor Welcome',
  welcome_parent:      'Parent Welcome',
  tutor_reply:         'Tutor Reply',
  new_request:         'New Request',
  monthly_report:      'Monthly Report',
  hour_dispute:        'Hour Dispute',
  dispute_admin:       'Dispute (Admin)',
  referral_bonus:      'Referral Bonus',
  referral_admin:      'Referral (Admin)',
  tutor_transfer:      'Tutor Transfer',
  parent_registration: 'Parent Reg.',
  health_check:        'Health Check',
  bulk_parent:         'Bulk (Parents)',
  bulk_tutor:          'Bulk (Tutors)',
  bulk_custom:         'Bulk (Custom)',
  hours_reminder:      'Hours Reminder',
  test:                'Test',
  other:               'Other',
};

const AdminEmailLogs = () => {
  const { user } = useUser();

  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  useEffect(() => {
    if (user && !user.is_superuser) window.location.href = '/';
  }, [user]);

  const fetchLogs = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage };
      if (search)       params.search      = search;
      if (typeFilter)   params.email_type  = typeFilter;
      if (statusFilter) params.status      = statusFilter;
      if (dateFrom)     params.date_from   = dateFrom;
      if (dateTo)       params.date_to     = dateTo;

      const res = await api.get('/api/admin/email-logs/', { params });
      setLogs(res.data.results || []);
      setTotal(res.data.total  || 0);
      setPage(currentPage);
    } catch (e) {
      console.error(e);
      setError('Failed to load email logs.');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const totalPages = Math.ceil(total / 100);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ color: '#192A88', borderBottom: '3px solid #FFB31B', paddingBottom: '0.5rem' }}>
        Email Logs
      </h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Every email sent by the system is recorded here — {total.toLocaleString()} total.
      </p>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <input
          type="text"
          placeholder="Search recipient / subject…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
          title="To date"
        />
        <button
          type="submit"
          style={{ padding: '0.45rem 1.25rem', background: '#192A88', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => { setSearch(''); setTypeFilter(''); setStatus(''); setDateFrom(''); setDateTo(''); }}
          style={{ padding: '0.45rem 1rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </form>

      {error && <p style={{ color: '#dc3545' }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#666' }}>No emails match the current filters.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#192A88', color: '#fff' }}>
                  <th style={th}>Sent At</th>
                  <th style={th}>Recipient</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Type</th>
                  <th style={th}>From</th>
                  <th style={th}>Status</th>
                  <th style={th}>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const sc = STATUS_COLORS[log.status] || {};
                  return (
                    <tr key={log.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                      <td style={td}>
                        {new Date(log.sent_at).toLocaleString('en-CA', {
                          year: 'numeric', month: 'short', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{log.recipient_name || '—'}</div>
                        <div style={{ color: '#555', fontSize: '0.82rem' }}>{log.recipient_email}</div>
                      </td>
                      <td style={{ ...td, maxWidth: '260px', wordBreak: 'break-word' }}>{log.subject}</td>
                      <td style={td}>
                        <span style={{ background: '#e8eaf6', color: '#192A88', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {TYPE_LABELS[log.email_type] || log.email_type}
                        </span>
                      </td>
                      <td style={{ ...td, fontSize: '0.8rem', color: '#555' }}>{log.from_email || '—'}</td>
                      <td style={td}>
                        <span style={{ ...sc, padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {log.status_display}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#dc3545', fontSize: '0.8rem', maxWidth: '220px', wordBreak: 'break-word' }}>
                        {log.error_message || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                style={pageBtn}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.9rem', color: '#555' }}>
                Page {page} / {totalPages} ({total.toLocaleString()} records)
              </span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                style={pageBtn}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const th = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: '600',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid #FFB31B',
};

const td = {
  padding: '8px 12px',
  borderBottom: '1px solid #e0e0e0',
  verticalAlign: 'top',
};

const pageBtn = {
  padding: '0.4rem 0.9rem',
  background: '#192A88',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

export default AdminEmailLogs;
