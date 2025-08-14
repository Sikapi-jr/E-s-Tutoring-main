// src/pages/StatusMulti.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/EventsFilters.css";

/** Small multiselect dropdown for event statuses */
export default function StatusMulti({ value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const toggle = (name) => {
    onChange(
      value.includes(name) ? value.filter((v) => v !== name) : [...value, name]
    );
  };

  return (
    <div
      className="msel"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        className="msel__btn"
        onClick={() => setOpen((o) => !o)}
      >
        {value.length ? value.join(", ") : t('dashboard.allStatuses')} ▾
      </button>

      {open && (
        <div className="msel__menu">
          {["default", "declined"].map((tag) => (
            <label key={tag} className="msel__row">
              <input
                type="checkbox"
                checked={value.includes(tag)}
                onChange={() => toggle(tag)}
              />
              {t(`status.${tag}`)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
