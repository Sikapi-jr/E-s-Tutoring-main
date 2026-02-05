// src/pages/GroupTutoring.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../components/UserProvider';
import api from '../api';

// Import sub-components
import GroupTutoringAdmin from './GroupTutoringAdmin';
import GroupTutoringTutor from './GroupTutoringTutor';
import GroupTutoringParent from './GroupTutoringParent';

// Home icon component
const HomeIcon = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/home')}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 1000,
        backgroundColor: '#192A88',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }}
      title="Go to Home"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </button>
  );
};

const GroupTutoring = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  // Check user role
  const isSuperuser = user?.is_staff || user?.is_superuser;
  const isTutor = user?.roles === 'tutor';
  const isParent = user?.roles === 'parent';

  // Render appropriate view based on role
  if (isSuperuser) {
    return (
      <>
        <HomeIcon />
        <GroupTutoringAdmin />
      </>
    );
  }

  if (isTutor) {
    return (
      <>
        <HomeIcon />
        <GroupTutoringTutor />
      </>
    );
  }

  if (isParent) {
    return (
      <>
        <HomeIcon />
        <GroupTutoringParent />
      </>
    );
  }

  // Unauthorized
  return (
    <>
      <HomeIcon />
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>You do not have access to this page.</p>
      </div>
    </>
  );
};

export default GroupTutoring;
