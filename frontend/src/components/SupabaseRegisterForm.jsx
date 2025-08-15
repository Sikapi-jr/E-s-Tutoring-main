import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useSupabaseAuth.jsx';
import '../styles/RegistrationForm.css';

const SupabaseRegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    role: 'parent',
    city: 'Toronto',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const cities = [
    'Ajax', 'Aurora', 'Barrie', 'Belleville', 'Brampton', 'Brantford', 'Burlington',
    'Cambridge', 'Chatham-Kent', 'Clarington', 'Collingwood', 'Cornwall', 'Dryden',
    'Georgina', 'Grimsby', 'Guelph', 'Hamilton', 'Huntsville', 'Innisfil',
    'Kawartha Lakes', 'Kenora', 'Kingston', 'Kitchener', 'Leamington', 'London',
    'Markham', 'Midland', 'Milton', 'Mississauga', 'Newmarket', 'Niagara Falls',
    'Niagara-on-the-Lake', 'North Bay', 'Oakville', 'Orangeville', 'Orillia',
    'Oshawa', 'Ottawa', 'Peterborough', 'Pickering', 'Quinte West', 'Richmond Hill',
    'Sarnia', 'St. Catharines', 'St. Thomas', 'Stratford', 'Sudbury', 'Tecumseh',
    'Thunder Bay', 'Timmins', 'Toronto', 'Vaughan', 'Wasaga Beach', 'Waterloo',
    'Welland', 'Whitby', 'Windsor', 'Woodstock'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await signUp(
      formData.email,
      formData.password,
      {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        city: formData.city,
        address: formData.address
      }
    );

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(t('auth.checkEmailToConfirm'));
      // Don't navigate immediately - wait for email confirmation
    }

    setLoading(false);
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>{t('auth.createAccount')}</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">{t('auth.firstName')}</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">{t('auth.lastName')}</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">{t('auth.username')}</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="username"
            placeholder="Enter username"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="role">{t('auth.role')}</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="parent">{t('auth.parent')}</option>
              <option value="tutor">{t('auth.tutor')}</option>
              <option value="student">{t('auth.student')}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">{t('auth.city')}</label>
            <select
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={loading}
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">{t('auth.address')}</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={loading}
            placeholder={t('auth.addressPlaceholder')}
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>

        <div className="auth-links">
          <Link to="/login">{t('auth.alreadyHaveAccount')}</Link>
        </div>
      </form>
    </div>
  );
};

export default SupabaseRegisterForm;