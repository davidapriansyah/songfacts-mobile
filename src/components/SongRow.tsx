import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayableItem } from '../context/PlayerContext';
import { colors } from '../theme/colors';

interface Props {
  song: PlayableItem;
  onPlay?: (song: PlayableItem) => void;
  onFav?: (song: PlayableItem) => void;
  isFavorite?: boolean;
  index?: number;
}

export default function SongRow({ song, onPlay, onFav, isFavorite, index }: Props) {
  const videoId = song.videoId || song.youtubeId;
  const cover = song.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.main} activeOpacity={0.7} onPress={() => onPlay?.(song)}>
        <Text style={styles.index}>{index !== undefined ? index + 1 : ''}</Text>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbText}>{song.title?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
        </View>
      </TouchableOpacity>
      {onFav && (
        <TouchableOpacity onPress={() => onFav(song)} hitSlop={8}>
          <Text style={[styles.fav, isFavorite && styles.favActive]}>{isFavorite ? '♥' : '♡'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  index: {
    width: 24,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surfaceHover,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
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
  fav: {
    color: colors.textMuted,
    fontSize: 20,
  },
  favActive: {
    color: colors.primary,
  },
});
