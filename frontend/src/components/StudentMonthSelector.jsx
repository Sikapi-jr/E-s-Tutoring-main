// src/components/StudentMonthSelector.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserProvider';

const StudentMonthSelector = ({ isOpen, onClose, onSelectStudent, tutorStudents, studentHours, existingReports }) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [selectedStudent, setSelectedStudent] = useState(null);

  const getMonthStatus = (studentId, month, year) => {
    const key = `${studentId}-${year}-${month}`;
    const hasReport = existingReports[key];
    const hasHours = studentHours[key];
    
    if (hasReport) return 'completed';
    if (hasHours && hasHours.hours >= 3) return 'missing';
    return 'insufficient';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745'; // Green
      case 'missing': return '#dc3545'; // Red
      case 'insufficient': return '#6c757d'; // Gray
      default: return '#6c757d';
    }
  };

  const getStatusText = (status, hours) => {
    switch (status) {
      case 'completed': return 'Report Completed ✓';
      case 'missing': return `Missing Report! (${hours?.toFixed(1) || 0}h)`;
      case 'insufficient': return hours ? `${hours.toFixed(1)}h (Need 3+)` : 'No hours';
      default: return 'No data';
    }
  };

  const handleMonthClick = (student, month, year, status) => {
    if (status === 'missing' || status === 'completed') {
      onSelectStudent({
        id: student.student || student.id,
        firstName: student.student_firstName || student.firstName || 'Student',
        lastName: student.student_lastName || student.lastName || ''
      }, month, year);
      onClose();
    }
  };

  const getAvailableMonths = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const months = [];
    
    // Show last 12 months from current month
    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      months.push({ month, year });
    }
    
    return months;
  };

  const formatMonth = (month, year) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  const availableMonths = getAvailableMonths();

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
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h2 style={{ margin: 0 }}>
            📊 Select Student & Month for Report
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

        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0' }}>Color Legend:</h4>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#28a745', borderRadius: '50%' }}></div>
              <span>Report Completed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#dc3545', borderRadius: '50%' }}></div>
              <span>Missing Report (3+ hours)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#6c757d', borderRadius: '50%' }}></div>
              <span>Insufficient Hours (&lt;3 hours)</span>
            </div>
          </div>
        </div>

        {tutorStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <p>No students found. Make sure you have accepted tutoring requests.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {tutorStudents.map((student, studentIndex) => {
              const studentId = student.student || student.id;
              const studentName = `${student.student_firstName || student.firstName || 'Student'} ${student.student_lastName || student.lastName || ''}`.trim();
              
              return (
                <div key={studentIndex} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  backgroundColor: 'white'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                    👤 {studentName}
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    {availableMonths.map(({ month, year }, monthIndex) => {
                      const status = getMonthStatus(studentId, month, year);
                      const hours = studentHours[`${studentId}-${year}-${month}`];
                      const isClickable = status === 'missing' || status === 'completed';
                      
                      return (
                        <div
                          key={monthIndex}
                          style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            border: `2px solid ${getStatusColor(status)}`,
                            backgroundColor: status === 'completed' ? '#d4edda' : 
                                           status === 'missing' ? '#f8d7da' : '#f8f9fa',
                            cursor: isClickable ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            opacity: isClickable ? 1 : 0.6
                          }}
                          onClick={() => isClickable && handleMonthClick(student, month, year, status)}
                          onMouseEnter={(e) => {
                            if (isClickable) {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isClickable) {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }
                          }}
                          title={getStatusText(status, hours?.hours)}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {formatMonth(month, year)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {getStatusText(status, hours?.hours)}
                          </div>
                          {status === 'missing' && (
                            <div style={{ 
                              marginTop: '0.5rem', 
                              fontSize: '0.7rem', 
                              color: '#dc3545',
                              fontWeight: 'bold'
                            }}>
                              CLICK TO CREATE
                            </div>
                          )}
                          {status === 'completed' && (
                            <div style={{ 
                              marginTop: '0.5rem', 
                              fontSize: '0.7rem', 
                              color: '#28a745',
                              fontWeight: 'bold'
                            }}>
                              CLICK TO EDIT
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: '2rem' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentMonthSelector;