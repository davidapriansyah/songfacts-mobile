import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { colors } from '../theme/colors';

export default function PlayerBar() {
  const { currentTrack, isPlaying, togglePlay, next, previous } = usePlayer();
  if (!currentTrack) return null;

  const videoId = currentTrack.videoId || currentTrack.youtubeId;
  const cover = currentTrack.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);

  return (
    <View style={styles.bar}>
      {cover ? <Image source={{ uri: cover }} style={styles.thumb} /> : <View style={styles.thumb} />}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
      </View>
      <TouchableOpacity onPress={previous} hitSlop={8}>
        <Text style={styles.control}>⏮</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={togglePlay} hitSlop={8}>
        <Text style={[styles.control, styles.controlBig]}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={next} hitSlop={8}>
        <Text style={styles.control}>⏭</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark800,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceHover,
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  control: {
    color: colors.text,
    fontSize: 18,
  },
  controlBig: {
    fontSize: 24,
  },
});
