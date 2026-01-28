// src/pages/GroupTutoringEnrollmentDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringEnrollmentDetail = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [enrollmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch enrollment details, files, and quizzes
      const [enrollmentsRes, filesRes, quizzesRes] = await Promise.all([
        api.get('/api/group-tutoring/enrollments/'),
        api.get(`/api/group-tutoring/student-files/${enrollmentId}/`),
        api.get(`/api/group-tutoring/student-quizzes/${enrollmentId}/`)
      ]);

      // Find this enrollment
      const enrollmentData = enrollmentsRes.data.find(e => e.id === parseInt(enrollmentId));
      if (!enrollmentData) {
        setError('Enrollment not found');
        return;
      }
      setEnrollment(enrollmentData);

      // Fetch class info
      const classRes = await api.get(`/api/group-tutoring/classes/${enrollmentData.tutoring_class}/`);
      setClassInfo(classRes.data);

      setFiles(filesRes.data);
      setQuizzes(quizzesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load enrollment details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/group-tutoring')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#192A88',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Group Tutoring
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #192A88 0%, #3a4db5 100%)',
        color: 'white',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/group-tutoring')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            &larr; Back to Group Tutoring
          </button>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
            {enrollment?.class_title}
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Student: <strong>{enrollment?.student_name}</strong>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* Schedule Section */}
        {classInfo && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
              Schedule Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Days</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.schedule_days?.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') || 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Time</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.schedule_time || 'Not set'}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Duration</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.duration_minutes} minutes
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Location</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.location || 'Not set'}
                  {classInfo.location_link && (
                    <a
                      href={classInfo.location_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: '0.5rem',
                        color: '#192A88',
                        textDecoration: 'none',
                        fontWeight: 'bold'
                      }}
                    >
                      (Join Link)
                    </a>
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Class Period</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {new Date(classInfo.start_date).toLocaleDateString()} - {new Date(classInfo.end_date).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Difficulty</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.difficulty?.replace(/_/g, ' ').toUpperCase() || 'Not set'}
                </div>
              </div>
            </div>
            {classInfo.tutor_details && classInfo.tutor_details.length > 0 && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e9ecef' }}>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Tutors</div>
                <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                  {classInfo.tutor_details.map(t => t.name).join(', ')}
                </div>
              </div>
            )}
            {classInfo.description && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e9ecef' }}>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Description</div>
                <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                  {classInfo.description}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Files Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
            Class Files
          </h2>
          {files.length === 0 ? (
            <p style={{ color: '#666', margin: 0, padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              No files available for this class yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {files.map(file => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#333', fontSize: '1.05rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {file.title}
                      {file.week_number && (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          backgroundColor: '#192A88',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Week {file.week_number}
                        </span>
                      )}
                      {file.is_current && (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                    {file.description && (
                      <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.35rem' }}>
                        {file.description}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.35rem' }}>
                      Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                  <a
                    href={file.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.6rem 1.25rem',
                      backgroundColor: '#192A88',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      marginLeft: '1rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quizzes Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#192A88', fontSize: '1.5rem' }}>
            Quizzes
          </h2>
          {quizzes.length === 0 ? (
            <p style={{ color: '#666', margin: 0, padding: '2rem', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              No quizzes available for this class yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', fontSize: '1.15rem' }}>
                        {quiz.title}
                      </div>
                      {quiz.description && (
                        <div style={{ fontSize: '0.95rem', color: '#666', marginTop: '0.35rem' }}>
                          {quiz.description}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <span>Scheduled: {new Date(quiz.scheduled_date).toLocaleDateString()}</span>
                        {quiz.time_limit_minutes && (
                          <span>Time Limit: {quiz.time_limit_minutes} min</span>
                        )}
                        <span>Passing Score: {quiz.passing_score}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      {quiz.submission ? (
                        <div>
                          <span style={{
                            padding: '0.35rem 1rem',
                            borderRadius: '20px',
                            backgroundColor: quiz.submission.passed ? '#28a745' : '#dc3545',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            display: 'inline-block'
                          }}>
                            {quiz.submission.passed ? 'PASSED' : 'NOT PASSED'}
                          </span>
                          <div style={{ fontSize: '1.1rem', marginTop: '0.5rem', fontWeight: '600', color: '#333' }}>
                            Score: {quiz.submission.score?.toFixed(1)}%
                          </div>
                          {quiz.submission.submitted_at && (
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                              Submitted: {new Date(quiz.submission.submitted_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          padding: '0.35rem 1rem',
                          borderRadius: '20px',
                          backgroundColor: quiz.is_active ? '#ffc107' : '#6c757d',
                          color: quiz.is_active ? '#333' : 'white',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          {quiz.is_active ? 'AVAILABLE' : 'NOT YET AVAILABLE'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupTutoringEnrollmentDetail;
