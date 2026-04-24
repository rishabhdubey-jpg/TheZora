"use client";

import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ src, poster }: { src: string, poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(true);
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    let player: any;
    let hls: any;

    const initPlayer = async () => {
      const video = videoRef.current;
      if (!video) return;

      // Dynamic imports to prevent SSR errors
      const [{ default: Plyr }, { default: Hls }] = await Promise.all([
        import('plyr'),
        import('hls.js'),
      ]);
      import('plyr/dist/plyr.css');

      player = new Plyr(video, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
        settings: ['captions', 'quality', 'speed', 'loop'],
      });

      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      }
    };

    initPlayer();

    return () => {
      if (hls) hls.destroy();
      if (player) player.destroy();
    };
  }, [src, isBrowser]);

  return (
    <div style={{ width: '100%', '--plyr-color-main': 'var(--accent)' } as React.CSSProperties}>
      <video ref={videoRef} playsInline poster={poster} crossOrigin="anonymous" />
    </div>
  );
}
