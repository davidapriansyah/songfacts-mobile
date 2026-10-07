import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import YoutubePlayerHost, {
  type YoutubePlayerEvent,
  type YoutubePlayerHandle,
} from '../components/YoutubePlayerHost';

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
  isLoading: boolean;
  hasError: boolean;
  position: number;
  duration: number;
  queueOpen: boolean;
  playSong: (song: PlayableItem, list?: PlayableItem[], index?: number, mode?: 'sequential' | 'random') => void;
  addToQueue: (song: PlayableItem) => void;
  removeFromQueue: (index: number) => void;
  replaceQueue: (songs: PlayableItem[]) => void;
  togglePlay: () => void;
  toggleQueue: () => void;
  next: () => void;
  previous: () => void;
  clearQueue: () => void;
  isSongInQueue: (songId?: string | number | null) => boolean;
  queueContainsTrack: (track: PlayableItem) => boolean;
  setPlaySource: (list: PlayableItem[], mode?: 'sequential' | 'random') => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

const LOAD_TIMEOUT_MS = 25000;
// YouTube IFrame error codes that mean "this track can never play here".
const UNPLAYABLE_ERROR_CODES = new Set([2, 5, 100, 101, 150]);
// Embedder-identity failures, not per-video restrictions:
//   153 = no HTTP Referer / no origin at all
//   152 = the page claimed to be https://www.youtube.com (YouTube refusing to
//         treat YouTube as a valid embedder) — undocumented but reproducible
// Report these without auto-advancing, otherwise a misconfigured origin would
// silently burn through the whole queue.
const CONFIG_ERROR_CODES = new Set([152, 153]);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

  const playerRef = useRef<YoutubePlayerHandle>(null);
  const currentTrackRef = useRef<PlayableItem | null>(null);
  const queueRef = useRef<PlayableItem[]>([]);
  const sourceListRef = useRef<PlayableItem[]>([]);
  const sourceModeRef = useRef<'sequential' | 'random'>('random');
  const startedRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  const autoAdvance = useCallback(() => {
    const current = currentTrackRef.current;
    const sourceList = sourceListRef.current;

    if (queueRef.current.length > 0) {
      const [nextTrack, ...rest] = queueRef.current;
      setQueue(rest);
      setCurrentTrack(nextTrack);
      playStreamRef.current(nextTrack);
      return;
    }

    if (sourceModeRef.current === 'sequential' && sourceList.length > 0) {
      const currentKey = current ? current.videoId || current.youtubeId : null;
      const idx = currentKey
        ? sourceList.findIndex((s) => (s.videoId || s.youtubeId) === currentKey)
        : -1;
      const nextIndex = idx >= 0 ? idx + 1 : 0;
      if (nextIndex < sourceList.length) {
        const track = sourceList[nextIndex];
        setCurrentTrack(track);
        playStreamRef.current(track);
        return;
      }
    }

    if (sourceList.length > 0) {
      const currentKey = current ? current.videoId || current.youtubeId : null;
      const candidates = sourceList.filter((s) => (s.videoId || s.youtubeId) !== currentKey);
      const pool = candidates.length > 0 ? candidates : sourceList;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setCurrentTrack(pick);
      playStreamRef.current(pick);
    }
  }, []);

  const autoAdvanceRef = useRef(autoAdvance);
  autoAdvanceRef.current = autoAdvance;
  const advancingRef = useRef(false);

  const triggerAdvance = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    autoAdvanceRef.current();
    setTimeout(() => { advancingRef.current = false; }, 1500);
  }, []);

  const playStream = useCallback((track: PlayableItem) => {
    const videoId = track.videoId || track.youtubeId;
    if (!videoId) {
      console.log(`[play] ${track.title}: no videoId`);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    startedRef.current = false;
    setHasError(false);
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoading(true);
    console.log(`[play] ${track.title}: youtube iframe (${videoId})`);
    playerRef.current?.load(videoId, true);

    loadTimerRef.current = setTimeout(() => {
      if (startedRef.current) return;
      console.log(`[play] ${track.title}: timed out after ${LOAD_TIMEOUT_MS}ms`);
      setIsLoading(false);
      setHasError(true);
    }, LOAD_TIMEOUT_MS);
  }, []);

  const playStreamRef = useRef(playStream);
  playStreamRef.current = playStream;

  const handlePlayerEvent = useCallback((event: YoutubePlayerEvent) => {
    switch (event.type) {
      case 'ready':
        console.log('[yt] player ready');
        break;
      case 'time':
        startedRef.current = true;
        setPosition(event.position);
        setDuration(event.duration);
        if (event.playing) {
          setIsPlaying(true);
          setIsLoading(false);
        }
        break;
      case 'state':
        if (event.name === 'playing') {
          startedRef.current = true;
          if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
          setIsPlaying(true);
          setIsLoading(false);
          setHasError(false);
        } else if (event.name === 'paused') {
          setIsPlaying(false);
          setIsLoading(false);
        } else if (event.name === 'buffering') {
          setIsLoading(true);
        } else if (event.name === 'ended') {
          setIsPlaying(false);
          setIsLoading(false);
          triggerAdvance();
        }
        break;
      case 'error':
        console.log(`[yt] error code=${event.code} ${event.detail || ''}`);
        setIsPlaying(false);
        setIsLoading(false);
        if (CONFIG_ERROR_CODES.has(event.code)) {
          setHasError(true);
        } else if (UNPLAYABLE_ERROR_CODES.has(event.code)) {
          setHasError(true);
          triggerAdvance();
        }
        break;
      default:
        break;
    }
  }, [triggerAdvance]);

  const playSong = useCallback(
    (song: PlayableItem, list?: PlayableItem[], index?: number, mode?: 'sequential' | 'random') => {
      if (list && list.length > 0 && index !== undefined) {
        sourceListRef.current = list;
        sourceModeRef.current = mode || 'sequential';
      }
      setCurrentTrack(song);
      playStream(song);
    },
    [playStream]
  );

  const addToQueue = useCallback((song: PlayableItem) => {
    setQueue((q) => {
      if (q.some((s) => (s.videoId || s.youtubeId) === (song.videoId || song.youtubeId))) {
        return q;
      }
      return [...q, song];
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => {
      const newQueue = [...q];
      newQueue.splice(index, 1);
      return newQueue;
    });
  }, []);

  const toggleQueue = useCallback(() => {
    setQueueOpen((v) => !v);
  }, []);

  const replaceQueue = useCallback((songs: PlayableItem[]) => {
    setQueue(songs);
  }, []);

  const togglePlay = useCallback(() => {
    const track = currentTrackRef.current;
    if (!track) return;
    if (hasError) {
      playStream(track);
      return;
    }
    if (isPlaying) {
      playerRef.current?.pause();
      return;
    }
    playerRef.current?.play();
  }, [hasError, isPlaying, playStream]);

  const next = useCallback(() => {
    if (queueRef.current.length > 0) {
      const [nextTrack, ...rest] = queueRef.current;
      setQueue(rest);
      setCurrentTrack(nextTrack);
      playStream(nextTrack);
      return;
    }
    autoAdvanceRef.current();
  }, [playStream]);

  const previous = useCallback(() => {
    if (!currentTrackRef.current) return;
    playerRef.current?.seek(0);
    playerRef.current?.play();
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    queueRef.current = [];
  }, []);

  const isSongInQueue = useCallback((songId?: string | number | null) => {
    if (songId == null) return false;
    const key = String(songId);
    return queueRef.current.some((s) => String(s.videoId || s.youtubeId || s.id) === key);
  }, []);

  const queueContainsTrack = useCallback((track: PlayableItem) => {
    const key = track.videoId || track.youtubeId;
    if (key == null) return false;
    return queueRef.current.some((s) => (s.videoId || s.youtubeId) === key);
  }, []);

  const setPlaySource = useCallback(
    (list: PlayableItem[], mode: 'sequential' | 'random' = 'random') => {
      sourceListRef.current = list || [];
      sourceModeRef.current = mode;
    },
    []
  );

  useEffect(() => () => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentTrack,
        isPlaying,
        isLoading,
        hasError,
        position,
        duration,
        queueOpen,
        playSong,
        addToQueue,
        removeFromQueue,
        replaceQueue,
        togglePlay,
        toggleQueue,
        next,
        previous,
        clearQueue,
        isSongInQueue,
        queueContainsTrack,
        setPlaySource,
      }}
    >
      {children}
      <YoutubePlayerHost ref={playerRef} onEvent={handlePlayerEvent} />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
