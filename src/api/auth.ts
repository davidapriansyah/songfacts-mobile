import api from './client';
import { AuthResponse } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),

  register: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, password }),

  loginGoogle: (googleId: string, email: string, profileImage?: string) =>
    api.post<AuthResponse>('/auth/login-google', { googleId, email, profileImage }),

  getProfile: () => api.get('/auth/profile'),
};
