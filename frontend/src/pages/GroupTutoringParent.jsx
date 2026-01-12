// src/pages/GroupTutoringParent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringParent = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, studentsRes, enrollmentsRes] = await Promise.all([
        api.get('/api/group-tutoring/classes/'),
        api.get('/api/group-tutoring/enrollments/my_students/'),
        api.get('/api/group-tutoring/enrollments/')
      ]);
      setClasses(classesRes.data);
      setStudents(studentsRes.data);
      setMyEnrollments(enrollmentsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load group tutoring information');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = (classItem) => {
    if (students.length === 0) {
      // Redirect to students page to add a student
      if (confirm('You need to add a student first. Would you like to go to the Students page?')) {
        navigate('/students');
      }
      return;
    }

    setSelectedClass(classItem);
    setShowEnrollModal(true);
  };

  const handleEnrollSubmit = async (e) => {
    e.preventDefault();

    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    try {
      await api.post('/api/group-tutoring/enrollments/', {
        tutoring_class: selectedClass.id,
        student: selectedStudent
      });
      alert('Enrollment request submitted successfully! You will receive an email with further instructions.');
      setShowEnrollModal(false);
      setSelectedStudent('');
      fetchData();
    } catch (err) {
      console.error('Error enrolling:', err);
      alert('Failed to enroll: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #192A88 0%, #3a4db5 100%)',
        color: 'white',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Group French Classes
        </h1>
        <p style={{
          fontSize: '1.5rem',
          marginBottom: '2rem',
          opacity: 0.95
        }}>
          Learn French in a fun, interactive group setting!
        </p>
        <p style={{
          fontSize: '1.2rem',
          marginBottom: '0',
          opacity: 0.9
        }}>
          Expert tutors • Small class sizes • Flexible schedules
        </p>
      </div>

      {/* My Enrollments Section */}
      {myEnrollments.length > 0 && (
        <div style={{
          padding: '3rem 2rem',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88' }}>
              My Enrollments
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem'
            }}>
              {myEnrollments.map(enrollment => (
                <div
                  key={enrollment.id}
                  style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '2px solid #28a745'
                  }}
                >
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#192A88' }}>
                    {enrollment.class_title}
                  </h3>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <strong>Student:</strong> {enrollment.student_name}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    <strong>Difficulty:</strong> {enrollment.class_difficulty}
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      backgroundColor: enrollment.status === 'enrolled' ? '#28a745' : enrollment.status === 'pending_diagnostic' ? '#ffc107' : '#6c757d',
                      color: 'white',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      {enrollment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Classes Section */}
      <div style={{
        padding: '3rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#192A88', textAlign: 'center' }}>
          Available Classes - Enroll Now!
        </h2>

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        {classes.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666', padding: '2rem' }}>
            There are no open classes currently. Please check back soon!
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {classes.map(classItem => {
              const alreadyEnrolled = myEnrollments.some(e => e.tutoring_class === classItem.id);

              return (
                <div
                  key={classItem.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '2px solid #e9ecef',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                >
                  <h3 style={{ margin: '0 0 1rem 0', color: '#192A88', fontSize: '1.5rem' }}>
                    {classItem.title}
                  </h3>

                  {classItem.description && (
                    <p style={{ marginBottom: '1rem', color: '#666', lineHeight: '1.5' }}>
                      {classItem.description}
                    </p>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <strong>📚 Difficulty:</strong> {classItem.difficulty.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <strong>🗓 Duration:</strong> {new Date(classItem.start_date).toLocaleDateString()} - {new Date(classItem.end_date).toLocaleDateString()}
                    </div>
                    {classItem.schedule_days && classItem.schedule_days.length > 0 && (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        <strong>📅 Schedule:</strong> {classItem.schedule_days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        {classItem.schedule_time && ` at ${classItem.schedule_time}`}
                      </div>
                    )}
                    {classItem.location && (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        <strong>📍 Location:</strong> {classItem.location}
                      </div>
                    )}
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <strong>👥 Enrollment:</strong> {classItem.enrolled_count} / {classItem.max_students}
                      {classItem.is_full && <span style={{ color: '#dc3545', marginLeft: '0.5rem' }}>(FULL)</span>}
                    </div>
                    {classItem.tutor_details && classItem.tutor_details.length > 0 && (
                      <div style={{ fontSize: '0.95rem' }}>
                        <strong>👨‍🏫 Tutors:</strong> {classItem.tutor_details.map(t => t.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {alreadyEnrolled ? (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#d4edda',
                      color: '#155724',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      ✓ Already Enrolled
                    </div>
                  ) : classItem.is_full ? (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      Class Full
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEnrollClick(classItem)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                      Enroll Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && selectedClass && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginTop: 0, color: '#192A88' }}>
              Enroll in {selectedClass.title}
            </h2>

            <form onSubmit={handleEnrollSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Select Student *
                </label>
                <select
                  required
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">-- Select a student --</option>
                  {students.map(student => {
                    // Check if this student is already enrolled in this class
                    const alreadyEnrolled = myEnrollments.some(
                      e => e.tutoring_class === selectedClass.id && e.student === student.id
                    );

                    return (
                      <option
                        key={student.id}
                        value={student.id}
                        disabled={alreadyEnrolled}
                      >
                        {student.name} {alreadyEnrolled ? '(Already enrolled)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedClass.difficulty !== 'beginner' && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem'
                }}>
                  <strong>Note:</strong> This class requires a diagnostic test. You will receive an email with a link to complete the test.
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSelectedStudent('');
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoringParent;
