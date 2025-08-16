import axios from "axios";
import axiosRetry from "axios-retry";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const REFRESH_ENDPOINT = import.meta.env.VITE_REFRESH_URL || "/api/token/refresh/";

console.log('API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  BASE_URL: BASE_URL,
  REFRESH_ENDPOINT: REFRESH_ENDPOINT
});

// Paths that should NOT send a bearer token
const PUBLIC_PATHS = [/\/login\/?$/i, /\/register\/?$/i];

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    err.code === "ECONNABORTED" ||              // Axios timeout
    [429, 502, 503, 504].includes(err?.response?.status),
});

// ---- Helpers ----
const isPublic = (config) => {
  if (config.auth === false) return true; // per-request opt-out
  const url = (config.url || "");
  return PUBLIC_PATHS.some((rx) => rx.test(url));
};

// ---- Request interceptor: add bearer by default ----
api.interceptors.request.use(
  (config) => {
    if (!isPublic(config)) {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Enhanced API methods with caching ----
import requestCache from './utils/requestCache';

// Cached GET method
api.getCached = async (url, params = {}, options = {}) => {
  const { ttl = 5 * 60 * 1000, force = false } = options; // 5 min default TTL
  
  // Generate full URL for cache key
  const fullUrl = `${BASE_URL}${url}`;
  
  // Check cache first (unless forced)
  if (!force) {
    const cached = requestCache.get(fullUrl, params);
    if (cached) {
      return { data: cached };
    }
    
    // Check if request is already pending
    const pending = requestCache.getPending(fullUrl, params);
    if (pending) {
      const data = await pending;
      return { data };
    }
  }
  
  // Make the API call
  const apiCall = async () => {
    try {
      const response = await api.get(url, { params });
      
      // Cache successful responses
      requestCache.set(fullUrl, params, response.data, ttl);
      
      return response.data;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
  
  // Set as pending and return promise
  const data = await requestCache.setPending(fullUrl, params, apiCall());
  return { data };
};

// Method to invalidate cache
api.invalidateCache = (url, params = {}) => {
  const fullUrl = `${BASE_URL}${url}`;
  requestCache.invalidate(fullUrl, params);
};

// Method to clear all cache
api.clearCache = () => {
  requestCache.clear();
};

// ---- Response interceptor: auto-refresh on 401 and retry ----
let isRefreshing = false;
let pending = [];

const runPending = (newToken) => {
  pending.forEach(({ resolve, reject, originalRequest }) => {
    if (newToken) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      resolve(api(originalRequest));
    } else {
      reject(new Error("Refresh failed"));
    }
  });
  pending = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // If not a 401, or already retried, just fail
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest.__isRetry
    ) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem(REFRESH_TOKEN);
    if (!refresh) {
      // no refresh token -> log out
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      return Promise.reject(error);
    }

    // Queue requests while a single refresh is in-flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject, originalRequest });
      });
    }

    isRefreshing = true;

    try {
      const resp = await api.post(
        REFRESH_ENDPOINT,
        { refresh },
        { timeout: 10000 }
      );
      const newAccess = resp.data.access || resp.data.token || resp.data.access_token;
      if (!newAccess) throw new Error("No access token in refresh response");

      // store & apply new access token
      localStorage.setItem(ACCESS_TOKEN, newAccess);
      isRefreshing = false;
      runPending(newAccess);

      // retry the original request
      originalRequest.__isRetry = true;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch (e) {
      isRefreshing = false;
      runPending(null); // flush queued with failure
      // clear tokens and bubble up
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      return Promise.reject(e);
    }
  }
);

export default api;
