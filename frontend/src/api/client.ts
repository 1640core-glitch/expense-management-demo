import axios, { AxiosError } from 'axios';
import { normalizeError } from './errors';

export const TOKEN_KEY = 'auth_token';

const client = axios.create({
  baseURL: '/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  config.headers = config.headers ?? {};
  (config.headers as Record<string, string>).Accept = 'application/json';
  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(normalizeError(error));
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

export default client;
