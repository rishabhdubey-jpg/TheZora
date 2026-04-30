"use client";

import { useEffect, useRef, useState } from 'react';

export default function VideoPlayer({ src, poster, studioId }: { src: string, poster?: string, studioId?: string }) {
  const [signedSrc, setSignedSrc] = useState<string>('');
  const [signedPoster, setSignedPoster] = useState<string>(poster || '');
  const [isBrowser, setIsBrowser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsBrowser(true);
    
    const getSignedUrls = async () => {
      if (!src || !studioId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const url = new URL(src, window.location.origin);
        const path = url.searchParams.get('path') || src;
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path)}&studioId=${studioId}`);
        if (res.ok) {
          const data = await res.json();
          setSignedSrc(data.url);
        }

        if (poster && poster.includes('path=')) {
          const posterUrl = new URL(poster, window.location.origin);
          const posterPath = posterUrl.searchParams.get('path');
          if (posterPath) {
            const pRes = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(posterPath)}&studioId=${studioId}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              setSignedPoster(pData.url);
            }
          }
        }
      } catch (e) {
        console.error("[VideoPlayer] Signed URL fetch failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrls();
  }, [src, poster, studioId]);

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
        hls.loadSource(signedSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = signedSrc;
      }
    };

    initPlayer();

    return () => {
      if (hls) hls.destroy();
      if (player) player.destroy();
    };
  }, [signedSrc, isBrowser]);

  return (
    <div style={{ width: '100%', '--plyr-color-main': 'var(--accent)' } as React.CSSProperties} className="relative">
      {(isLoading || !signedSrc) ? (
        <div className="aspect-video w-full bg-zinc-950 animate-pulse flex items-center justify-center border border-zinc-900">
           <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
              <span className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Securing Stream...</span>
           </div>
        </div>
      ) : (
        <video ref={videoRef} playsInline poster={signedPoster} crossOrigin="anonymous" />
      )}
    </div>
  );
}
