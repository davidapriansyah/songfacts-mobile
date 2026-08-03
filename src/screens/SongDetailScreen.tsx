import React, { useCallback, useEffect, useState } from 'react';
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
import { songsApi } from '../api/songs';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import { MainStackParamList } from '../navigation/types';
import SongCard from '../components/SongCard';
import { CardSkeleton } from '../components/Skeleton';
import { colors } from '../theme/colors';

type Route = RouteProp<MainStackParamList, 'SongDetail'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function SongDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { songId } = route.params;

  const [song, setSong] = useState<any>(null);
  const [funFacts, setFunFacts] = useState<any>(null);
  const [lyrics, setLyrics] = useState<any>(null);
  const [recs, setRecs] = useState<PlayableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [savingRec, setSavingRec] = useState<string | null>(null);

  const { playSong, replaceQueue } = usePlayer();

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      const [songRes, factsRes, lyricsRes] = await Promise.allSettled([
        songsApi.getById(songId),
        songsApi.getFunfacts(songId),
        songsApi.getLyrics(songId),
      ]);
      if (songRes.status === 'fulfilled') {
        const songData = songRes.value.data;
        setSong(songData);
        playSong(songData);
      }
      if (factsRes.status === 'fulfilled') setFunFacts(factsRes.value.data);
      if (lyricsRes.status === 'fulfilled') setLyrics(lyricsRes.value.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [songId, playSong]);

  const loadRecs = useCallback(async () => {
    setRecLoading(true);
    try {
      const { data } = await songsApi.getRecommendations(songId);
      setRecs(data);
      if (data.length > 0) replaceQueue(data);
    } catch {
    } finally {
      setRecLoading(false);
    }
  }, [songId, replaceQueue]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (songId) loadRecs();
  }, [songId, loadRecs]);

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

  if (loading) {
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
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.placeholderText}>{song.title?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.title}>{song.title}</Text>
        <Text style={styles.artist}>{song.artist}</Text>
        <TouchableOpacity style={styles.playButton} onPress={() => playSong(song)}>
          <Text style={styles.playButtonText}>▶ Play</Text>
        </TouchableOpacity>
      </View>

      {artistFacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About the Artist</Text>
          {artistFacts.map((f: string, i: number) => (
            <Text key={i} style={styles.fact}>• {f}</Text>
          ))}
        </View>
      )}

      {songFacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fun Facts</Text>
          {songFacts.map((f: string, i: number) => (
            <Text key={i} style={styles.fact}>• {f}</Text>
          ))}
        </View>
      )}

      {lyricsText.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lyrics</Text>
          <Text style={styles.lyrics}>{lyricsText}</Text>
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
                key={rec.id || rec.videoId || i}
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
  cover: {
    width: 200,
    height: 200,
    borderRadius: 16,
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
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 8,
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
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
    fontSize: 16,
  },
});
