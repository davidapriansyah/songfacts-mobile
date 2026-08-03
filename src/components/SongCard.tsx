import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayableItem } from '../context/PlayerContext';
import { colors } from '../theme/colors';

interface Props {
  song: PlayableItem;
  onPress?: (song: PlayableItem) => void;
  showNew?: boolean;
}

export default function SongCard({ song, onPress, showNew }: Props) {
  const videoId = song.videoId || song.youtubeId;
  const cover = song.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => onPress?.(song)}
    >
      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.placeholderText}>{song.title?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        {showNew && !song.inDb && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
      <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
