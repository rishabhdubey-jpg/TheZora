"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from "next/dynamic";
import "plyr-react/plyr.css";

// Dynamic import to prevent SSR hydration mismatch as Plyr requires window API
const Plyr = dynamic(() => import("plyr-react").then((mod) => mod.Plyr), { 
  ssr: false,
  loading: () => <div className="aspect-video w-full bg-zinc-950 animate-pulse border border-zinc-900" />
});

interface CinematicPlayerProps {
  src: string;
  poster?: string;
  contentType?: string;
  studioId?: string;
}

export default function CinematicPlayer({ src, poster, contentType, studioId }: CinematicPlayerProps) {
  const [signedSrc, setSignedSrc] = useState<string>('');
  const [signedPoster, setSignedPoster] = useState<string>(poster || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
        console.error("[CinematicPlayer] Signed URL fetch failed:", e);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrls();
  }, [src, poster, studioId]);

  const plyrSource = {
    type: "video" as const,
    sources: [
      {
        src: signedSrc,
        type: contentType || "video/mp4",
      },
    ],
    poster: signedPoster,
  };

  const plyrOptions = {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'settings',
      'fullscreen',
    ],
    settings: ['quality', 'speed'],
    invertTime: false,
    toggleInvert: false,
    tooltips: { controls: true, seek: true },
  };

  return (
    <div 
      className="w-full h-full relative group/plyr overflow-hidden" 
      onContextMenu={(e) => e.preventDefault()}
    >
      {(isLoading || !signedSrc) ? (
        <div className="aspect-video w-full bg-zinc-950 animate-pulse flex items-center justify-center border border-zinc-900">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm tracking-widest uppercase">Loading Secure Stream...</span>
           </div>
        </div>
      ) : (
        <Plyr source={plyrSource} options={plyrOptions} />
      )}
      
      {/* Invisible overlay for added right-click protection */}
      <div className="absolute inset-0 z-10 pointer-events-none" />
    </div>
  );
}
