// src/pages/AdminDiscountRegistration.jsx
import React, { useState } from "react";
import { useUser } from "../components/UserProvider";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/AdminDiscountRegistration.css";

export default function AdminDiscountRegistration() {
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
        <p>Loading...</p>
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
      setError("All fields are required");
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
      setError(err.response?.data?.error || "Failed to save registration");
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
      <h1 className="discount-title">Receive Permanent 10% Discount</h1>

      {!selectedType ? (
        <div className="button-container">
          <button
            className="type-button email-button"
            onClick={() => handleTypeSelect("email")}
          >
            Email
          </button>
          <button
            className="type-button phone-button"
            onClick={() => handleTypeSelect("phone")}
          >
            Phone
          </button>
        </div>
      ) : (
        <div className="form-container">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Enter first name"
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Enter last name"
            />
          </div>

          <div className="form-group">
            <label>{selectedType === "email" ? "Email Address" : "Phone Number"}</label>
            <input
              type={selectedType === "email" ? "email" : "tel"}
              name="contactValue"
              value={formData.contactValue}
              onChange={handleInputChange}
              placeholder={selectedType === "email" ? "Enter email address" : "Enter phone number"}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Saving..." : "OK"}
            </button>
            <button
              className="cancel-button"
              onClick={resetPage}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
