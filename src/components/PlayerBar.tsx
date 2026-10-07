import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayer } from '../context/PlayerContext';
import { songsApi } from '../api/songs';
import { MainStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import QueueSheet from './QueueSheet';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function PlayerBar() {
  const navigation = useNavigation<Nav>();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    hasError,
    position,
    duration,
    queue,
    queueOpen,
    togglePlay,
    toggleQueue,
    next,
    previous,
  } = usePlayer();

  if (!currentTrack) return null;

  const videoId = currentTrack.videoId || currentTrack.youtubeId;
  const cover =
    currentTrack.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  const openDetail = async () => {
    if (currentTrack.id) {
      navigation.navigate('SongDetail', { songId: currentTrack.id });
    } else if (videoId) {
      try {
        const { data } = await songsApi.saveFromYoutube(videoId);
        navigation.navigate('SongDetail', { songId: data.id });
      } catch {
        // ignore
      }
    }
  };

  return (
    <>
      <QueueSheet />
      <View style={styles.wrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
        <View style={styles.bar}>
          <TouchableOpacity style={styles.nowPlaying} onPress={openDetail} activeOpacity={0.7}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.thumb} />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleQueue} hitSlop={8} style={styles.queueBtn}>
            <Ionicons
              name="list"
              size={22}
              color={queueOpen ? colors.primary : colors.text}
            />
            {queue.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{queue.length > 99 ? '99+' : queue.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={previous} hitSlop={8}>
            <Ionicons name="play-skip-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} hitSlop={8} style={styles.playWrap}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons
                name={
                  hasError
                    ? 'refresh-circle'
                    : isPlaying
                      ? 'pause-circle'
                      : 'play-circle'
                }
                size={36}
                color={hasError ? colors.danger : colors.text}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={next} hitSlop={8}>
            <Ionicons name="play-skip-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.dark800,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    backgroundColor: colors.primary,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  nowPlaying: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  queueBtn: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  playWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
});
