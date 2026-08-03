import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { Song, RecommendationItem } from '../types';

export interface PlayableItem {
  id?: number;
  videoId?: string;
  youtubeId?: string;
  title: string;
  artist: string;
  albumCover?: string | null;
  inDb?: boolean;
}

interface PlayerContextValue {
  queue: PlayableItem[];
  currentTrack: PlayableItem | null;
  isPlaying: boolean;
  playSong: (song: PlayableItem, list?: PlayableItem[], index?: number) => void;
  addToQueue: (song: PlayableItem) => void;
  replaceQueue: (songs: PlayableItem[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  clearQueue: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const STREAM_URL = 'https://bloop-api.opsctrl.dev/api/songs/stream';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const player = useAudioPlayer(null);

  const playStream = useCallback(
    (track: PlayableItem) => {
      const videoId = track.videoId || track.youtubeId;
      if (!videoId) return;
      try {
        player.replace({
          uri: `${STREAM_URL}?videoId=${videoId}`,
        });
        player.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    },
    [player]
  );

  const playSong = useCallback(
    (song: PlayableItem, list?: PlayableItem[], index?: number) => {
      let newQueue = queue;
      let newIndex = currentIndex;

      if (list && list.length > 0 && index !== undefined) {
        newQueue = list;
        newIndex = index;
      } else {
        const existingIdx = newQueue.findIndex(
          (s) => (s.videoId || s.youtubeId) === (song.videoId || song.youtubeId)
        );
        if (existingIdx >= 0) {
          newIndex = existingIdx;
        } else {
          newQueue = [...newQueue, song];
          newIndex = newQueue.length - 1;
        }
      }

      setQueue(newQueue);
      setCurrentIndex(newIndex);
      setCurrentTrack(song);
      playStream(song);
    },
    [queue, currentIndex, playStream]
  );

  const addToQueue = useCallback((song: PlayableItem) => {
    setQueue((q) => [...q, song]);
  }, []);

  const replaceQueue = useCallback((songs: PlayableItem[]) => {
    setQueue(songs);
    setCurrentIndex(-1);
    setCurrentTrack(null);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying, player]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const idx = (currentIndex + 1) % queue.length;
    const track = queue[idx];
    setCurrentIndex(idx);
    setCurrentTrack(track);
    playStream(track);
  }, [queue, currentIndex, playStream]);

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    const idx = (currentIndex - 1 + queue.length) % queue.length;
    const track = queue[idx];
    setCurrentIndex(idx);
    setCurrentTrack(track);
    playStream(track);
  }, [queue, currentIndex, playStream]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentTrack,
        isPlaying,
        playSong,
        addToQueue,
        replaceQueue,
        togglePlay,
        next,
        previous,
        clearQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
