import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserProvider';
import api from '../api';

function HomeTour({ userRole, manualStart = false, onManualStartComplete }) {
  const { user, setUser } = useUser();
  const { t } = useTranslation();
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // If manually started, run the tour
    if (manualStart) {
      setTimeout(() => setRunTour(true), 500);
      return;
    }

    // Otherwise, only show tour automatically if user hasn't seen it
    // (excluding testing user "Parent" to avoid always showing)
    if (user && user.username !== 'Parent' && user.has_seen_tour === false) {
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => setRunTour(true), 500);
    }
  }, [user, manualStart]);

  const handleTourCallback = async (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);

      // If this was a manual tour, notify parent component
      if (manualStart && onManualStartComplete) {
        onManualStartComplete();
      }

      // Don't save tour state for testing user "Parent" or manual tours
      if (user?.username === 'Parent' || manualStart) {
        return;
      }

      // Mark tour as complete in backend (only for automatic first-time tours)
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
      content: t('tour.welcome'),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.home-weekly-hours',
      content: t('tour.weeklyHours'),
      placement: 'auto',
    },
    {
      target: '.home-tutor-code',
      content: t('tour.tutorCode'),
      placement: 'auto',
    },
    {
      target: '.logged-hours-section',
      content: t('tour.loggedHours'),
      placement: 'auto',
    },
    {
      target: '.announcements-section',
      content: t('tour.announcements'),
      placement: 'auto',
    },
    {
      target: '.scheduled-events-section',
      content: t('tour.scheduledEvents'),
      placement: 'auto',
    },
    {
      target: '.students-section',
      content: t('tour.tutorStudents'),
      placement: 'auto',
    },
    {
      target: '.home-notifications-column',
      content: t('tour.notifications'),
      placement: 'auto',
    },
    {
      target: '.recent-requests-section',
      content: t('tour.recentRequests'),
      placement: 'auto',
    },
    {
      target: '.home-payments-column',
      content: t('tour.paymentTransfers'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/my-students"]',
      content: t('tour.myStudents'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/request-reply"]',
      content: t('tour.tutoringRequests'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/hours"]',
      content: t('tour.myHours'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/events"]',
      content: t('tour.upcomingSessions'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/ViewInvoices"]',
      content: t('tour.invoices'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/monthly-reports"]',
      content: t('tour.monthlyReports'),
      placement: 'auto',
    },
  ];

  const getParentSteps = () => [
    {
      target: 'body',
      content: t('tour.welcome'),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.home-weekly-hours',
      content: t('tour.weeklyHours'),
      placement: 'auto',
    },
    {
      target: '.logged-hours-section',
      content: t('tour.loggedHours'),
      placement: 'auto',
    },
    {
      target: '.announcements-section',
      content: t('tour.announcements'),
      placement: 'auto',
    },
    {
      target: '.scheduled-events-section',
      content: t('tour.scheduledEvents'),
      placement: 'auto',
    },
    {
      target: '.students-section',
      content: t('tour.students'),
      placement: 'auto',
    },
    {
      target: '.payment-progress-section',
      content: t('tour.paymentProgress'),
      placement: 'auto',
    },
    {
      target: '.paid-invoices-section',
      content: t('tour.paidInvoices'),
      placement: 'auto',
    },
    {
      target: '.unpaid-invoices-section',
      content: t('tour.unpaidInvoices'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/students"]',
      content: t('tour.students'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/request-reply"]',
      content: t('tour.parentTutoringRequests'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/hours"]',
      content: t('tour.myHours'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/events"]',
      content: t('tour.upcomingSessions'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/ViewInvoices"]',
      content: t('tour.viewInvoices'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/monthly-reports"]',
      content: t('tour.reportsParent'),
      placement: 'auto',
    },
  ];

  const getStudentSteps = () => [
    {
      target: 'body',
      content: t('tour.welcome'),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.home-weekly-hours',
      content: t('tour.weeklyHours'),
      placement: 'auto',
    },
    {
      target: '.logged-hours-section',
      content: t('tour.loggedHours'),
      placement: 'auto',
    },
    {
      target: '.announcements-section',
      content: t('tour.announcements'),
      placement: 'auto',
    },
    {
      target: '.scheduled-events-section',
      content: t('tour.studentScheduledEvents'),
      placement: 'auto',
    },
    {
      target: '.students-section',
      content: t('tour.tutorStudents'),
      placement: 'auto',
    },
    {
      target: 'nav.nav a[href="/events"]',
      content: t('tour.studentEvents'),
      placement: 'auto',
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
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.finish'),
        next: t('tour.next'),
        skip: t('tour.skip'),
      }}
    />
  );
}

export default HomeTour;
