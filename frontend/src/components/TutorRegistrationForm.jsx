import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import '../styles/Form.css';

const TutorRegistrationForm = ({ onClose }) => {
  const { t } = useTranslation();
  const CITY_CHOICES = [
    "Ajax", "Aurora", "Barrie", "Belleville", "Brampton", "Brantford", "Burlington",
    "Cambridge", "Chatham-Kent", "Clarington", "Collingwood", "Cornwall", "Dryden",
    "Georgina", "Grimsby", "Guelph", "Hamilton", "Huntsville", "Innisfil",
    "Kawartha Lakes", "Kenora", "Kingston", "Kitchener", "Leamington", "London",
    "Markham", "Midland", "Milton", "Mississauga", "Newmarket", "Niagara Falls",
    "Niagara-on-the-Lake", "North Bay", "Oakville", "Orangeville", "Orillia",
    "Oshawa", "Ottawa", "Peterborough", "Pickering", "Quinte West", "Richmond Hill",
    "Sarnia", "St. Catharines", "St. Thomas", "Stratford", "Sudbury", "Tecumseh",
    "Thunder Bay", "Timmins", "Toronto", "Vaughan", "Wasaga Beach", "Waterloo",
    "Welland", "Whitby", "Windsor", "Woodstock"
  ];

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    roles: 'tutor'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (password) => {
    // Only allow keyboard characters: ASCII printable characters (32-126)
    const keyboardCharsRegex = /^[ -~]*$/;
    
    if (!keyboardCharsRegex.test(password)) {
      setPasswordError("Password can only contain keyboard characters");
      return false;
    }
    
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      if (value) {
        validatePassword(value);
      } else {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password before submitting
    if (!validatePassword(formData.password)) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/admin/create-tutor/', formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error creating tutor:', err);
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to create tutor account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ color: '#28a745', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h3 style={{ color: '#28a745', marginBottom: '0.5rem' }}>Tutor Created Successfully!</h3>
        <p style={{ color: '#666' }}>The new tutor account has been created and verification email sent.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 1rem' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <input
          className="form-input"
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder={t('auth.username', 'Username')}
          required
        />

        <input
          className="form-input"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder={t('common.password', 'Password')}
          required
        />
        {passwordError && <p className="password-error">{passwordError}</p>}

        <input
          className="form-input"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder={t('common.email', 'Email')}
          required
        />

        <input
          className="form-input"
          type="tel"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder={t('auth.phoneNumber', 'Phone Number')}
          required
        />

        <input
          className="form-input"
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          placeholder={t('common.firstName', 'First Name')}
          required
        />

        <input
          className="form-input"
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
          placeholder={t('common.lastName', 'Last Name')}
          required
        />

        <input
          className="form-input"
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder={t('auth.homeAddress', 'Home Address')}
          required
        />

        <select
          className="form-input"
          name="city"
          value={formData.city}
          onChange={handleChange}
          required
        >
          <option value="" disabled>{t('auth.selectCity', 'Select City')}</option>
          {CITY_CHOICES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '0.75rem', 
          borderRadius: '4px', 
          margin: '1rem 0',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          {t('common.cancel', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '0.75rem',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? t('common.loading', 'Creating...') : t('admin.createTutor', 'Create Tutor')}
        </button>
      </div>
    </form>
  );
};

export default TutorRegistrationForm;