import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useUser } from './UserProvider';
import api from '../api';

function HomeTour({ userRole }) {
  const { user, setUser } = useUser();
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Always show tour for testing user "Parent"
    // Otherwise, only show tour if user hasn't seen it
    if (user && (user.username === 'Parent' || user.has_seen_tour === false)) {
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => setRunTour(true), 500);
    }
  }, [user]);

  const handleTourCallback = async (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);

      // Don't save tour state for testing user "Parent"
      if (user?.username === 'Parent') {
        return;
      }

      // Mark tour as complete in backend
      try {
        await api.post('/api/user/mark-tour-complete/');
        // Update local user state
        if (setUser) {
          setUser({ ...user, has_seen_tour: true });
        }
      } catch (error) {
        console.error('Failed to mark tour as complete:', error);
      }
    }
  };

  // Define steps based on user role
  const getTutorSteps = () => [
    {
      target: 'body',
      content: 'Welcome to your EGS Tutoring dashboard! Let\'s take a quick tour of the key features.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.hours-message',
      content: 'Here you can see your logged hours for the current week.',
      placement: 'bottom',
    },
    {
      target: 'div[style*="Your Tutor Code"]',
      content: 'This is your personal tutor referral code. Share it with new students to connect directly!',
      placement: 'bottom',
    },
    {
      target: '.scheduled-events-section',
      content: 'View your upcoming scheduled tutoring sessions here.',
      placement: 'top',
    },
    {
      target: 'nav.nav a[href="/my-students"]',
      content: 'Access your list of students from the "My Students" menu.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/request-reply"]',
      content: 'View and respond to new tutoring requests here.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/hours"]',
      content: 'Log your tutoring hours in the "My Hours" section.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/monthly-reports"]',
      content: 'Submit monthly progress reports for your students here.',
      placement: 'bottom',
    },
  ];

  const getParentSteps = () => [
    {
      target: 'body',
      content: 'Welcome to your EGS Tutoring dashboard! Let\'s show you around.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.hours-message',
      content: 'Track your child\'s tutoring hours for the current week here.',
      placement: 'bottom',
    },
    {
      target: '.scheduled-events-section',
      content: 'See all upcoming tutoring sessions for your children.',
      placement: 'top',
    },
    {
      target: 'nav.nav a[href="/students"]',
      content: 'Manage your children\'s accounts and view their tutors.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/request-reply"]',
      content: 'Request a tutor or view responses from tutors here.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/ViewInvoices"]',
      content: 'View and manage your invoices and payments.',
      placement: 'bottom',
    },
    {
      target: 'nav.nav a[href="/monthly-reports"]',
      content: 'Read monthly progress reports from your children\'s tutors.',
      placement: 'bottom',
    },
  ];

  const getStudentSteps = () => [
    {
      target: 'body',
      content: 'Welcome! Here\'s a quick overview of your dashboard.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.hours-message',
      content: 'See your tutoring hours for the week here.',
      placement: 'bottom',
    },
    {
      target: '.scheduled-events-section',
      content: 'Check your upcoming tutoring sessions.',
      placement: 'top',
    },
    {
      target: 'nav.nav a[href="/events"]',
      content: 'View all your scheduled sessions in the Events page.',
      placement: 'bottom',
    },
  ];

  // Select steps based on user role
  let steps = [];
  if (userRole === 'tutor') {
    steps = getTutorSteps();
  } else if (userRole === 'parent') {
    steps = getParentSteps();
  } else if (userRole === 'student') {
    steps = getStudentSteps();
  }

  // Filter out steps where the target element doesn't exist
  const filteredSteps = steps.filter(step => {
    if (step.target === 'body') return true;
    return document.querySelector(step.target) !== null;
  });

  return (
    <Joyride
      steps={filteredSteps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleTourCallback}
      styles={{
        options: {
          primaryColor: '#192A88',
          textColor: '#333',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: '#192A88',
          fontSize: '14px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#192A88',
          fontSize: '14px',
        },
        buttonSkip: {
          color: '#666',
          fontSize: '14px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}

export default HomeTour;
