import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { songsApi } from '../api/songs';
import { favoritesApi } from '../api/favorites';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import { RecommendationItem } from '../types';
import { MainStackParamList } from '../navigation/types';
import SongCard from '../components/SongCard';
import SongRow from '../components/SongRow';
import { CardSkeleton } from '../components/Skeleton';
import { songKey, dedupeSongs } from '../utils';
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

interface HeaderProps {
  aiSongs: RecommendationItem[];
  aiLoading: boolean;
  genres: string[];
  songs: PlayableItem[];
  favoriteIds: Set<number>;
  onPlay: (song: PlayableItem, list: PlayableItem[], index: number) => void;
  onAddQueue: (song: PlayableItem) => void;
  onFav: (song: PlayableItem) => void;
  navigation: Nav;
}

const HomeHeader = React.memo(function HomeHeader({
  aiSongs,
  aiLoading,
  genres,
  songs,
  favoriteIds,
  onPlay,
  onAddQueue,
  onFav,
  navigation,
}: HeaderProps) {
  return (
    <View>
      {/* Recommended for You */}
      <View style={headerStyles.sectionHeader}>
        <Text style={headerStyles.sectionTitle}>Recommended for You</Text>
      </View>
      {aiLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          horizontal
          data={aiSongs}
          keyExtractor={(item, i) => songKey(item, i)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item, index }) => (
            <SongCard
              song={item}
              showNew
              onPress={(s) => onPlay(s, aiSongs, index)}
            />
          )}
        />
      )}

      {/* Genres */}
      <View style={headerStyles.sectionHeader}>
        <Text style={headerStyles.sectionTitle}>Browse by Genre</Text>
      </View>
      <View style={headerStyles.genreWrap}>
        {genres.map((g) => (
          <TouchableOpacity
            key={g}
            style={headerStyles.genreChip}
            onPress={() => navigation.navigate('Genre', { genre: g })}
          >
            <Text style={headerStyles.genreText}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={headerStyles.sectionHeader}>
        <Text style={headerStyles.sectionTitle}>All Songs</Text>
        <Text style={headerStyles.sectionCount}>{songs.length} songs</Text>
      </View>
    </View>
  );
});

const headerStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 13,
  },
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  genreChip: {
    backgroundColor: colors.dark700,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  genreText: {
    color: colors.text,
    fontWeight: '500',
  },
});

export default function HomeScreen() {
  const [aiSongs, setAiSongs] = useState<RecommendationItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [songs, setSongs] = useState<PlayableItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const fetchingRef = useRef(false);
  const navigation = useNavigation<Nav>();
  const { playSong, addToQueue, isSongInQueue } = usePlayer();

  const loadFavorites = useCallback(async () => {
    try {
      const { data } = await favoritesApi.getFavorites();
      setFavoriteIds(new Set(data.map((f) => f.song.id)));
    } catch {}
  }, []);

  const fetchAi = useCallback(async () => {
    try {
      setAiLoading(true);
      const { data } = await songsApi.getAiRecommendations();
      setAiSongs(dedupeSongs(data.songs || []));
    } catch {
    } finally {
      setAiLoading(false);
    }
  }, []);

  const fetchSongs = useCallback(async (pageNum: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      const { data } = await songsApi.search('', pageNum, 20);
      const items = data.songs || [];
      setSongs((prev) => {
        const merged = pageNum === 1 ? items : [...prev, ...items];
        return dedupeSongs(merged);
      });
      setPage(pageNum);
    } catch {
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchGenres = useCallback(async () => {
    try {
      const { data } = await songsApi.getGenres();
      setGenres(data);
    } catch {}
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchAi(), fetchGenres(), fetchSongs(1), loadFavorites()]).finally(() =>
      setRefreshing(false)
    );
  }, [fetchAi, fetchGenres, fetchSongs, loadFavorites]);

  useEffect(() => {
    fetchAi();
    fetchGenres();
    fetchSongs(1);
    loadFavorites();
  }, [fetchAi, fetchGenres, fetchSongs, loadFavorites]);

  const handlePlay = useCallback(
    (song: PlayableItem, list: PlayableItem[], index: number) => {
      playSong(song, list, index, 'random');
    },
    [playSong]
  );

  const handleAddQueue = useCallback(
    (song: PlayableItem) => {
      addToQueue(song);
    },
    [addToQueue]
  );

  const handleFav = useCallback(
    (song: PlayableItem) => {
      if (!song.id) return;
      const id = song.id;
      const isFav = favoriteIds.has(id);
      // Optimistic UI so the heart toggles instantly
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(id);
        else next.add(id);
        return next;
      });
      const action = isFav ? favoritesApi.remove(id) : favoritesApi.add(id);
      // Re-sync from server on success AND failure (keeps state truthful, avoids unhandled rejection)
      action.then(loadFavorites).catch(loadFavorites);
    },
    [favoriteIds, loadFavorites]
  );

  const headerContent = useMemo(
    () => ({
      aiSongs,
      aiLoading,
      genres,
      songs,
      favoriteIds,
      onPlay: handlePlay,
      onAddQueue: handleAddQueue,
      onFav: handleFav,
      navigation,
    }),
    [aiSongs, aiLoading, genres, songs, favoriteIds, handlePlay, handleAddQueue, handleFav, navigation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <Text style={styles.title}>Bloop</Text>
      </View>
      <FlatList
        style={styles.list}
        data={songs}
        keyExtractor={(item, i) => songKey(item, i)}
        ListHeaderComponent={<HomeHeader {...headerContent} />}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            index={index}
            isFavorite={item.id != null && favoriteIds.has(item.id)}
            isInQueue={isSongInQueue(item.id ?? item.videoId ?? item.youtubeId)}
            onPlay={(s) => handlePlay(s, songs, index)}
            onAddQueue={(s) => handleAddQueue(s)}
            onFav={(s) => handleFav(s)}
          />
        )}
        onEndReached={() => !loading && fetchSongs(page + 1)}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
  },
  list: {
    flex: 1,
  },
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.dark900,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footer: {
    paddingVertical: 20,
  },
});
