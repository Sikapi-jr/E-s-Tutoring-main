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
    overall_progress: '',
    strengths: '',
    challenges: '',
    work_habits: '',
    confidence_attitude: '',
    homework_practice: '',
    parent_support: '',
    looking_ahead: ''
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
      alert(t('monthlyReports.insufficientHoursAlert'));
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
      const errorMessage = error.response?.data?.error ||
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
        maxWidth: '1200px',
        width: '95%',
        maxHeight: '95vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0 }}>
            {t('monthlyReports.title')}
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
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0' }}>
              {t('monthlyReports.reportFor', { student: `${student.firstName} ${student.lastName}` })}
            </h4>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <strong>{t('monthlyReports.month')}:</strong> {new Date(formData.year, formData.month - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </div>
            {hours && (
              <div style={{ fontSize: '0.9rem', color: hours.eligible_for_report ? '#28a745' : '#dc3545', marginTop: '0.5rem' }}>
                <strong>{t('monthlyReports.hoursLogged')}:</strong> {hours.total_hours} {t('common.hours')}
                {!hours.eligible_for_report && ` - ${t('monthlyReports.need4Hours')}`}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Overall Progress */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              1. {t('monthlyReports.overallProgressLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.overallProgressQuestion')}
            </p>
            <textarea
              name="overall_progress"
              value={formData.overall_progress}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.overallProgressPlaceholder')}
            />
          </div>

          {/* Strengths */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              2. {t('monthlyReports.strengths')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.strengthsQuestion')}
            </p>
            <textarea
              name="strengths"
              value={formData.strengths}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.strengthsPlaceholder')}
            />
          </div>

          {/* Challenges */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              3. {t('monthlyReports.challengesLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.challengesQuestion')}
            </p>
            <textarea
              name="challenges"
              value={formData.challenges}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.challengesPlaceholder')}
            />
          </div>

          {/* Work Habits & Effort */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              4. {t('monthlyReports.workHabitsLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.workHabitsQuestion')}
            </p>
            <textarea
              name="work_habits"
              value={formData.work_habits}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.workHabitsPlaceholder')}
            />
          </div>

          {/* Confidence & Attitude */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              5. {t('monthlyReports.confidenceLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.confidenceQuestion')}
            </p>
            <textarea
              name="confidence_attitude"
              value={formData.confidence_attitude}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.confidencePlaceholder')}
            />
          </div>

          {/* Homework & Practice */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              6. {t('monthlyReports.homeworkLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.homeworkQuestion')}
            </p>
            <textarea
              name="homework_practice"
              value={formData.homework_practice}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.homeworkPlaceholder')}
            />
          </div>

          {/* Parent Support */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              7. {t('monthlyReports.parentSupportLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.parentSupportQuestion')}
            </p>
            <textarea
              name="parent_support"
              value={formData.parent_support}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.parentSupportPlaceholder')}
            />
          </div>

          {/* Looking Ahead */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              8. {t('monthlyReports.lookingAheadLabel')} *
            </label>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
              {t('monthlyReports.lookingAheadQuestion')}
            </p>
            <textarea
              name="looking_ahead"
              value={formData.looking_ahead}
              onChange={handleInputChange}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                fontSize: '0.95rem'
              }}
              placeholder={t('monthlyReports.lookingAheadPlaceholder')}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
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
                backgroundColor: loading || !hours?.eligible_for_report ? '#6c757d' : '#192A88',
                color: 'white',
                cursor: loading || !hours?.eligible_for_report ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? t('monthlyReports.submitting') : t('monthlyReports.submitReport')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonthlyReportModal;
