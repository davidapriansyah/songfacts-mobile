import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { songsApi } from '../api/songs';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import SongRow from '../components/SongRow';
import { colors } from '../theme/colors';
import { songKey, dedupeSongs } from '../utils';
import { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayableItem[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<Nav>();
  const { playSong, addToQueue, isSongInQueue } = usePlayer();

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSource('');
      return;
    }
    setLoading(true);
    try {
      const { data } = await songsApi.search(q.trim(), 1, 15);
      setResults(dedupeSongs(data.songs || []));
      setSource(data.source || '');
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onType = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(text), 500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <TextInput
        style={styles.input}
        placeholder="Search songs or artists..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={onType}
        autoCapitalize="none"
      />
      {source ? (
        <Text style={styles.source}>
          {source === 'youtube' ? 'Found on YouTube' : 'Found in library'} · {results.length} results
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => songKey(item, i)}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              index={index}
              onPlay={(s) => playSong(s, results, index, 'random')}
              onAddQueue={(s) => addToQueue(s)}
              isInQueue={isSongInQueue(item.id ?? item.videoId ?? item.youtubeId)}
            />
          )}
          ListEmptyComponent={
            query ? (
              <Text style={styles.empty}>No results found</Text>
            ) : (
              <Text style={styles.empty}>Search for songs or artists</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark900,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    paddingTop: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.dark800,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    marginBottom: 8,
  },
  source: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  loader: {
    marginTop: 40,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
