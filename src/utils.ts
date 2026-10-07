export interface SongLike {
  id?: number;
  videoId?: string;
  youtubeId?: string;
}

export function songKey(item: SongLike, index: number): string {
  return `${item.id ?? ''}:${item.videoId ?? item.youtubeId ?? ''}:${index}`;
}

export function dedupeSongs<T extends SongLike>(songs: T[]): T[] {
  const seen = new Set<string>();
  return songs.filter((s) => {
    const k = s.id != null ? `id:${s.id}` : `vid:${s.videoId || s.youtubeId || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
