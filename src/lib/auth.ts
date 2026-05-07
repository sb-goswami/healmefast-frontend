import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('token', token);
    authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete authApi.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
};

// Initialize token from localStorage
if (typeof window !== 'undefined') {
  const token = getAuthToken();
  if (token) {
    setAuthToken(token);
  }
}
