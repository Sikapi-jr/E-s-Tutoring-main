/**
 * Extracts meaningful error messages from API responses
 * @param {Object} err - The error object from axios
 * @param {Function} t - The translation function
 * @returns {string} - The formatted error message
 */
export const getErrorMessage = (err, t) => {
  if (err.response) {
    // Extract the actual error message from backend
    const backendMessage = err.response.data?.detail || 
                          err.response.data?.error || 
                          err.response.data?.message ||
                          (typeof err.response.data === 'string' ? err.response.data : null);
    
    // Handle field-specific errors (like username already exists)
    if (err.response.data && typeof err.response.data === 'object') {
      const fieldErrors = [];
      Object.keys(err.response.data).forEach(field => {
        if (field === 'detail' || field === 'error' || field === 'message') {
          return; // Skip these as they're handled above
        }
        
        if (Array.isArray(err.response.data[field])) {
          fieldErrors.push(`${field}: ${err.response.data[field].join(', ')}`);
        } else if (typeof err.response.data[field] === 'string') {
          fieldErrors.push(`${field}: ${err.response.data[field]}`);
        }
      });
      
      if (fieldErrors.length > 0) {
        return fieldErrors.join('\n');
      }
    }
    
    if (backendMessage) {
      return backendMessage;
    }
    
    // Fallback to generic message with status code
    return `${t('errors.serverError')} (${err.response.status})`;
    
  } else if (err.request) {
    return t('errors.networkError');
  } else {
    return t('errors.somethingWentWrong');
  }
};