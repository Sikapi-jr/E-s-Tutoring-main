// src/pages/GroupTutoring.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

// Import sub-components
import GroupTutoringAdmin from './GroupTutoringAdmin';
import GroupTutoringTutor from './GroupTutoringTutor';
import GroupTutoringParent from './GroupTutoringParent';

const GroupTutoring = () => {
  const { t } = useTranslation();
  const { user } = useUser();

  // Check user role
  const isSuperuser = user?.is_staff || user?.is_superuser;
  const isTutor = user?.roles === 'tutor';
  const isParent = user?.roles === 'parent';

  // Render appropriate view based on role
  if (isSuperuser) {
    return <GroupTutoringAdmin />;
  }

  if (isTutor) {
    return <GroupTutoringTutor />;
  }

  if (isParent) {
    return <GroupTutoringParent />;
  }

  // Unauthorized
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Group Tutoring</h2>
      <p>You do not have access to this page.</p>
    </div>
  );
};

export default GroupTutoring;
