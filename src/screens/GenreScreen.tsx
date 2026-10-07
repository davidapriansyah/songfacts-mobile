import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { songsApi } from '../api/songs';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import { MainStackParamList } from '../navigation/types';
import SongRow from '../components/SongRow';
import { colors } from '../theme/colors';
import { songKey, dedupeSongs } from '../utils';

type Route = RouteProp<MainStackParamList, 'Genre'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function GenreScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { genre } = route.params;
  const [songs, setSongs] = useState<PlayableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSong, addToQueue, isSongInQueue } = usePlayer();

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await songsApi.getByGenre(genre, 50);
      setSongs(dedupeSongs(data.songs || data));
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [genre]);

  useEffect(() => {
    navigation.setOptions({ title: genre });
    fetchSongs();
  }, [genre, navigation, fetchSongs]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(item, i) => songKey(item, i)}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            index={index}
            onPlay={(s) => playSong(s, songs, index, 'random')}
            onAddQueue={(s) => addToQueue(s)}
            isInQueue={isSongInQueue(item.id ?? item.videoId ?? item.youtubeId)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No songs in this genre yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
  },
  loader: {
    marginTop: 60,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
