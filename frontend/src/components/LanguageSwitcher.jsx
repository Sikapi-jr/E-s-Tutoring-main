import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = memo(({ className = "" }) => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  return (
    <div className={`language-switcher ${className}`}>
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{
          padding: '0.2rem 0.3rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
          fontSize: '1.2rem',
          cursor: 'pointer',
          minWidth: '50px',
          height: '24px',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag}
          </option>
        ))}
      </select>
    </div>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export default LanguageSwitcher;