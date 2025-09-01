// src/components/AdminNotificationTool.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const AdminNotificationTool = ({ onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'system',
    icon: '🔔',
    target_role: 'all', // all, parent, tutor, student
    priority: 'normal', // low, normal, high, urgent
    expires_at: '',
    send_immediately: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingNotifications, setExistingNotifications] = useState([]);

  // Predefined icons for different notification types
  const iconOptions = {
    'system': ['🔔', '⚙️', '📢', '⚠️'],
    'maintenance': ['🔧', '⚒️', '🚧', '🛠️'],
    'update': ['🆕', '✨', '📱', '🔄'],
    'announcement': ['📢', '📣', '📰', '🎉'],
    'warning': ['⚠️', '🚨', '⛔', '❗'],
    'success': ['✅', '🎉', '👍', '💚'],
    'info': ['ℹ️', '💡', '📋', '📌']
  };

  useEffect(() => {
    fetchExistingNotifications();
  }, []);

  const fetchExistingNotifications = async () => {
    try {
      const response = await api.get('/api/admin/system-notifications/');
      setExistingNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching existing notifications:', error);
      setExistingNotifications([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const notificationData = {
        ...formData,
        created_by: 'admin', // This should be the actual admin user ID
        created_at: new Date().toISOString(),
        expires_at: formData.expires_at || null
      };

      await api.post('/api/admin/system-notifications/', notificationData);
      
      alert(t('admin.notificationCreated', 'System notification created successfully!'));
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'system',
        icon: '🔔',
        target_role: 'all',
        priority: 'normal',
        expires_at: '',
        send_immediately: true
      });
      
      // Refresh existing notifications
      fetchExistingNotifications();
      
    } catch (error) {
      console.error('Error creating notification:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          t('admin.notificationCreateFailed', 'Failed to create system notification');
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm(t('admin.confirmDeleteNotification', 'Are you sure you want to delete this notification?'))) {
      return;
    }

    try {
      await api.delete(`/api/admin/system-notifications/${notificationId}/`);
      alert(t('admin.notificationDeleted', 'Notification deleted successfully!'));
      fetchExistingNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert(t('admin.notificationDeleteFailed', 'Failed to delete notification'));
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#192A88' }}>
            {t('admin.systemNotifications', 'System Notifications Manager')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Create New Notification Form */}
          <div>
            <h3 style={{ color: '#192A88', marginBottom: '1rem' }}>
              {t('admin.createNotification', 'Create New Notification')}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {t('admin.notificationTitle', 'Title')}
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                  placeholder={t('admin.titlePlaceholder', 'Enter notification title')}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {t('admin.notificationMessage', 'Message')}
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                  placeholder={t('admin.messagePlaceholder', 'Enter notification message')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('admin.notificationType', 'Type')}
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="system">System</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="update">Update</option>
                    <option value="announcement">Announcement</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="info">Info</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('admin.notificationIcon', 'Icon')}
                  </label>
                  <select
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    {iconOptions[formData.type]?.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('admin.targetRole', 'Target Role')}
                  </label>
                  <select
                    name="target_role"
                    value={formData.target_role}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="all">All Users</option>
                    <option value="parent">Parents Only</option>
                    <option value="tutor">Tutors Only</option>
                    <option value="student">Students Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    {t('admin.priority', 'Priority')}
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  {t('admin.expiresAt', 'Expires At (Optional)')}
                </label>
                <input
                  type="datetime-local"
                  name="expires_at"
                  value={formData.expires_at}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  name="send_immediately"
                  checked={formData.send_immediately}
                  onChange={handleInputChange}
                  id="send_immediately"
                />
                <label htmlFor="send_immediately" style={{ fontWeight: 'bold' }}>
                  {t('admin.sendImmediately', 'Send Immediately to All Users')}
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#192A88',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting 
                  ? t('admin.creating', 'Creating...') 
                  : t('admin.createNotification', 'Create Notification')
                }
              </button>
            </form>
          </div>

          {/* Existing Notifications List */}
          <div>
            <h3 style={{ color: '#192A88', marginBottom: '1rem' }}>
              {t('admin.existingNotifications', 'Existing System Notifications')}
            </h3>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {existingNotifications.length > 0 ? (
                existingNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      border: '1px solid #e1e1e1',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#192A88' }}>
                        {notification.icon} {notification.title}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '12px',
                          backgroundColor: notification.priority === 'urgent' ? '#dc3545' :
                                         notification.priority === 'high' ? '#fd7e14' :
                                         notification.priority === 'low' ? '#6c757d' : '#28a745',
                          color: 'white'
                        }}>
                          {notification.priority}
                        </span>
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: '1rem'
                          }}
                          title={t('admin.deleteNotification', 'Delete notification')}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                      {notification.message}
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Target: {notification.target_role}</span>
                      <span>Created: {new Date(notification.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {notification.expires_at && (
                      <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '0.25rem' }}>
                        Expires: {new Date(notification.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  {t('admin.noNotifications', 'No system notifications created yet')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationTool;