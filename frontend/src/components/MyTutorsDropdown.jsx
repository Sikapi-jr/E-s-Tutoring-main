// src/components/MyTutorsDropdown.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import TutorComplaintModal from './TutorComplaintModal';
import '../styles/MyTutorsDropdown.css';

const MyTutorsDropdown = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const click = (e) =>
      ref.current && !ref.current.contains(e.target) && setIsOpen(false);
    const esc = (e) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [isOpen]);

  const fetchTutors = async () => {
    if (tutors.length > 0) return; // Don't refetch if already loaded
    
    setLoading(true);
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

  const handleDropdownClick = () => {
    if (!isOpen) {
      fetchTutors();
    }
    setIsOpen(!isOpen);
  };

  const handleComplaintClick = (tutor, event) => {
    event.stopPropagation();
    setSelectedTutor(tutor);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTutor(null);
  };

  return (
    <>
      <div className="my-tutors-dropdown" ref={ref}>
        <button
          className="my-tutors-btn"
          onClick={handleDropdownClick}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          👨‍🏫 My Tutor{tutors.length !== 1 ? 's' : ''} {isOpen ? '▴' : '▾'}
        </button>

        {isOpen && (
          <div className="my-tutors-menu">
            {loading && (
              <div className="my-tutors-loading">Loading...</div>
            )}
            
            {error && (
              <div className="my-tutors-error">{error}</div>
            )}
            
            {!loading && !error && tutors.length === 0 && (
              <div className="my-tutors-empty">No tutors assigned yet</div>
            )}
            
            {!loading && !error && tutors.length > 0 && (
              <div className="tutors-list">
                {tutors.map((tutor) => (
                  <div key={tutor.id} className="tutor-item">
                    <div className="tutor-info">
                      <div className="tutor-name">
                        {tutor.firstName} {tutor.lastName}
                      </div>
                      <div className="tutor-email">{tutor.email}</div>
                      <div className="tutor-subject">{tutor.subject}</div>
                    </div>
                    <button
                      className="complaint-btn-small"
                      onClick={(e) => handleComplaintClick(tutor, e)}
                      title={t('home.reportConcern')}
                    >
                      📝
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <TutorComplaintModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        tutorData={selectedTutor}
        onSubmitSuccess={() => {
          console.log('Complaint submitted successfully');
        }}
      />
    </>
  );
};

export default MyTutorsDropdown;