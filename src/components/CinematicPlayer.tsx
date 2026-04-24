"use client";

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
}

export default function CinematicPlayer({ src, poster, contentType }: CinematicPlayerProps) {
  const plyrSource = {
    type: "video" as const,
    sources: [
      {
        src: src,
        type: contentType || "video/mp4",
      },
    ],
    poster: poster,
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
      <Plyr source={plyrSource} options={plyrOptions} />
      
      {/* Invisible overlay for added right-click protection */}
      <div className="absolute inset-0 z-10 pointer-events-none" />
    </div>
  );
}
