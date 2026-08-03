import React, { useCallback, useEffect, useState } from 'react';
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
import { colors } from '../theme/colors';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function HomeScreen() {
  const [aiSongs, setAiSongs] = useState<RecommendationItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [songs, setSongs] = useState<PlayableItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const navigation = useNavigation<Nav>();
  const { playSong, addToQueue } = usePlayer();

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
      setAiSongs(data.songs || []);
    } catch {
    } finally {
      setAiLoading(false);
    }
  }, []);

  const fetchSongs = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const { data } = await songsApi.search('', pageNum, 20);
      const items = data.songs || [];
      setSongs((prev) => (pageNum === 1 ? items : [...prev, ...items]));
      setPage(pageNum);
    } catch {
    } finally {
      setLoading(false);
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

  const handlePlay = (song: PlayableItem, list: PlayableItem[], index: number) => {
    playSong(song, list, index);
  };

  const openDetail = (song: PlayableItem) => {
    if (song.id) {
      navigation.navigate('SongDetail', { songId: song.id });
    }
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.title}>Bloop</Text>

      {/* Recommended for You */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
      </View>
      {aiLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {aiSongs.map((song, i) => (
            <SongCard
              key={song.id || song.videoId || i}
              song={song}
              showNew
              onPress={(s) => handlePlay(s, aiSongs, i)}
            />
          ))}
        </ScrollView>
      )}

      {/* Genres */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Browse by Genre</Text>
      </View>
      <View style={styles.genreWrap}>
        {genres.map((g) => (
          <TouchableOpacity
            key={g}
            style={styles.genreChip}
            onPress={() => navigation.navigate('Genre', { genre: g })}
          >
            <Text style={styles.genreText}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Songs</Text>
        <Text style={styles.sectionCount}>{songs.length} songs</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={songs}
      keyExtractor={(item, i) => `${item.id || item.videoId || i}`}
      ListHeaderComponent={renderHeader}
      renderItem={({ item, index }) => (
        <SongRow
          song={item}
          index={index}
          isFavorite={item.id != null && favoriteIds.has(item.id)}
          onPlay={(s) => handlePlay(s, songs, index)}
          onFav={(s) => addToQueue(s)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
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
  footer: {
    paddingVertical: 20,
  },
});
