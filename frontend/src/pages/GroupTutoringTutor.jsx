// src/pages/GroupTutoringTutor.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../components/UserProvider';
import api from '../api';

const GroupTutoringTutor = () => {
  const { t } = useTranslation();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classFiles, setClassFiles] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [classSessions, setClassSessions] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    file: null,
    week_number: '',
    is_current: false
  });
  const [error, setError] = useState('');

  // Session management (attendance + meeting notes)
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionModalLoading, setSessionModalLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassDetails(selectedClass.id);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/group-tutoring/classes/');
      setClasses(response.data);
      if (response.data.length > 0) {
        setSelectedClass(response.data[0]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async (classId) => {
    try {
      const [filesRes, enrollmentsRes, sessionsRes] = await Promise.all([
        api.get(`/api/group-tutoring/classes/${classId}/files/`),
        api.get(`/api/group-tutoring/classes/${classId}/enrollments/`),
        api.get(`/api/group-tutoring/admin/classes/${classId}/sessions/`)
      ]);
      setClassFiles(filesRes.data);
      setEnrollments(enrollmentsRes.data.filter(e => e.status === 'enrolled'));
      setClassSessions(sessionsRes.data);
    } catch (err) {
      console.error('Error fetching class details:', err);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();

    if (!uploadData.file) {
      alert('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('title', uploadData.title);
    formData.append('file', uploadData.file);
    if (uploadData.week_number) {
      formData.append('week_number', uploadData.week_number);
    }
    formData.append('is_current', uploadData.is_current);

    try {
      await api.post(`/api/group-tutoring/classes/${selectedClass.id}/upload_file/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('File uploaded successfully!');
      setShowUploadModal(false);
      setUploadData({ title: '', file: null, week_number: '', is_current: false });
      fetchClassDetails(selectedClass.id);
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  // ========== Session (Attendance + Meeting Notes) Handlers ==========
  const handleOpenSessionModal = async (session) => {
    setSelectedSession(session);
    setAttendanceData([]);
    setSessionNotes('');
    setShowSessionModal(true);
    setSessionModalLoading(true);

    try {
      const [attendanceRes, notesRes] = await Promise.all([
        api.get(`/api/group-tutoring/admin/classes/${selectedClass.id}/attendance/${session.session_date}/`),
        api.get(`/api/group-tutoring/admin/classes/${selectedClass.id}/sessions/${session.session_date}/notes/`)
      ]);
      setAttendanceData(attendanceRes.data.attendance || []);
      setSessionNotes(notesRes.data.notes || '');
    } catch (err) {
      console.error('Error fetching session details:', err);
    } finally {
      setSessionModalLoading(false);
    }
  };

  const handleAttendanceChange = (enrollmentId, field, value) => {
    setAttendanceData(prev => prev.map(a =>
      a.enrollment_id === enrollmentId ? { ...a, [field]: value } : a
    ));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;

    setSessionModalLoading(true);
    try {
      await api.post(`/api/group-tutoring/admin/classes/${selectedClass.id}/attendance/${selectedSession.session_date}/`, {
        attendance: attendanceData.map(a => ({
          enrollment_id: a.enrollment_id,
          status: a.status || 'attended',
          notes: a.notes || ''
        }))
      });
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert('Failed to save attendance');
    } finally {
      setSessionModalLoading(false);
    }
  };

  const handleSaveSessionNotes = async () => {
    if (!selectedSession) return;

    setSessionModalLoading(true);
    try {
      await api.patch(`/api/group-tutoring/admin/classes/${selectedClass.id}/sessions/${selectedSession.session_date}/notes/`, {
        notes: sessionNotes
      });
      alert('Meeting notes saved successfully!');
    } catch (err) {
      console.error('Error saving meeting notes:', err);
      alert('Failed to save meeting notes');
    } finally {
      setSessionModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Group Tutoring</h2>
        <p>You are not assigned to any classes yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Group Tutoring Classes</h1>

      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Left Sidebar - Class List */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Classes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                style={{
                  padding: '1rem',
                  backgroundColor: selectedClass?.id === cls.id ? '#192A88' : 'white',
                  color: selectedClass?.id === cls.id ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: selectedClass?.id === cls.id ? 'bold' : 'normal'
                }}
              >
                <div style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{cls.title}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {cls.enrolled_count} / {cls.max_students} students
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content - Class Details */}
        <div>
          {selectedClass && (
            <>
              {/* Class Info */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h2 style={{ marginTop: 0, color: '#192A88' }}>{selectedClass.title}</h2>
                <p style={{ marginBottom: '1rem' }}>{selectedClass.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                  <div><strong>Difficulty:</strong> {selectedClass.difficulty.replace('_', ' ').toUpperCase()}</div>
                  <div><strong>Subject:</strong> {selectedClass.subject}</div>
                  <div><strong>Duration:</strong> {new Date(selectedClass.start_date).toLocaleDateString()} - {new Date(selectedClass.end_date).toLocaleDateString()}</div>
                  <div><strong>Location:</strong> {selectedClass.location || 'TBD'}</div>
                </div>
              </div>

              {/* Enrolled Students */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h3 style={{ marginTop: 0 }}>Enrolled Students ({enrollments.length})</h3>
                {enrollments.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {enrollments.map(enrollment => (
                      <div key={enrollment.id} style={{
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>{enrollment.student_name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          Parent: {enrollment.parent_name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666' }}>No students enrolled yet.</p>
                )}
              </div>

              {/* Sessions - Attendance & Meeting Notes */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                <h3 style={{ marginTop: 0 }}>Class Sessions</h3>
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
                  Click a session to mark attendance or add meeting notes.
                </p>

                {classSessions.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Time</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSessions.map(session => (
                        <tr key={session.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem' }}>{session.start_time?.substring(0, 5)}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {session.is_cancelled ? (
                              <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Cancelled</span>
                            ) : (
                              <span style={{ color: '#28a745' }}>Scheduled</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button
                              onClick={() => handleOpenSessionModal(session)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                backgroundColor: '#192A88',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              Attendance &amp; Notes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#666' }}>No sessions scheduled yet.</p>
                )}
              </div>

              {/* Class Files */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Class Materials</h3>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    + Upload File
                  </button>
                </div>

                {classFiles.length > 0 ? (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Title</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Week</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Uploaded</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classFiles.map(file => (
                        <tr key={file.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {file.title}
                            {file.is_current && (
                              <span style={{
                                marginLeft: '0.5rem',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#28a745',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}>
                                CURRENT
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {file.week_number ? `Week ${file.week_number}` : 'General'}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <a
                              href={file.file}
                              download
                              style={{
                                color: '#192A88',
                                textDecoration: 'none',
                                fontWeight: 'bold'
                              }}
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#666' }}>No files uploaded yet.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
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
            <h2 style={{ marginTop: 0 }}>Upload Class File</h2>

            <form onSubmit={handleFileUpload}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  File Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Week Number (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={uploadData.week_number}
                  onChange={(e) => setUploadData({ ...uploadData, week_number: e.target.value })}
                  placeholder="Leave empty for general files"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={uploadData.is_current}
                    onChange={(e) => setUploadData({ ...uploadData, is_current: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Mark as current week's material</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ title: '', file: null, week_number: '', is_current: false });
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
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance & Meeting Notes Modal */}
      {showSessionModal && selectedSession && (
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
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>
                {new Date(selectedSession.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <button
                onClick={() => setShowSessionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {sessionModalLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                {/* Attendance */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '0.75rem' }}>Attendance</h3>
                  {attendanceData.length === 0 ? (
                    <p style={{ color: '#666' }}>No enrolled students found for this class.</p>
                  ) : (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceData.map(record => (
                            <tr key={record.enrollment_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                              <td style={{ padding: '0.75rem' }}>{record.student_name}</td>
                              <td style={{ padding: '0.75rem' }}>
                                <select
                                  value={record.status || 'attended'}
                                  onChange={(e) => handleAttendanceChange(record.enrollment_id, 'status', e.target.value)}
                                  style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                >
                                  <option value="attended">Attended</option>
                                  <option value="absent">Absent</option>
                                  <option value="cancelled_advance">Cancelled in Advance</option>
                                </select>
                              </td>
                              <td style={{ padding: '0.75rem' }}>
                                <input
                                  type="text"
                                  value={record.notes || ''}
                                  onChange={(e) => handleAttendanceChange(record.enrollment_id, 'notes', e.target.value)}
                                  placeholder="Optional notes..."
                                  style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <button
                        onClick={handleSaveAttendance}
                        disabled={sessionModalLoading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: sessionModalLoading ? '#ccc' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: sessionModalLoading ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Save Attendance
                      </button>
                    </>
                  )}
                </div>

                {/* Meeting Notes */}
                <div>
                  <h3 style={{ marginBottom: '0.75rem' }}>Meeting Notes</h3>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '-0.5rem' }}>
                    Record what was covered, how the class went, or anything relevant for next time.
                  </p>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={6}
                    placeholder="Write your meeting notes here..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      fontFamily: 'inherit',
                      marginBottom: '1rem'
                    }}
                  />
                  <button
                    onClick={handleSaveSessionNotes}
                    disabled={sessionModalLoading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: sessionModalLoading ? '#ccc' : '#192A88',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: sessionModalLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Save Notes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTutoringTutor;
