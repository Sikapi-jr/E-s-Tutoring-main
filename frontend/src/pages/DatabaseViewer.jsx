import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function DatabaseViewer() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      // Get all profiles (this will show if tables exist and have data)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      if (profilesError) {
        setError(`Profiles Error: ${profilesError.message}`);
      } else {
        setProfiles(profilesData || []);
      }

      if (authError) {
        setError(`Auth Error: ${authError.message}`);
      } else {
        setUsers(user ? [user] : []);
      }
    } catch (err) {
      setError(`Network Error: ${err.message}`);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading database...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>🗄️ Database Viewer</h1>
      
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Current User */}
      <div style={{ marginBottom: '30px' }}>
        <h2>🔐 Current Auth User ({users.length})</h2>
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
          {users.length === 0 ? (
            <p>❌ Not logged in</p>
          ) : (
            <pre style={{ fontSize: '12px' }}>{JSON.stringify(users[0], null, 2)}</pre>
          )}
        </div>
      </div>

      {/* Profiles Table */}
      <div style={{ marginBottom: '30px' }}>
        <h2>👥 Profiles Table ({profiles.length} records)</h2>
        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
          {profiles.length === 0 ? (
            <p>📭 No profiles found. Try registering a user first!</p>
          ) : (
            <div>
              {profiles.map((profile, index) => (
                <div key={profile.id} style={{ 
                  marginBottom: '15px', 
                  padding: '10px', 
                  backgroundColor: 'white', 
                  borderRadius: '5px',
                  border: '1px solid #ddd'
                }}>
                  <strong>User {index + 1}:</strong>
                  <pre style={{ fontSize: '11px', marginTop: '5px' }}>
                    {JSON.stringify(profile, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={loadData}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Refresh Data
        </button>
        
        <a 
          href="https://supabase.com/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          🔗 Open Supabase Dashboard
        </a>
      </div>
    </div>
  );
}

export default DatabaseViewer;