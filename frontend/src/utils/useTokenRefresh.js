import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import api from '../api';

const REFRESH_ENDPOINT = import.meta.env.VITE_REFRESH_URL || "/api/token/refresh/";

// Decode JWT to check expiry (without external library)
const isTokenExpiringSoon = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = exp - now;

    // Refresh if token expires in less than 1 hour
    const oneHour = 60 * 60 * 1000;
    return timeUntilExpiry < oneHour;
  } catch (e) {
    console.error('Error decoding token:', e);
    return true;
  }
};

// Function to refresh token
const refreshToken = async () => {
  const refresh = localStorage.getItem(REFRESH_TOKEN);
  if (!refresh) return false;

  try {
    const response = await api.post(
      REFRESH_ENDPOINT,
      { refresh },
      { timeout: 10000, auth: false } // auth: false to skip adding Authorization header
    );

    const newAccess = response.data.access || response.data.token || response.data.access_token;
    if (newAccess) {
      localStorage.setItem(ACCESS_TOKEN, newAccess);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }

  return false;
};

/**
 * Hook to automatically refresh access token on page navigation
 * if it's close to expiry (within 1 hour)
 */
export const useTokenRefresh = () => {
  const location = useLocation();

  useEffect(() => {
    const checkAndRefresh = async () => {
      const accessToken = localStorage.getItem(ACCESS_TOKEN);

      if (accessToken && isTokenExpiringSoon(accessToken)) {
        await refreshToken();
      }
    };

    checkAndRefresh();
  }, [location.pathname]); // Run on every navigation
};

export default useTokenRefresh;
