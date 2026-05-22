import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import './LanguageSwitch.css';

function LanguageSwitch({ className = '' }) {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button
      type="button"
      className={`language-switch ${className}`}
      onClick={toggleLanguage}
      title={t('switchTo')}
      aria-label={t('switchTo')}
    >
      <span className="language-switch-orbit" aria-hidden="true"></span>
      <span className="language-switch-code">{t('languageShort')}</span>
      <span className="language-switch-name">{t('languageName')}</span>
      <span className="language-switch-next">{language === 'en' ? 'TL' : 'EN'}</span>
    </button>
  );
}

export default LanguageSwitch;
