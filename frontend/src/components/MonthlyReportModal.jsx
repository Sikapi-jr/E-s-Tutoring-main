// src/components/MonthlyReportModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useUser } from './UserProvider';

const MonthlyReportModal = ({ isOpen, onClose, student, onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(null);
  const [formData, setFormData] = useState({
    student: student?.id || '',
    month: student?.selectedMonth || new Date().getMonth() + 1,
    year: student?.selectedYear || new Date().getFullYear(),
    progress_summary: '',
    strengths: '',
    areas_for_improvement: '',
    homework_completion: 'good',
    participation_level: 'medium',
    goals_for_next_month: '',
    additional_comments: ''
  });

  // Update form data when student changes
  useEffect(() => {
    if (student) {
      setFormData(prev => ({
        ...prev,
        student: student.id,
        month: student.selectedMonth || new Date().getMonth() + 1,
        year: student.selectedYear || new Date().getFullYear()
      }));
    }
  }, [student]);

  // Check hours when student or date changes
  useEffect(() => {
    if (student && user && formData.month && formData.year) {
      checkEligibleHours();
    }
  }, [student, formData.month, formData.year]);

  const checkEligibleHours = async () => {
    try {
      const response = await api.get('/api/tutor-student-hours/', {
        params: {
          tutor_id: user.account_id,
          student_id: student.id,
          month: formData.month,
          year: formData.year
        }
      });
      setHours(response.data);
    } catch (error) {
      console.error('Error checking hours:', error);
      setHours(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hours?.eligible_for_report) {
      alert(t('monthlyReports.insufficient'));
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        student: student.id
      };

      await api.post('/api/monthly-reports/create/', submitData);
      
      alert(t('monthlyReports.reportSubmitted'));
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                          error.response?.data?.detail || 
                          t('monthlyReports.reportError');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0 }}>
            {t('monthlyReports.createReport')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {student && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>
              {t('monthlyReports.reportFor', { student: `${student.firstName} ${student.lastName}` })}
            </h4>
            {hours && (
              <div style={{ fontSize: '0.9rem', color: hours.eligible_for_report ? '#28a745' : '#dc3545' }}>
                {t('monthlyReports.hoursThisMonth', { hours: hours.total_hours })} 
                {!hours.eligible_for_report && ` - ${t('monthlyReports.insufficient')}`}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {t('monthlyReports.month')}
              </label>
              <select
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2023, i).toLocaleDateString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {t('monthlyReports.year')}
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={i} value={new Date().getFullYear() - i}>
                    {new Date().getFullYear() - i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('monthlyReports.progressSummary')} *
            </label>
            <textarea
              name="progress_summary"
              value={formData.progress_summary}
              onChange={handleInputChange}
              required
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('monthlyReports.strengths')} *
            </label>
            <textarea
              name="strengths"
              value={formData.strengths}
              onChange={handleInputChange}
              required
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('monthlyReports.areasForImprovement')} *
            </label>
            <textarea
              name="areas_for_improvement"
              value={formData.areas_for_improvement}
              onChange={handleInputChange}
              required
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {t('monthlyReports.homeworkCompletion')} *
              </label>
              <select
                name="homework_completion"
                value={formData.homework_completion}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="excellent">{t('monthlyReports.excellent')}</option>
                <option value="good">{t('monthlyReports.good')}</option>
                <option value="satisfactory">{t('monthlyReports.satisfactory')}</option>
                <option value="needs_improvement">{t('monthlyReports.needsImprovement')}</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {t('monthlyReports.participationLevel')} *
              </label>
              <select
                name="participation_level"
                value={formData.participation_level}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="high">{t('monthlyReports.high')}</option>
                <option value="medium">{t('monthlyReports.medium')}</option>
                <option value="low">{t('monthlyReports.low')}</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('monthlyReports.goalsNextMonth')} *
            </label>
            <textarea
              name="goals_for_next_month"
              value={formData.goals_for_next_month}
              onChange={handleInputChange}
              required
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              {t('monthlyReports.additionalComments')}
            </label>
            <textarea
              name="additional_comments"
              value={formData.additional_comments}
              onChange={handleInputChange}
              rows="3"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !hours?.eligible_for_report}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: loading || !hours?.eligible_for_report ? '#6c757d' : '#007bff',
                color: 'white',
                cursor: loading || !hours?.eligible_for_report ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? t('common.loading') : t('monthlyReports.submitReport')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthlyReportModal;