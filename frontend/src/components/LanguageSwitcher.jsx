import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = memo(({ className = "" }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
  };

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' }
  ];

  return (
    <div className={`language-switcher ${className}`}>
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
          fontSize: '0.9rem',
          cursor: 'pointer',
          minWidth: '80px',
          width: '80px',
          height: '32px',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export default LanguageSwitcher;