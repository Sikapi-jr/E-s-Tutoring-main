// src/components/MyTutors.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import TutorComplaintModal from './TutorComplaintModal';
import '../styles/MyTutors.css';

const MyTutors = () => {
  const { t } = useTranslation();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      const response = await api.get('/api/student/tutors/');
      setTutors(response.data.tutors);
    } catch (err) {
      setError('Failed to load tutors');
      console.error('Error fetching tutors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintClick = (tutor) => {
    setSelectedTutor(tutor);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTutor(null);
  };

  if (loading) {
    return <div className="my-tutors-loading">Loading your tutors...</div>;
  }

  if (error) {
    return <div className="my-tutors-error">{error}</div>;
  }

  if (tutors.length === 0) {
    return (
      <div className="my-tutors-empty">
        <h3>My Tutors</h3>
        <p>You don't have any assigned tutors yet.</p>
      </div>
    );
  }

  return (
    <div className="my-tutors">
      <h3>My Tutor{tutors.length > 1 ? 's' : ''}</h3>
      <div className="tutors-list">
        {tutors.map((tutor) => (
          <div key={tutor.id} className="tutor-card">
            <div className="tutor-info">
              <h4>{tutor.firstName} {tutor.lastName}</h4>
              <p className="tutor-email">📧 {tutor.email}</p>
              <p className="tutor-subject">📚 {tutor.subject}</p>
            </div>
            <button
              className="complaint-btn"
              onClick={() => handleComplaintClick(tutor)}
              title="Report a concern about this tutor"
            >
              📝 Report Concern
            </button>
          </div>
        ))}
      </div>

      <TutorComplaintModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        tutorData={selectedTutor}
        onSubmitSuccess={() => {
          // Could add a success message or refresh data here
          console.log('Complaint submitted successfully');
        }}
      />
    </div>
  );
};

export default MyTutors;