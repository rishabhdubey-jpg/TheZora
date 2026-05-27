"use client";

import { useEffect, useState } from 'react';

interface CinematicPlayerProps {
  src: string;
  poster?: string;
  contentType?: string;
  studioId?: string;
}

export default function CinematicPlayer({ src, poster, contentType, studioId }: CinematicPlayerProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoPoster, setVideoPoster] = useState<string | null>(poster || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("🎥 [CinematicPlayer] Prop 'src' received:", src);
    if (!src || !studioId) {
      console.warn("⚠️ [CinematicPlayer] Missing src or studioId. Prop 'src':", src, "Prop 'studioId':", studioId);
      setIsLoading(false);
      return;
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      try {
        // 1. Extract internal storage path from proxy URL if present
        let path = src;
        if (src.includes('path=')) {
          try {
            const url = new URL(src, window.location.origin);
            path = url.searchParams.get('path') || src;
          } catch (e) {
            const match = src.match(/path=([^&]+)/);
            if (match) path = decodeURIComponent(match[1]);
          }
        }

        console.log("🚀 [CinematicPlayer] Fetching direct signed URL for path:", path);

        // 2. Fetch the direct secure URL from the storage provider (Bypassing Vercel Proxy)
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(path)}&studioId=${studioId}`);
        console.log("📥 [CinematicPlayer] Signed URL response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          const finalUrl = data.url || data.signedUrl;
          console.log("🔗 [CinematicPlayer] Received direct URL:", finalUrl ? "SUCCESS (URL hidden)" : "FAILED (Empty URL)");
          setVideoSrc(finalUrl);
        } else {
          console.error("❌ [CinematicPlayer] API failed to return signed URL.");
        }

        // 3. Handle poster signed URL if it uses the proxy
        if (poster && (poster.includes('path=') || poster.includes('/api/storage/proxy'))) {
          let posterPath = poster;
          if (poster.includes('path=')) {
             const pMatch = poster.match(/path=([^&]+)/);
             if (pMatch) posterPath = decodeURIComponent(pMatch[1]);
          }
          
          const pRes = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(posterPath)}&studioId=${studioId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setVideoPoster(pData.url || pData.signedUrl);
          }
        }
      } catch (err) {
        console.error("❌ [CinematicPlayer] Global Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [src, poster, studioId]);

  if (isLoading || !videoSrc) {
    return (
      <div className="aspect-video w-full bg-zinc-950 animate-pulse flex items-center justify-center border border-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm tracking-widest uppercase font-light">Initializing Secure Stream...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black relative group flex flex-col" onContextMenu={(e) => e.preventDefault()}>
      <div className="relative flex-1 min-h-0">
        <video
          key={videoSrc}
          src={videoSrc}
          poster={videoPoster || ""}
          className="w-full h-full object-contain"
          preload="metadata"
          playsInline
          controls
          controlsList="nodownload"
          onError={(e) => {
            const error = e.currentTarget.error;
            console.error("🔴 [CinematicPlayer] NATIVE VIDEO ERROR:", error?.message, "Code:", error?.code);
          }}
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Visual protection overlay */}
        <div className="absolute inset-0 pointer-events-none border border-white/5" />
      </div>


    </div>
  );
}
