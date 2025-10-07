// src/components/MultiSelectFilter.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/EventsFilters.css";

/** Generic multiselect dropdown for dashboard filters */
export default function MultiSelectFilter({ value, onChange, options, placeholder, labelKey }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const toggle = (option) => {
    const optionValue = labelKey ? option[labelKey] : option;
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
    );
  };

  const displayText = value.length
    ? (value.length === 1 ? value[0] : `${value.length} selected`)
    : placeholder;

  return (
    <div
      className="msel"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
      style={{ minWidth: "180px", position: "relative" }}
    >
      <button
        type="button"
        className="msel__btn"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "0 10px",
          height: "36px",
          fontSize: "0.95rem",
          outline: "none"
        }}
      >
        {displayText} ▾
      </button>

      {open && (
        <div className="msel__menu" style={{
          position: "absolute",
          zIndex: 1000,
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "4px",
          marginTop: "2px",
          maxHeight: "200px",
          overflowY: "auto",
          minWidth: "180px",
          width: "max-content",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          {options.map((option) => {
            const optionValue = labelKey ? option[labelKey] : option;
            const displayValue = labelKey ? option[labelKey] : option;
            return (
              <label key={optionValue} className="msel__row" style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.9rem",
                whiteSpace: "nowrap"
              }}>
                <input
                  type="checkbox"
                  checked={value.includes(optionValue)}
                  onChange={() => toggle(option)}
                  style={{ marginRight: "8px" }}
                />
                {displayValue}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}