import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { favoritesApi } from '../api/favorites';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import SongRow from '../components/SongRow';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: number; title: string } | null>(null);
  const navigation = useNavigation<Nav>();
  const { playSong, addToQueue, isSongInQueue } = usePlayer();

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

  const confirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    try {
      await favoritesApi.remove(removeTarget.id);
      setFavorites((prev) => prev.filter((f) => f.song.id !== removeTarget.id));
    } catch {
    } finally {
      setRemoveTarget(null);
    }
  }, [removeTarget]);

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
            isInQueue={isSongInQueue(item.song.id ?? item.song.videoId ?? item.song.youtubeId)}
            onPlay={(s) => playSong(s, songs, index, 'sequential')}
            onAddQueue={(s) => addToQueue(s)}
            onFav={(s) =>
              setRemoveTarget({ id: s.id!, title: s.title || 'Unknown' })
            }
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

      {/* Remove Favorite Modal */}
      <Modal visible={!!removeTarget} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Ionicons name="heart" size={40} color={colors.primary} />
            <Text style={modalStyles.title}>Remove Favorite?</Text>
            <Text style={modalStyles.subtitle}>
              Remove "{removeTarget?.title}" from your favorites?
            </Text>
            <View style={modalStyles.actions}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setRemoveTarget(null)} activeOpacity={0.7}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.removeBtn} onPress={confirmRemove} activeOpacity={0.7}>
                <Text style={modalStyles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: colors.dark800,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  removeBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
