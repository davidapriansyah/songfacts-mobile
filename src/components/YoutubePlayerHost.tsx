import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';
import { YOUTUBE_PLAYER_HTML } from '../services/youtubePlayerHtml';

// YouTube requires every embedder to identify itself through a real https origin.
// A page with no origin gets Error 153; a page claiming to be youtube.com gets
// Error 152 ("this video is unavailable"). The documented identity for a native
// app is https://<applicationId>, so we build it from app.json rather than
// hard-coding it here.
const APP_ORIGIN = `https://${
  Constants.expoConfig?.android?.package ||
  Constants.expoConfig?.ios?.bundleIdentifier ||
  'com.bloop.music'
}`;

export type YoutubePlayerEvent =
  | { type: 'booted' }
  | { type: 'apiReady' }
  | { type: 'ready' }
  | { type: 'time'; position: number; duration: number; playing: boolean }
  | { type: 'state'; state: number; name: string }
  | { type: 'error'; code: number; detail?: string };

export interface YoutubePlayerHandle {
  load: (videoId: string, autoplay: boolean) => void;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
  resume: () => void;
}

interface Props {
  onEvent: (event: YoutubePlayerEvent) => void;
}

type Command =
  | { kind: 'load'; videoId: string; autoplay: boolean }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'seek'; seconds: number }
  | { kind: 'stop' }
  | { kind: 'resume' };

function toJavaScript(cmd: Command): string {
  switch (cmd.kind) {
    case 'load':
      return `window.__yt && window.__yt.load(${JSON.stringify(cmd.videoId)}, ${cmd.autoplay}); true;`;
    case 'play':
      return 'window.__yt && window.__yt.play(); true;';
    case 'pause':
      return 'window.__yt && window.__yt.pause(); true;';
    case 'seek':
      return `window.__yt && window.__yt.seek(${cmd.seconds}); true;`;
    case 'stop':
      return 'window.__yt && window.__yt.stop(); true;';
    case 'resume':
      return 'window.__yt && window.__yt.resume(); true;';
  }
}

/**
 * Tiny host WebView that owns the YouTube IFrame Player. It is kept mounted
 * (1x1, near-invisible) so the player survives while the app sits in the
 * background after the user presses Home.
 */
const YoutubePlayerHost = forwardRef<YoutubePlayerHandle, Props>(function YoutubePlayerHost(
  { onEvent },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const pageReadyRef = useRef(false);
  const bufferedRef = useRef<Command[]>([]);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const flush = useCallback(() => {
    const buffered = bufferedRef.current;
    bufferedRef.current = [];
    buffered.forEach((cmd) => webviewRef.current?.injectJavaScript(toJavaScript(cmd)));
  }, []);

  const send = useCallback((cmd: Command) => {
    if (!pageReadyRef.current) {
      bufferedRef.current.push(cmd);
      return;
    }
    webviewRef.current?.injectJavaScript(toJavaScript(cmd));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      load: (videoId, autoplay) => send({ kind: 'load', videoId, autoplay }),
      play: () => send({ kind: 'play' }),
      pause: () => send({ kind: 'pause' }),
      seek: (seconds) => send({ kind: 'seek', seconds }),
      stop: () => send({ kind: 'stop' }),
      resume: () => send({ kind: 'resume' }),
    }),
    [send]
  );

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as YoutubePlayerEvent;
      onEventRef.current(parsed);
    } catch {}
  }, []);

  const handleLoad = useCallback(() => {
    pageReadyRef.current = true;
    flush();
  }, [flush]);

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        ref={webviewRef}
        source={{ html: YOUTUBE_PLAYER_HTML, baseUrl: APP_ORIGIN }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        onLoad={handleLoad}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
});

export default YoutubePlayerHost;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 1,
    height: 1,
    opacity: 0.01,
    zIndex: -1,
    overflow: 'hidden',
  },
  webview: {
    width: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
});
