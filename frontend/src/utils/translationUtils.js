// Translation utility functions
import { useTranslation } from 'react-i18next';

// Hook for easy translation with common patterns
export const useAppTranslation = () => {
  const { t, i18n } = useTranslation();

  // Common translation patterns
  const tr = {
    // Navigation items
    nav: (key) => t(`navigation.${key}`),
    
    // Common UI elements
    common: (key) => t(`common.${key}`),
    
    // Form labels and validation
    form: (key) => t(`forms.${key}`),
    
    // Error messages
    error: (key) => t(`errors.${key}`),
    
    // Success messages
    success: (key) => t(`success.${key}`),
    
    // Home page specific
    home: (key) => t(`home.${key}`),
    
    // Dashboard specific
    dashboard: (key) => t(`dashboard.${key}`),
    
    // Auth related
    auth: (key) => t(`auth.${key}`),
    
    // Direct translation
    t: (key, options) => t(key, options)
  };

  return { tr, t, i18n };
};

// Translation keys mapping for common UI elements
export const TRANSLATION_KEYS = {
  // Common actions
  SUBMIT: 'common.submit',
  CANCEL: 'common.cancel',
  SAVE: 'common.save',
  DELETE: 'common.delete',
  EDIT: 'common.edit',
  CLOSE: 'common.close',
  LOADING: 'common.loading',
  ERROR: 'common.error',
  SUCCESS: 'common.success',
  
  // Navigation
  HOME: 'navigation.home',
  DASHBOARD: 'navigation.dashboard',
  SETTINGS: 'navigation.settings',
  PROFILE: 'navigation.profile',
  LOGIN: 'navigation.login',
  LOGOUT: 'navigation.logout',
  
  // Form fields
  EMAIL: 'common.email',
  PASSWORD: 'common.password',
  FIRST_NAME: 'common.firstName',
  LAST_NAME: 'common.lastName',
  
  // Time and date
  DATE: 'common.date',
  TIME: 'common.time',
  START_TIME: 'events.startTime',
  END_TIME: 'events.endTime',
  
  // Status
  PENDING: 'dashboard.pending',
  ACCEPTED: 'dashboard.accepted',
  REJECTED: 'dashboard.rejected',
  
  // Common phrases
  NO_DATA: 'common.noData',
  SEARCH: 'common.search',
  FILTER: 'common.filter'
};

// Helper function to replace static text with translation calls
export const replaceWithTranslation = (text, context = 'common') => {
  const commonReplacements = {
    'Loading...': 't("common.loading")',
    'Submit': 't("common.submit")',
    'Cancel': 't("common.cancel")',
    'Save': 't("common.save")',
    'Delete': 't("common.delete")',
    'Edit': 't("common.edit")',
    'Close': 't("common.close")',
    'Yes': 't("common.yes")',
    'No': 't("common.no")',
    'Email': 't("common.email")',
    'Password': 't("common.password")',
    'Home': 't("navigation.home")',
    'Dashboard': 't("navigation.dashboard")',
    'Settings': 't("navigation.settings")',
    'Login': 't("navigation.login")',
    'Logout': 't("navigation.logout")',
    'Date': 't("common.date")',
    'Time': 't("common.time")',
    'Hours': 't("common.hours")',
    'Status': 't("common.status")',
    'Description': 't("common.description")',
    'Title': 't("common.title")',
    'Search': 't("common.search")',
    'Filter': 't("common.filter")'
  };

  return commonReplacements[text] || `t("${context}.${text.toLowerCase().replace(/\s+/g, '')}")`;
};

// Component wrapper for automatic translation
export const withTranslation = (Component) => {
  return (props) => {
    const { tr, t, i18n } = useAppTranslation();
    return <Component {...props} tr={tr} t={t} i18n={i18n} />;
  };
};