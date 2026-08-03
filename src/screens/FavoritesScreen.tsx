import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { favoritesApi } from '../api/favorites';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import SongRow from '../components/SongRow';
import { colors } from '../theme/colors';
import { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<Nav>();
  const { playSong, addToQueue } = usePlayer();

  const load = useCallback(async () => {
    try {
      const { data } = await favoritesApi.getFavorites();
      setFavorites(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const removeFav = useCallback(async (songId: number) => {
    Alert.alert('Remove favorite?', 'Hapus dari favorit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await favoritesApi.remove(songId);
            setFavorites((prev) => prev.filter((f) => f.song.id !== songId));
          } catch {}
        },
      },
    ]);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const songs: PlayableItem[] = favorites.map((f) => f.song);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorites</Text>
      <FlatList
        data={favorites}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item, index }) => (
          <SongRow
            song={item.song}
            index={index}
            isFavorite
            onPlay={(s) => playSong(s, songs, index)}
            onFav={(s) => removeFav(s.id!)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No favorites yet. Tap ♡ on songs to add them here.
          </Text>
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
  center: {
    flex: 1,
    backgroundColor: colors.dark900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
});
