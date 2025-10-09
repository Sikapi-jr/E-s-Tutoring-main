// src/pages/AdminReferrals.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useUser } from "../components/UserProvider";
import "../styles/TutorDashboard.css";

const AdminReferrals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Gate-keep: only superadmin can access
  if (!user.is_superuser) {
    navigate("/login");
    return null;
  }

  useEffect(() => {
    fetchAllReferrals();
  }, []);

  const fetchAllReferrals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/referral/admin/all/');
      setReferrals(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      setError(t('dashboard.errorLoading', 'Error loading referrals'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('dashboard.loading', 'Loading...')}</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-wrapper">
        <div className="dash-card">
          <h1>{t('common.error', 'Error')}</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-wrapper">
      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#192A88' }}>
            {t('admin.allReferrals', 'All Referrals')}
          </h1>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="reply-btn"
            style={{ backgroundColor: '#6c757d' }}
          >
            ← {t('common.back', 'Back to Dashboard')}
          </button>
        </div>

        {referrals.length === 0 ? (
          <p>{t('admin.noReferrals', 'No referrals found')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#192A88', color: 'white' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>From</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>To</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral, index) => (
                  <tr key={referral.id} style={{
                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                    borderBottom: '1px solid #dee2e6'
                  }}>
                    <td style={{ padding: '1rem' }}>{referral.id}</td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <strong>{referral.referrer_name || 'N/A'}</strong>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                          {referral.referrer_email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        {referral.referred_name ? (
                          <>
                            <strong>{referral.referred_name}</strong>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              {referral.referred_email || referral.prospective_email}
                            </div>
                          </>
                        ) : (
                          <div>
                            <strong style={{ color: '#856404' }}>Pending</strong>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              {referral.prospective_email}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        backgroundColor: referral.reward_applied ? '#d4edda' : '#fff3cd',
                        color: referral.reward_applied ? '#155724' : '#856404',
                        border: `1px solid ${referral.reward_applied ? '#c3e6cb' : '#ffeaa7'}`
                      }}>
                        {referral.reward_applied ? '✅ Reward Applied' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
          <h3 style={{ color: '#0c5aa6', marginTop: 0 }}>Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Total Referrals:</strong> {referrals.length}
            </div>
            <div>
              <strong>Rewards Applied:</strong> {referrals.filter(r => r.reward_applied).length}
            </div>
            <div>
              <strong>Pending:</strong> {referrals.filter(r => !r.reward_applied).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReferrals;
