import api from './client';
import { Song, RecommendationItem } from '../types';

export const songsApi = {
  search: (query: string, page = 1, limit = 15) =>
    api.get(`/songs/search`, { params: { q: query, page, limit } }),

  getGenres: () => api.get<string[]>('/songs/genres'),

  getByGenre: (genre: string, limit = 50) =>
    api.get(`/songs/genre/${encodeURIComponent(genre)}`, { params: { limit } }),

  getById: (id: number) => api.get(`/songs/${id}`),

  getFunfacts: (id: number) => api.get(`/songs/${id}/funfacts`),

  getLyrics: (id: number) => api.get(`/songs/${id}/lyrics`),

  getRecommendations: (id: number) => api.get(`/songs/${id}/youtube-recommendations`),

  getAiRecommendations: () => api.get<{ source: string; songs: RecommendationItem[] }>('/songs/recommendations/ai'),

  saveFromYoutube: (videoId: string) =>
    api.post<Song>('/songs/save', { videoId }),

  saveFromCache: (videoId: string, title: string, artist: string, albumCover?: string) =>
    api.post<Song>('/songs/save-from-cache', { videoId, title, artist, albumCover }),
};
