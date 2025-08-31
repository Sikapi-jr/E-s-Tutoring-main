// src/pages/MonthlyReports.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { useUser } from '../components/UserProvider';
import MonthlyReportModal from '../components/MonthlyReportModal';
import StudentMonthSelector from '../components/StudentMonthSelector';

const MonthlyReports = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedYear, setSelectedYear] = useState(null);
  
  // New report modal states
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
  const [tutorStudents, setTutorStudents] = useState([]);
  const [studentHours, setStudentHours] = useState({});
  const [existingReports, setExistingReports] = useState({});

  useEffect(() => {
    if (user) {
      fetchReports();
      if (user.roles === 'parent') {
        fetchStudents();
      } else if (user.roles === 'tutor') {
        fetchTutorStudents();
        fetchStudentHours();
      }
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/monthly-reports/');
      setReports(response.data);
      processExistingReports(response.data);
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

  const fetchTutorStudents = async () => {
    try {
      const response = await api.get('/api/TutorStudents/', { params: { tutor: user.account_id } });
      setTutorStudents(response.data);
    } catch (error) {
      console.error('Error fetching tutor students:', error);
    }
  };

  const fetchStudentHours = async () => {
    try {
      // Get all hours for this tutor to analyze which months have sufficient hours
      const response = await api.get('/api/parentHours/', { params: { tutor: user.account_id } });
      const hours = response.data;
      
      // Group hours by student and month/year
      const hoursMap = {};
      hours.forEach(hour => {
        const date = new Date(hour.date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const studentId = hour.student;
        const key = `${studentId}-${year}-${month}`;
        
        if (!hoursMap[key]) {
          hoursMap[key] = { hours: 0, sessions: 0 };
        }
        hoursMap[key].hours += parseFloat(hour.totalTime);
        hoursMap[key].sessions += 1;
      });
      
      setStudentHours(hoursMap);
    } catch (error) {
      console.error('Error fetching student hours:', error);
    }
  };

  const processExistingReports = (reports) => {
    const reportsMap = {};
    reports.forEach(report => {
      const key = `${report.student}-${report.year}-${report.month}`;
      reportsMap[key] = report;
    });
    setExistingReports(reportsMap);
  };

  const filteredReports = reports.filter(report => {
    const studentMatch = selectedStudent === 'all' || report.student.toString() === selectedStudent;
    const yearMatch = !selectedYear || report.year === selectedYear;
    return studentMatch && yearMatch;
  });

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatMonth = (month, year) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  };

  const handleNewReport = () => {
    setShowStudentSelector(true);
  };

  const handleStudentSelect = (student, month, year) => {
    setSelectedStudentForReport({
      ...student,
      selectedMonth: month,
      selectedYear: year
    });
    setShowStudentSelector(false);
    setShowNewReportModal(true);
  };

  const handleReportSuccess = () => {
    setShowNewReportModal(false);
    setSelectedStudentForReport(null);
    fetchReports(); // Refresh reports after successful submission
    fetchStudentHours(); // Refresh hours data
  };

  // Function to get months where student has hours but no report
  const getMissingReports = () => {
    const missing = [];
    
    Object.keys(studentHours).forEach(key => {
      const [studentId, year, month] = key.split('-');
      const hours = studentHours[key];
      
      if (hours.hours >= 3 && !existingReports[key]) {
        const student = tutorStudents.find(s => s.student?.toString() === studentId || s.id?.toString() === studentId);
        if (student) {
          missing.push({
            student: {
              id: studentId,
              name: `${student.student_firstName || student.firstName || 'Unknown'} ${student.student_lastName || student.lastName || ''}`.trim()
            },
            month: parseInt(month),
            year: parseInt(year),
            hours: hours.hours,
            sessions: hours.sessions
          });
        }
      }
    });
    
    return missing.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  const getMonthStatus = (studentId, month, year) => {
    const key = `${studentId}-${year}-${month}`;
    const hasReport = existingReports[key];
    const hasHours = studentHours[key];
    
    if (hasReport) return 'completed';
    if (hasHours && hasHours.hours >= 3) return 'missing';
    return 'insufficient';
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{t('monthlyReports.title')}</h2>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        marginBottom: '2rem' 
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>{t('monthlyReports.title')}</h2>
        
        {/* New Report Button for Tutors */}
        {user?.roles === 'tutor' && (
          <button
            onClick={handleNewReport}
            style={{
              backgroundColor: '#ffd700',
              color: '#333',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e6c200';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffd700';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            📊 {t('monthlyReports.createReport')}
          </button>
        )}
      </div>

      {/* Missing Reports Alert for Tutors */}
      {user?.roles === 'tutor' && (() => {
        const missingReports = getMissingReports();
        return missingReports.length > 0 && (
          <div style={{ 
            marginBottom: '2rem', 
            padding: '1.5rem', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            borderLeft: '4px solid #f39c12'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Missing Reports ({missingReports.length})
            </h3>
            <p style={{ margin: '0 0 1rem 0', color: '#856404' }}>
              You have students with 3+ hours that need monthly reports:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {missingReports.map((missing, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedStudentForReport({
                      id: missing.student.id,
                      firstName: missing.student.name.split(' ')[0],
                      lastName: missing.student.name.split(' ').slice(1).join(' '),
                      selectedMonth: missing.month,
                      selectedYear: missing.year
                    });
                    setShowNewReportModal(true);
                  }}
                  title={`${missing.hours.toFixed(1)} hours in ${missing.sessions} sessions`}
                >
                  {missing.student.name} - {formatMonth(missing.month, missing.year)}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Page Description based on role */}
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        {user?.roles === 'parent' ? (
          <p style={{ margin: 0, color: '#666' }}>
            View monthly progress reports submitted by your children's tutors. Reports are only created when tutors have taught at least 3 hours in a month.
          </p>
        ) : user?.roles === 'tutor' ? (
          <p style={{ margin: 0, color: '#666' }}>
            Manage all monthly reports for your students. Use the "New Report" button above to create reports for any month where you've taught 3+ hours.
          </p>
        ) : (
          <p style={{ margin: 0, color: '#666' }}>
            Monthly progress reports showing student development and tutor feedback.
          </p>
        )}
      </div>

      {/* Statistics Summary */}
      {reports.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'white', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#192A88' }}>{reports.length}</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Total Reports</p>
          </div>
          
          {user?.roles === 'tutor' && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'white', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffd700' }}>
                {[...new Set(reports.map(r => r.student))].length}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Students Reported</p>
            </div>
          )}
          
          {user?.roles === 'parent' && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: 'white', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffc107' }}>
                {[...new Set(reports.map(r => r.tutor_name))].length}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Tutors</p>
            </div>
          )}

          <div style={{ 
            padding: '1rem', 
            backgroundColor: 'white', 
            border: '1px solid #ddd', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#17a2b8' }}>
              {formatMonth(new Date().getMonth() + 1, new Date().getFullYear())}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Current Month</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {user?.roles === 'parent' && students.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>
            Filter by Student:
          </label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
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
      )}

      {/* Year Filter for better organization */}
      {reports.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>
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

      {filteredReports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <h3>📊 {t('monthlyReports.noReports')}</h3>
          {user?.roles === 'tutor' && (
            <p style={{ marginTop: '1rem' }}>
              Create your first monthly report by going to the Home page and clicking the 📊 button next to a student (requires 3+ hours of tutoring in a month).
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Reports organized by year and month */}
          {(() => {
            // Group reports by year, then by month
            const groupedReports = filteredReports.reduce((acc, report) => {
              const year = report.year;
              const month = report.month;
              
              if (!acc[year]) acc[year] = {};
              if (!acc[year][month]) acc[year][month] = [];
              
              acc[year][month].push(report);
              return acc;
            }, {});
            
            // Sort years and months in descending order (most recent first)
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
                  .sort((a, b) => b - a) // Sort months in descending order
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
                            {/* Report status indicator */}
                            <div style={{
                              position: 'absolute',
                              top: '1rem',
                              right: '1rem',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: '#ffd700'
                            }} title="Report Submitted" />
                            
                            <h3 style={{ margin: '0 0 1rem 0', color: '#333', paddingRight: '2rem' }}>
                              👤 {report.student_name}
                            </h3>
                            
                            {user?.roles === 'parent' && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <strong>👨‍🏫 {t('monthlyReports.tutor')}:</strong> {report.tutor_name}
                              </div>
                            )}
                            
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong>📅 Submitted:</strong> {formatDate(report.created_at)}
                            </div>
                            
                            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                              <div style={{ fontSize: '0.9rem' }}>
                                <strong>📝 Homework:</strong> {getHomeworkCompletionLabel(report.homework_completion)}
                              </div>
                              <div style={{ fontSize: '0.9rem' }}>
                                <strong>🙋 Participation:</strong> {getParticipationLevelLabel(report.participation_level)}
                              </div>
                            </div>
                            
                            <div style={{
                              backgroundColor: '#f8f9fa',
                              padding: '0.75rem',
                              borderRadius: '4px',
                              fontSize: '0.9rem',
                              color: '#666',
                              marginBottom: '1rem'
                            }}>
                              <strong>Progress Summary:</strong><br />
                              {report.progress_summary.length > 150 
                                ? `${report.progress_summary.substring(0, 150)}...`
                                : report.progress_summary
                              }
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center' 
                            }}>
                              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                                Report #{report.id}
                              </div>
                              <button style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '800px',
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
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <strong>{t('monthlyReports.month')}:</strong> {formatMonth(selectedReport.month, selectedReport.year)}
                </div>
                <div>
                  <strong>{t('monthlyReports.tutor')}:</strong> {selectedReport.tutor_name}
                </div>
                <div>
                  <strong>{t('monthlyReports.submittedOn')}:</strong> {formatDate(selectedReport.created_at)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>{t('monthlyReports.progressSummary')}</h4>
              <p style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
                {selectedReport.progress_summary}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>{t('monthlyReports.strengths')}</h4>
              <p style={{ backgroundColor: '#d4edda', padding: '1rem', borderRadius: '4px' }}>
                {selectedReport.strengths}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>{t('monthlyReports.areasForImprovement')}</h4>
              <p style={{ backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
                {selectedReport.areas_for_improvement}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <h4>{t('monthlyReports.homeworkCompletion')}</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px' }}>
                  {getHomeworkCompletionLabel(selectedReport.homework_completion)}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <h4>{t('monthlyReports.participationLevel')}</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '4px' }}>
                  {getParticipationLevelLabel(selectedReport.participation_level)}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>{t('monthlyReports.goalsNextMonth')}</h4>
              <p style={{ backgroundColor: '#e2e3e5', padding: '1rem', borderRadius: '4px' }}>
                {selectedReport.goals_for_next_month}
              </p>
            </div>

            {selectedReport.additional_comments && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4>{t('monthlyReports.additionalComments')}</h4>
                <p style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px' }}>
                  {selectedReport.additional_comments}
                </p>
              </div>
            )}

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

      {/* Student Month Selector Modal */}
      <StudentMonthSelector
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        onSelectStudent={handleStudentSelect}
        tutorStudents={tutorStudents}
        studentHours={studentHours}
        existingReports={existingReports}
      />

      {/* New Report Modal */}
      <MonthlyReportModal
        isOpen={showNewReportModal}
        onClose={() => {
          setShowNewReportModal(false);
          setSelectedStudentForReport(null);
        }}
        student={selectedStudentForReport}
        onSuccess={handleReportSuccess}
      />
    </div>
  );
};

export default MonthlyReports;