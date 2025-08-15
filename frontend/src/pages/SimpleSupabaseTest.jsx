import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function SimpleSupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        if (error) {
          setConnectionStatus(`Connection Error: ${error.message}`);
        } else {
          setConnectionStatus('✅ Connected successfully!');
        }
      } catch (err) {
        setConnectionStatus(`Network Error: ${err.message}`);
      }
    };

    // Get environment variables
    setEnvVars({
      url: import.meta.env.VITE_SUPABASE_URL,
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    testConnection();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 Simple Supabase Test</h1>
      
      <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Connection Status:</h3>
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{connectionStatus}</p>
      </div>

      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Environment Configuration:</h3>
        <p><strong>Supabase URL:</strong> {envVars.url || '❌ Not set'}</p>
        <p><strong>Supabase Key:</strong> {envVars.hasKey ? '✅ Set' : '❌ Not set'}</p>
      </div>

      <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px' }}>
        <h3>Next Steps:</h3>
        {!envVars.url || !envVars.hasKey ? (
          <div>
            <p>❌ <strong>Missing environment variables!</strong></p>
            <ol>
              <li>Go to <a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a></li>
              <li>Select your project → Settings → API</li>
              <li>Copy your Project URL and anon key</li>
              <li>Update <code>frontend/.env.local</code> with real values</li>
              <li>Restart your dev server</li>
            </ol>
          </div>
        ) : connectionStatus.includes('Error') ? (
          <div>
            <p>⚠️ <strong>Connection issues detected!</strong></p>
            <ul>
              <li>Check if your Supabase project is active</li>
              <li>Verify your API keys are correct</li>
              <li>Make sure you have a 'profiles' table</li>
            </ul>
          </div>
        ) : (
          <div>
            <p>✅ <strong>Everything looks good!</strong></p>
            <p>Your Supabase integration is ready to use.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleSupabaseTest;