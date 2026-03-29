// Generated with Claude Code
// axios (MIT License) — https://github.com/axios/axios
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const event = new CustomEvent('auth:unauthorized');
      window.dispatchEvent(event);
    }
    return Promise.reject(error);
  }
);

export default client;
export { API_BASE };
