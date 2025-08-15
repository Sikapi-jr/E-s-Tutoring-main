import React, { useState } from 'react';
import { supabase } from '../supabase';
import SupabaseLoginForm from '../components/SupabaseLoginForm';
import SupabaseRegisterForm from '../components/SupabaseRegisterForm';
import { AuthProvider, useAuth } from '../hooks/useSupabaseAuth.jsx';

// Test component that shows user status
function AuthStatus() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (!user) {
    return <div>Not signed in</div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', margin: '10px', borderRadius: '8px' }}>
      <h3>✅ Authentication Success!</h3>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>User ID:</strong> {user.id}</p>
      <p><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
      
      {profile && (
        <div>
          <p><strong>First Name:</strong> {profile.first_name}</p>
          <p><strong>Last Name:</strong> {profile.last_name}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>City:</strong> {profile.city}</p>
        </div>
      )}
      
      <button onClick={signOut} style={{ marginTop: '10px', padding: '8px 16px' }}>
        Sign Out
      </button>
    </div>
  );
}

// Main test component
function SupabaseAuthTestContent() {
  const [currentView, setCurrentView] = useState('status'); // 'status', 'login', 'register'
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>🧪 Supabase Authentication Test</h1>
      
      {/* Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setCurrentView('status')}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          Auth Status
        </button>
        {!user && (
          <>
            <button 
              onClick={() => setCurrentView('login')}
              style={{ margin: '5px', padding: '8px 16px' }}
            >
              Login
            </button>
            <button 
              onClick={() => setCurrentView('register')}
              style={{ margin: '5px', padding: '8px 16px' }}
            >
              Register
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {currentView === 'status' && <AuthStatus />}
      {currentView === 'login' && !user && <SupabaseLoginForm />}
      {currentView === 'register' && !user && <SupabaseRegisterForm />}

      {/* Test Instructions */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>🔬 Test Instructions:</h3>
        <ol>
          <li><strong>Register:</strong> Create a new account using the Register tab</li>
          <li><strong>Check Email:</strong> Look for confirmation email from Supabase</li>
          <li><strong>Confirm:</strong> Click the confirmation link in your email</li>
          <li><strong>Login:</strong> Sign in with your confirmed account</li>
          <li><strong>Check Status:</strong> View your user info in the Auth Status tab</li>
        </ol>
        
        <h4>🔍 Debugging Info:</h4>
        <p><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'Not set!'}</p>
        <p><strong>Supabase Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set ✅' : 'Not set ❌'}</p>
      </div>
    </div>
  );
}

// Wrapper with auth provider
function SupabaseAuthTest() {
  return (
    <AuthProvider>
      <SupabaseAuthTestContent />
    </AuthProvider>
  );
}

export default SupabaseAuthTest;