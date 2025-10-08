// src/pages/MonthlyReports.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useUser } from '../components/UserProvider';
import MonthlyReportModal from '../components/MonthlyReportModal';

const MonthlyReports = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [studentsStatus, setStudentsStatus] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [targetMonth, setTargetMonth] = useState(null);
  const [targetYear, setTargetYear] = useState(null);
  const [monthName, setMonthName] = useState('');

  // For parent view
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all');
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.roles === 'tutor') {
        fetchStudentsStatus();
      } else if (user.roles === 'parent') {
        fetchParentReports();
        fetchStudents();
      }
    }
  }, [user]);

  const fetchStudentsStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/monthly-reports/students-status/');
      setStudentsStatus(response.data.students || []);
      setTargetMonth(response.data.target_month);
      setTargetYear(response.data.target_year);
      setMonthName(response.data.month_name);
    } catch (error) {
      console.error('Error fetching students status:', error);
      alert(t('monthlyReports.failedToLoadStudentsStatus'));
    } finally {
      setLoading(false);
    }
  };

  const fetchParentReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/monthly-reports/');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      alert(t('monthlyReports.reportError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/students/', { params: { id: user.account_id } });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent({
      id: student.student_id,
      firstName: student.student_name.split(' ')[0],
      lastName: student.student_name.split(' ').slice(1).join(' '),
      selectedMonth: student.report_month,
      selectedYear: student.report_year
    });
    setShowReportModal(true);
  };

  const handleReportSuccess = () => {
    setShowReportModal(false);
    setSelectedStudent(null);
    fetchStudentsStatus(); // Refresh the list
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMonth = (month, year) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  };

  const getHomeworkCompletionLabel = (value) => {
    const labels = {
      'excellent': t('monthlyReports.excellent'),
      'good': t('monthlyReports.good'),
      'satisfactory': t('monthlyReports.satisfactory'),
      'needs_improvement': t('monthlyReports.needsImprovement')
    };
    return labels[value] || value;
  };

  const getParticipationLevelLabel = (value) => {
    const labels = {
      'high': t('monthlyReports.high'),
      'medium': t('monthlyReports.medium'),
      'low': t('monthlyReports.low')
    };
    return labels[value] || value;
  };

  // Tutor View
  if (user?.roles === 'tutor') {
    if (loading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>{t('monthlyReports.title')}</h2>
          <p>{t('common.loading')}</p>
        </div>
      );
    }

    const pendingStudents = studentsStatus.filter(s => s.report_status === 'pending');
    const submittedStudents = studentsStatus.filter(s => s.report_status === 'submitted');
    const notRequiredStudents = studentsStatus.filter(s => s.report_status === 'not_required');

    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{t('monthlyReports.title')}</h2>
          <h3 style={{ margin: '0 0 1rem 0', color: '#666', fontWeight: 'normal' }}>
            Reports for {monthName}
          </h3>
          <p style={{ color: '#666', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
            Monthly reports are due for students with 4+ hours worked in {monthName}. Click on a student to fill out their report.
          </p>
        </div>

        {/* Pending Reports Section */}
        {pendingStudents.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              borderLeft: '4px solid #f39c12'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Pending Reports ({pendingStudents.length})
              </h3>
              <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
                These students need monthly reports submitted. Reports are due on the 1st of each month for the previous month.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {pendingStudents.map(student => (
                <div
                  key={student.student_id}
                  onClick={() => handleStudentClick(student)}
                  style={{
                    border: '2px solid #ffc107',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    backgroundColor: '#fffbf0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(255, 193, 7, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#ffc107',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    PENDING
                  </div>

                  <h3 style={{ margin: '0 0 1rem 0', color: '#333', paddingRight: '5rem' }}>
                    👤 {student.student_name}
                  </h3>

                  <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <strong>📊 Hours Logged:</strong> {student.hours_logged.toFixed(1)} hours
                  </div>

                  <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <strong>📅 Period:</strong> {formatMonth(student.report_month, student.report_year)}
                  </div>

                  <button style={{
                    width: '100%',
                    backgroundColor: '#ffc107',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e6b800'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ffc107'}
                  >
                    📝 Fill Out Report
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Reports Section */}
        {submittedStudents.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ✅ Submitted Reports ({submittedStudents.length})
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {submittedStudents.map(student => (
                <div
                  key={student.student_id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    SUBMITTED
                  </div>

                  <h3 style={{ margin: '0 0 1rem 0', color: '#333', paddingRight: '5rem' }}>
                    👤 {student.student_name}
                  </h3>

                  <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <strong>📊 Hours Logged:</strong> {student.hours_logged.toFixed(1)} hours
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    <strong>📅 Period:</strong> {formatMonth(student.report_month, student.report_year)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not Required Section */}
        {notRequiredStudents.length > 0 && (
          <div>
            <details style={{ marginTop: '2rem' }}>
              <summary style={{
                cursor: 'pointer',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                ℹ️ Students Without Required Reports ({notRequiredStudents.length})
              </summary>
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p style={{ marginBottom: '1rem', color: '#666' }}>
                  These students had less than 4 hours logged in {monthName}, so reports are not required.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {notRequiredStudents.map(student => (
                    <div
                      key={student.student_id}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '20px',
                        fontSize: '0.9rem'
                      }}
                    >
                      {student.student_name} ({student.hours_logged.toFixed(1)}h)
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {pendingStudents.length === 0 && submittedStudents.length === 0 && notRequiredStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <h3>📊 No students found</h3>
            <p>You don't have any students assigned yet.</p>
          </div>
        )}

        {/* Report Modal */}
        <MonthlyReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          onSuccess={handleReportSuccess}
        />
      </div>
    );
  }

  // Parent View (existing implementation with minor updates)
  if (user?.roles === 'parent') {
    if (loading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>{t('monthlyReports.title')}</h2>
          <p>{t('common.loading')}</p>
        </div>
      );
    }

    const filteredReports = reports.filter(report => {
      const studentMatch = selectedStudentFilter === 'all' || report.student.toString() === selectedStudentFilter;
      const yearMatch = !selectedYear || report.year === selectedYear;
      return studentMatch && yearMatch;
    });

    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>{t('monthlyReports.title')}</h2>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p style={{ margin: 0, color: '#666' }}>
            View monthly progress reports for your children. Tutors submit reports when they've worked 4+ hours with a student in a month.
          </p>
        </div>

        {/* Filters */}
        {students.length > 0 && (
          <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>
                Filter by Student:
              </label>
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="all">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.id.toString()}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </div>

            {reports.length > 0 && (
              <div>
                <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>
                  Filter by Year:
                </label>
                <select
                  value={selectedYear || 'all'}
                  onChange={(e) => setSelectedYear(e.target.value === 'all' ? null : parseInt(e.target.value))}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="all">All Years</option>
                  {[...new Set(reports.map(r => r.year))].sort((a, b) => b - a).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <h3>📊 {t('monthlyReports.noReports')}</h3>
            <p>No reports have been submitted yet. Tutors submit reports when they've worked 4+ hours with your child in a month.</p>
          </div>
        ) : (
          <>
            {/* Group reports by year and month */}
            {(() => {
              const groupedReports = filteredReports.reduce((acc, report) => {
                const year = report.year;
                const month = report.month;

                if (!acc[year]) acc[year] = {};
                if (!acc[year][month]) acc[year][month] = [];

                acc[year][month].push(report);
                return acc;
              }, {});

              const sortedYears = Object.keys(groupedReports).sort((a, b) => b - a);

              return sortedYears.map(year => (
                <div key={year} style={{ marginBottom: '3rem' }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    marginBottom: '1.5rem',
                    color: '#333',
                    borderBottom: '2px solid #192A88',
                    paddingBottom: '0.5rem'
                  }}>
                    📅 {year}
                  </h3>

                  {Object.keys(groupedReports[year])
                    .sort((a, b) => b - a)
                    .map(month => (
                      <div key={month} style={{ marginBottom: '2rem' }}>
                        <h4 style={{
                          fontSize: '1.2rem',
                          marginBottom: '1rem',
                          color: '#666',
                          backgroundColor: '#f8f9fa',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          {formatMonth(parseInt(month), parseInt(year))} ({groupedReports[year][month].length} reports)
                        </h4>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                          gap: '1.5rem'
                        }}>
                          {groupedReports[year][month].map(report => (
                            <div
                              key={report.id}
                              style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '1.5rem',
                                backgroundColor: 'white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                              }}
                              onClick={() => setSelectedReport(report)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: '#28a745'
                              }} title="Report Submitted" />

                              <h3 style={{ margin: '0 0 1rem 0', color: '#333', paddingRight: '2rem' }}>
                                👤 {report.student_name}
                              </h3>

                              <div style={{ marginBottom: '0.5rem' }}>
                                <strong>👨‍🏫 {t('monthlyReports.tutor')}:</strong> {report.tutor_name}
                              </div>

                              <div style={{ marginBottom: '0.5rem' }}>
                                <strong>📅 Submitted:</strong> {formatDate(report.submitted_at || report.created_at)}
                              </div>

                              <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                color: '#666',
                                marginBottom: '1rem'
                              }}>
                                <strong>Overall Progress:</strong><br />
                                {report.overall_progress && report.overall_progress.length > 150
                                  ? `${report.overall_progress.substring(0, 150)}...`
                                  : report.overall_progress || 'N/A'
                                }
                              </div>

                              <button style={{
                                width: '100%',
                                backgroundColor: '#192A88',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#192A88'}
                              >
                                📖 View Full Report
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ));
            })()}
          </>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
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
          }}
          onClick={() => setSelectedReport(null)}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
              }}>
                <h2 style={{ margin: 0 }}>
                  {t('monthlyReports.reportFor', { student: selectedReport.student_name })}
                </h2>
                <button
                  onClick={() => setSelectedReport(null)}
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

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{t('monthlyReports.month')}:</strong> {formatMonth(selectedReport.month, selectedReport.year)}
                  </div>
                  <div>
                    <strong>{t('monthlyReports.tutor')}:</strong> {selectedReport.tutor_name}
                  </div>
                  <div>
                    <strong>{t('monthlyReports.submittedOn')}:</strong> {formatDate(selectedReport.submitted_at || selectedReport.created_at)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>1. Overall Progress</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.overall_progress || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>2. Strengths</h4>
                <p style={{ backgroundColor: '#d4edda', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.strengths || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>3. Challenges</h4>
                <p style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.challenges || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>4. Work Habits & Effort</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.work_habits || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>5. Confidence & Attitude</h4>
                <p style={{ backgroundColor: '#e7f3ff', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.confidence_attitude || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>6. Homework & Practice</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.homework_practice || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>7. Parent Support</h4>
                <p style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.parent_support || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4>8. Looking Ahead</h4>
                <p style={{ backgroundColor: '#e2e3e5', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.looking_ahead || 'N/A'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => setSelectedReport(null)}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default/other roles
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>{t('monthlyReports.title')}</h2>
      <p>This page is only accessible to tutors and parents.</p>
    </div>
  );
};

export default MonthlyReports;
