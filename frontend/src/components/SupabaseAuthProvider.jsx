import React from 'react';
import { AuthProvider } from '../hooks/useSupabaseAuth.jsx';

const SupabaseAuthProvider = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export default SupabaseAuthProvider;