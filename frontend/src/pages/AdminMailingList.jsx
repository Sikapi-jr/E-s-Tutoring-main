import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../components/UserProvider';
import api from '../api';

const AdminMailingList = () => {
  const { user } = useUser();

  const [subscribers, setSubscribers] = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [deletingId, setDeletingId]   = useState(null);

  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    if (user && !user.is_superuser) window.location.href = '/';
  }, [user]);

  const fetchSubscribers = useCallback(async (currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage };
      if (search) params.search = search;
      if (activeFilter) params.is_active = activeFilter;

      const res = await api.get('/api/admin/mailing-list/', { params });
      setSubscribers(res.data.results || []);
      setTotal(res.data.total || 0);
      setPage(currentPage);
    } catch (e) {
      console.error(e);
      setError('Failed to load mailing list subscribers.');
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchSubscribers(1);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSubscribers(1);
  };

  const handleRemove = async (subscriber) => {
    if (!confirm(`Remove ${subscriber.email} from the mailing list?`)) return;

    setDeletingId(subscriber.id);
    try {
      await api.delete(`/api/admin/mailing-list/${subscriber.id}/`);
      setSubscribers(prev => prev.filter(s => s.id !== subscriber.id));
      setTotal(prev => Math.max(prev - 1, 0));
    } catch (e) {
      console.error(e);
      alert('Failed to remove subscriber.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / 100);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ color: '#192A88', borderBottom: '3px solid #FFB31B', paddingBottom: '0.5rem' }}>
        Mailing List
      </h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Everyone who signed up at egstutoring.ca/mailing-list — {total.toLocaleString()} total.
      </p>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <input
          type="text"
          placeholder="Search email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <select
          value={activeFilter}
          onChange={e => setActiveFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button
          type="submit"
          style={{ padding: '0.45rem 1.25rem', background: '#192A88', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => { setSearch(''); setActiveFilter(''); }}
          style={{ padding: '0.45rem 1rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Clear
        </button>
      </form>

      {error && <p style={{ color: '#dc3545' }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : subscribers.length === 0 ? (
        <p style={{ color: '#666' }}>No subscribers match the current filters.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#192A88', color: '#fff' }}>
                  <th style={th}>Email</th>
                  <th style={th}>Language</th>
                  <th style={th}>Signed Up</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub, i) => (
                  <tr key={sub.id} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                    <td style={td}>{sub.email}</td>
                    <td style={td}>{(sub.language || 'en').toUpperCase()}</td>
                    <td style={td}>
                      {new Date(sub.created_at).toLocaleString('en-CA', {
                        year: 'numeric', month: 'short', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td style={td}>
                      <span style={{
                        ...(sub.is_active
                          ? { background: '#d4edda', color: '#155724' }
                          : { background: '#f8d7da', color: '#721c24' }),
                        padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontSize: '0.82rem',
                      }}>
                        {sub.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={td}>
                      <button
                        onClick={() => handleRemove(sub)}
                        disabled={deletingId === sub.id}
                        style={{
                          padding: '0.35rem 0.8rem', background: '#dc3545', color: '#fff',
                          border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem',
                        }}
                      >
                        {deletingId === sub.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => fetchSubscribers(page - 1)}
                disabled={page <= 1}
                style={pageBtn}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.9rem', color: '#555' }}>
                Page {page} / {totalPages} ({total.toLocaleString()} subscribers)
              </span>
              <button
                onClick={() => fetchSubscribers(page + 1)}
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

export default AdminMailingList;
