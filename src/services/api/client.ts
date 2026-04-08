import axios, { AxiosError } from 'axios';
import { auth } from '../firebase/config';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Not authenticated — request will fail with 401 if needed
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const message =
      (error.response?.data as { message?: string })?.message ??
      error.message ??
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
