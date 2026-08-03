export interface Song {
  id: number;
  youtubeId?: string | null;
  title: string;
  artist: string;
  album?: string | null;
  albumCover?: string | null;
  duration?: number | null;
  genres?: string[];
  lyrics?: string | null;
  inDb?: boolean;
  videoId?: string;
}

export interface RecommendationItem {
  id?: number;
  videoId?: string;
  youtubeId?: string;
  title: string;
  artist: string;
  albumCover?: string | null;
  inDb?: boolean;
}

export interface User {
  id: number;
  email: string;
  profileImage?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Favorite {
  id: number;
  song: Song;
}

export interface Funfact {
  id?: number;
  title?: string;
  content?: string;
  facts?: string[];
  fact?: string;
}

export interface SongDetail {
  song: Song;
  funfacts?: string[];
  lyrics?: string;
  recommendations?: RecommendationItem[];
  source?: string;
}
