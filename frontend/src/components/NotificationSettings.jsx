import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserProvider';
import api from '../api';

const NotificationSettings = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [settings, setSettings] = useState({
    email_notifications_enabled: true,
    email_new_requests: true,
    email_replies: true,
    email_disputes: true,
    email_monthly_hours: true,
    email_monthly_reports: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setSettings({
        email_notifications_enabled: user.email_notifications_enabled ?? true,
        email_new_requests: user.email_new_requests ?? true,
        email_replies: user.email_replies ?? true,
        email_disputes: user.email_disputes ?? true,
        email_monthly_hours: user.email_monthly_hours ?? true,
        email_monthly_reports: user.email_monthly_reports ?? true,
      });
    }
  }, [user]);

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await api.patch(`/api/users/${user.id}/`, settings);
      setMessage('Notification settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update settings. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.roles === 'student') return null; // Students don't need email notifications

  // Define role-specific notification options
  const getNotificationOptions = () => {
    switch (user.roles) {
      case 'tutor':
        return [
          {
            key: 'email_new_requests',
            label: 'New Tutoring Requests',
            description: 'Get notified when new requests are posted'
          },
          {
            key: 'email_disputes',
            label: 'Dispute Notifications',
            description: 'Get notified about session disputes'
          },
          {
            key: 'email_monthly_hours',
            label: 'Monthly Hours Summary',
            description: 'Get monthly tutoring hours summaries'
          },
          {
            key: 'email_monthly_reports',
            label: 'Monthly Report Reminders',
            description: 'Get reminders to complete monthly reports'
          }
        ];
      case 'parent':
        return [
          {
            key: 'email_replies',
            label: 'Tutor Replies',
            description: 'Get notified when tutors reply to your requests'
          },
          {
            key: 'email_disputes',
            label: 'Dispute Notifications', 
            description: 'Get notified about session disputes'
          },
          {
            key: 'email_monthly_hours',
            label: 'Monthly Hours Summary',
            description: 'Get monthly tutoring hours summaries'
          },
          {
            key: 'email_monthly_reports',
            label: 'Monthly Reports Available',
            description: 'Get notified when monthly reports are available'
          }
        ];
      case 'superuser':
      default:
        return [
          {
            key: 'email_new_requests',
            label: 'New Tutoring Requests',
            description: 'Get notified when new requests are posted'
          },
          {
            key: 'email_replies',
            label: 'Tutor Replies',
            description: 'Get notified when tutors reply to requests'
          },
          {
            key: 'email_disputes',
            label: 'Dispute Notifications',
            description: 'Get notified about session disputes'
          },
          {
            key: 'email_monthly_hours',
            label: 'Monthly Hours Summary',
            description: 'Get monthly tutoring hours summaries'
          },
          {
            key: 'email_monthly_reports',
            label: 'Monthly Reports',
            description: 'Get notified about monthly report activities'
          }
        ];
    }
  };

  const notificationOptions = getNotificationOptions();

  return (
    <div style={{
      background: '#fff',
      border: '2px solid #E1E1E1',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#192A88' }}>
        Email Notification Settings
      </h3>
      
      {/* Master toggle */}
      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.email_notifications_enabled}
            onChange={() => handleToggle('email_notifications_enabled')}
            style={{ marginRight: '0.5rem' }}
          />
          <strong>Enable All Email Notifications</strong>
        </label>
        <p style={{ margin: '0.5rem 0 0 1.5rem', fontSize: '0.9rem', color: '#666' }}>
          Turn off all email notifications
        </p>
      </div>

      {settings.email_notifications_enabled && (
        <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #192A88' }}>
          {notificationOptions.map((option) => (
            <div key={option.key} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings[option.key]}
                  onChange={() => handleToggle(option.key)}
                  style={{ marginRight: '0.5rem' }}
                />
                {option.label}
              </label>
              <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.8rem', color: '#666' }}>
                {option.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={saveSettings}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#ccc' : '#192A88',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        
        {message && (
          <span style={{
            color: message.includes('success') ? '#28a745' : '#dc3545',
            fontSize: '0.9rem'
          }}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;