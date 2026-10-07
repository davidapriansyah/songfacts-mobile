import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { songsApi } from '../api/songs';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import { MainStackParamList } from '../navigation/types';
import SongCard from '../components/SongCard';
import { CardSkeleton } from '../components/Skeleton';
import { songKey, dedupeSongs } from '../utils';
import { colors } from '../theme/colors';

type Route = RouteProp<MainStackParamList, 'SongDetail'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

const TAB_FACTS = 'funfacts';
const TAB_LYRICS = 'lyrics';

export default function SongDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { songId } = route.params;

  const [song, setSong] = useState<any>(null);
  const [funFacts, setFunFacts] = useState<any>(null);
  const [lyrics, setLyrics] = useState<any>(null);
  const [lyricsLoading, setLyricsLoading] = useState(true);
  const [recs, setRecs] = useState<PlayableItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [savingRec, setSavingRec] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(TAB_FACTS);

  const { playSong, currentTrack, isPlaying, isLoading, position, duration, togglePlay, setPlaySource } = usePlayer();
  const playSongRef = useRef(playSong);
  playSongRef.current = playSong;
  const setPlaySourceRef = useRef(setPlaySource);
  setPlaySourceRef.current = setPlaySource;

  const isThisSongPlaying = currentTrack?.id === song?.id ||
    (currentTrack?.videoId || currentTrack?.youtubeId) === (song?.youtubeId || song?.videoId);

  const progress = isThisSongPlaying && duration > 0 ? Math.min(position / duration, 1) : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLyricsLoading(true);
        const [songRes, factsRes, lyricsRes] = await Promise.allSettled([
          songsApi.getById(songId),
          songsApi.getFunfacts(songId),
          songsApi.getLyrics(songId),
        ]);
        if (cancelled) return;
        if (songRes.status === 'fulfilled') {
          const songData = songRes.value.data;
          setSong(songData);
          const currentId = currentTrack?.videoId || currentTrack?.youtubeId;
          const newId = songData.youtubeId || songData.videoId;
          if (newId && currentId !== newId) {
            playSongRef.current(songData);
          }
        }
        if (factsRes.status === 'fulfilled') setFunFacts(factsRes.value.data);
        if (lyricsRes.status === 'fulfilled') setLyrics(lyricsRes.value.data);
      } catch {
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setLyricsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [songId]);

  useEffect(() => {
    let cancelled = false;
    if (!songId) return;
    (async () => {
      try {
        const { data } = await songsApi.getRecommendations(songId);
        if (cancelled) return;
        setRecs(dedupeSongs(data));
        if (data.length > 0) setPlaySourceRef.current(dedupeSongs(data), 'random');
      } catch {
      } finally {
        if (!cancelled) setRecLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [songId]);

  const handleOpenRec = async (rec: PlayableItem) => {
    if (rec.inDb && rec.id) {
      navigation.navigate('SongDetail', { songId: rec.id });
    } else if (rec.videoId) {
      setSavingRec(rec.videoId);
      try {
        const { data } = await songsApi.saveFromYoutube(rec.videoId);
        navigation.navigate('SongDetail', { songId: data.id });
      } catch {
        Alert.alert('Failed', 'Gagal menyimpan lagu');
      } finally {
        setSavingRec(null);
      }
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!song) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Song not found</Text>
      </View>
    );
  }

  const videoId = song.youtubeId || song.videoId;
  const thumbnail = song.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);

  const artistFacts = funFacts?.artist?.funfacts || [];
  const songFacts = funFacts?.song?.funfacts || [];
  const lyricsText = lyrics?.lyrics || '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.hero}>
        <View style={styles.coverWrap}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.placeholderText}>{song.title?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          {isThisSongPlaying && (
            <TouchableOpacity style={styles.coverOverlay} onPress={togglePlay} activeOpacity={0.7}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={48}
                  color="#fff"
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              )}
            </TouchableOpacity>
          )}
        </View>
        {isThisSongPlaying && duration > 0 && (
          <View style={styles.heroProgress}>
            <View style={[styles.heroProgressFill, { flex: progress }]} />
            <View style={{ flex: 1 - progress }} />
          </View>
        )}
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_FACTS && styles.tabActive]}
          onPress={() => setActiveTab(TAB_FACTS)}
        >
          <Text style={[styles.tabText, activeTab === TAB_FACTS && styles.tabTextActive]}>
            Fun Facts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_LYRICS && styles.tabActive]}
          onPress={() => setActiveTab(TAB_LYRICS)}
        >
          <Text style={[styles.tabText, activeTab === TAB_LYRICS && styles.tabTextActive]}>
            Lyrics
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === TAB_FACTS && (
        <View style={styles.section}>
          {artistFacts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>About the Artist</Text>
              {artistFacts.map((f: string, i: number) => (
                <Text key={i} style={styles.fact}>• {f}</Text>
              ))}
            </>
          )}
          {songFacts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Fun Facts</Text>
              {songFacts.map((f: string, i: number) => (
                <Text key={i} style={styles.fact}>• {f}</Text>
              ))}
            </>
          )}
          {!funFacts && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          )}
          {funFacts && artistFacts.length === 0 && songFacts.length === 0 && (
            <Text style={styles.empty}>No fun facts available</Text>
          )}
        </View>
      )}

      {activeTab === TAB_LYRICS && (
        <View style={styles.section}>
          {lyricsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
          ) : lyricsText.length > 0 ? (
            <Text style={styles.lyrics}>{lyricsText}</Text>
          ) : (
            <Text style={styles.empty}>Lyrics not available</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Songs</Text>
        {recLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </ScrollView>
        ) : recs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {recs.map((rec, i) => (
              <SongCard
                key={songKey(rec, i)}
                song={rec}
                showNew
                onPress={(s) =>
                  savingRec ? null : handleOpenRec(s)
                }
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
  },
  center: {
    flex: 1,
    backgroundColor: colors.dark900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  coverWrap: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 16,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.primary,
    fontSize: 64,
    fontWeight: 'bold',
  },
  heroProgress: {
    flexDirection: 'row',
    height: 3,
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  heroProgressFill: {
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.dark700,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  fact: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  lyrics: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
