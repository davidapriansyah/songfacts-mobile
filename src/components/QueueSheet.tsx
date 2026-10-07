import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayer, PlayableItem } from '../context/PlayerContext';
import { colors } from '../theme/colors';

export default function QueueSheet() {
  const { queue, currentTrack, queueOpen, toggleQueue, removeFromQueue, clearQueue, playSong } =
    usePlayer();

  const upcoming = queue;

  const handlePlayItem = useCallback(
    (item: PlayableItem) => {
      playSong(item);
    },
    [playSong]
  );

  const handleRemove = useCallback(
    (index: number) => {
      removeFromQueue(index);
    },
    [removeFromQueue]
  );

  const handleClear = useCallback(() => {
    clearQueue();
  }, [clearQueue]);

  const renderItem = useCallback(
    ({ item, index }: { item: PlayableItem; index: number }) => {
      const realIndex = index;
      const videoId = item.videoId || item.youtubeId;
      const cover =
        item.albumCover || (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);

      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => handlePlayItem(item)}
        >
          {cover ? (
            <Image source={{ uri: cover }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]} />
          )}
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.rowArtist} numberOfLines={1}>
              {item.artist}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleRemove(realIndex)} hitSlop={8} style={styles.removeBtn}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handlePlayItem, handleRemove]
  );

  return (
    <Modal visible={queueOpen} transparent animationType="slide" onRequestClose={toggleQueue}>
      <Pressable style={styles.overlay} onPress={toggleQueue}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Queue</Text>
              {queue.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{queue.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              {queue.length > 0 && (
                <TouchableOpacity onPress={handleClear} hitSlop={8}>
                  <Text style={styles.clearBtn}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={toggleQueue} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Now Playing */}
          {currentTrack && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Now Playing</Text>
              <View style={styles.nowPlayingRow}>
                {(() => {
                  const vid = currentTrack.videoId || currentTrack.youtubeId;
                  const img =
                    currentTrack.albumCover ||
                    (vid ? `https://img.youtube.com/vi/${vid}/default.jpg` : null);
                  return img ? (
                    <Image source={{ uri: img }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]} />
                  );
                })()}
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.primary }]} numberOfLines={1}>
                    {currentTrack.title}
                  </Text>
                  <Text style={styles.rowArtist} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Up Next */}
          {upcoming.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Up Next</Text>
              <FlatList
                data={upcoming}
                keyExtractor={(item, i) => `${item.videoId || item.youtubeId}-${i}`}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}

          {upcoming.length === 0 && !currentTrack && (
            <View style={styles.emptyWrap}>
              <Ionicons name="list-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No songs in queue</Text>
              <Text style={styles.emptyHint}>Tap + on songs to add them here</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark800,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearBtn: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
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
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowArtist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
});
