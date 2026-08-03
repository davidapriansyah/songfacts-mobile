import { PlayableItem } from '../context/PlayerContext';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  Genre: { genre: string };
  SongDetail: { songId: number; recommendations?: PlayableItem[] };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Profile: undefined;
};
