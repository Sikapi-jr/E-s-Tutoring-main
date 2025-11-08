// src/pages/AdminDiscountRegistration.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/AdminDiscountRegistration.css";

export default function AdminDiscountRegistration() {
  const { t } = useTranslation();
  const { user } = useUser();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState(null); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactValue: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Early return if user is not loaded yet
  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Admin gate
  if (!user.is_superuser && user.roles !== 'admin') {
    navigate("/");
    return null;
  }

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setFormData({
      firstName: "",
      lastName: "",
      contactValue: "",
    });
    setError("");
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.contactValue.trim()) {
      setError(t('discount.allFieldsRequired'));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/admin/discount-registration/", {
        first_name: formData.firstName,
        last_name: formData.lastName,
        contact_type: selectedType,
        contact_value: formData.contactValue,
      });

      // Success - reset the page
      resetPage();
    } catch (err) {
      console.error("Error saving discount registration:", err);
      setError(err.response?.data?.error || t('discount.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => {
    setSelectedType(null);
    setFormData({
      firstName: "",
      lastName: "",
      contactValue: "",
    });
    setError("");
  };

  return (
    <div className="discount-registration-page">
      <h1 className="discount-title">{t('discount.title')}</h1>

      {!selectedType ? (
        <div className="button-container">
          <button
            className="type-button email-button"
            onClick={() => handleTypeSelect("email")}
          >
            {t('discount.email')}
          </button>
          <button
            className="type-button phone-button"
            onClick={() => handleTypeSelect("phone")}
          >
            {t('discount.phone')}
          </button>
        </div>
      ) : (
        <div className="form-container">
          <div className="form-group">
            <label>{t('discount.firstName')}</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder={t('discount.firstNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('discount.lastName')}</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder={t('discount.lastNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{selectedType === "email" ? t('discount.emailAddress') : t('discount.phoneNumber')}</label>
            <input
              type={selectedType === "email" ? "email" : "tel"}
              name="contactValue"
              value={formData.contactValue}
              onChange={handleInputChange}
              placeholder={selectedType === "email" ? t('discount.emailPlaceholder') : t('discount.phonePlaceholder')}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? t('discount.saving') : t('discount.ok')}
            </button>
            <button
              className="cancel-button"
              onClick={resetPage}
              disabled={loading}
            >
              {t('discount.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
