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

/**
 * Turns an axios error into a specific, actionable message instead of a
 * generic "please try again" - prefers whatever detail the backend sent.
 * @param {Object} err - The error object from axios
 * @param {string} fallback - Message to use when nothing more specific is available
 * @returns {string} - The formatted error message
 */
export const describeApiError = (err, fallback) => {
  if (!err?.response) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }

  const { status, data } = err.response;
  const backendMessage = typeof data === 'string'
    ? data
    : (data?.error || data?.detail || data?.message);

  // Unhandled server errors can come back as an HTML error page rather than
  // JSON - never show that raw markup to the user.
  const looksLikeHtml = typeof backendMessage === 'string' && backendMessage.trim().startsWith('<');

  if (backendMessage && typeof backendMessage === 'string' && !looksLikeHtml) {
    return backendMessage;
  }

  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'The requested information could not be found.';
  if (status >= 500) return 'The server ran into a problem. Please try again in a moment.';

  return fallback;
};