import axios from "axios";
import { ACCESS_TOKEN } from "./constants";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000", // Fallback to localhost if VITE_API_URL is not set
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN);

  // If the request URL contains "/register" (or any other public endpoint),
  // skip adding the token
  if (token && !config.url.includes("/register") && !config.url.includes("/login")) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});


export default api;