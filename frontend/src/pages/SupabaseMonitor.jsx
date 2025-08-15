import React, { useState } from 'react';
import { supabase } from '../supabase';

function SupabaseMonitor() {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testDatabaseCall = async () => {
    setLoading(true);
    setTestResult('Testing...');
    
    try {
      // This will show up in Supabase logs
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (error) {
        setTestResult(`❌ Database Error: ${error.message}`);
        console.error('Supabase Error:', error);
      } else {
        setTestResult(`✅ Database call successful! Found ${data?.length || 0} records`);
        console.log('Supabase Response:', data);
      }
    } catch (err) {
      setTestResult(`💥 Network Error: ${err.message}`);
      console.error('Network Error:', err);
    }
    
    setLoading(false);
  };

  const testAuthCall = async () => {
    setLoading(true);
    setTestResult('Testing auth...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setTestResult(`🔐 Auth Status: ${user ? 'Logged in as ' + user.email : 'Not logged in'}`);
      console.log('Current user:', user);
    } catch (err) {
      setTestResult(`💥 Auth Error: ${err.message}`);
      console.error('Auth Error:', err);
    }
    
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🔍 Supabase Monitor</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testDatabaseCall}
          disabled={loading}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          Test Database Call
        </button>
        
        <button 
          onClick={testAuthCall}
          disabled={loading}
          style={{ margin: '10px', padding: '10px 20px' }}
        >
          Test Auth Status
        </button>
      </div>

      {testResult && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '5px',
          fontFamily: 'monospace'
        }}>
          {testResult}
        </div>
      )}

      <div style={{ marginTop: '30px', backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
        <h3>🕵️ How to Monitor Supabase:</h3>
        <ol>
          <li><strong>Supabase Dashboard:</strong> 
            <br />Go to <a href="https://supabase.com/dashboard" target="_blank">dashboard</a> → Your Project → Logs
          </li>
          <li><strong>Browser Console:</strong> 
            <br />Press F12 → Console tab (see all logs above)
          </li>
          <li><strong>Network Tab:</strong> 
            <br />F12 → Network tab → Filter by "supabase" to see API calls
          </li>
        </ol>
        
        <p><strong>🔥 Pro tip:</strong> Click the buttons above, then check your Supabase dashboard logs!</p>
      </div>
    </div>
  );
}

export default SupabaseMonitor;