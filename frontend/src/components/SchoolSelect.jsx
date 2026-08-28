// src/components/SchoolSelect.jsx
// Shared school dropdown used by every student-creation form. Fetches the
// admin-managed school list and pins a client-only "Other" option at the
// top (never stored as a School row) with a conditional free-text field.
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api";

const SchoolSelect = ({
  value, otherValue, onChange, onOtherChange, required = true,
  containerStyle, labelStyle, selectStyle, inputStyle, containerClassName = "form-group",
}) => {
  const { t } = useTranslation();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/schools/");
        if (!cancelled) {
          setSchools(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        console.error("Error fetching schools:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={containerClassName} style={containerStyle}>
      <label style={labelStyle}>{t('students.school', 'School')} {required && '*'}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={loading}
        style={selectStyle}
      >
        <option value="">{loading ? t('common.loading') : (t('students.selectSchool', 'Select a school'))}</option>
        <option value="other">{t('students.otherSchool', 'Other')}</option>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>{school.name}</option>
        ))}
      </select>

      {value === 'other' && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={t('students.enterSchoolName', "Enter the student's school name")}
          maxLength={200}
          required={required}
          style={{ marginTop: '0.5rem', ...inputStyle }}
        />
      )}
    </div>
  );
};

export default SchoolSelect;
