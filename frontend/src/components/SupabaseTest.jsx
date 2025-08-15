import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [error, setError] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Simple test query to check connection
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist, but connection works
        setConnectionStatus('connected');
        setError('Connection successful! (test_table does not exist, which is expected)');
      } else if (error) {
        setConnectionStatus('error');
        setError(`Connection error: ${error.message}`);
      } else {
        setConnectionStatus('connected');
        setError('Connection successful!');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(`Network error: ${err.message}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #ccc', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: connectionStatus === 'connected' ? '#e8f5e8' : '#f5e8e8'
    }}>
      <h3>Supabase Connection Test</h3>
      <p><strong>Status:</strong> {connectionStatus}</p>
      {error && <p><strong>Details:</strong> {error}</p>}
      <button onClick={testConnection} disabled={connectionStatus === 'testing'}>
        Test Again
      </button>
    </div>
  );
};

export default SupabaseTest;