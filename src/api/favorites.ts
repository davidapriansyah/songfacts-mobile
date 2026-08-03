import api from './client';
import { Favorite } from '../types';

export const favoritesApi = {
  getFavorites: () => api.get<Favorite[]>('/favorites'),

  add: (songId: number) => api.post(`/favorites/${songId}`),

  remove: (songId: number) => api.delete(`/favorites/${songId}`),
};
