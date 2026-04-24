"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { BentoGrid, BentoGridItem } from "../ui/bento-grid";
import { cn } from "@/lib/utils";

interface GalleryPhoto {
  id?: string;
  url: string;
  contentType: string;
  isClientFavorite?: boolean;
}

interface GalleryGridProps {
  photos: GalleryPhoto[];
  isAiFiltering?: boolean;
  onPhotoClick: (photo: GalleryPhoto) => void;
  onToggleFavorite?: (photoId: string) => void;
}

export default function GalleryGrid({ photos, isAiFiltering, onPhotoClick, onToggleFavorite }: GalleryGridProps) {
  if (photos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-32 border border-dashed border-zinc-800 rounded-lg max-w-7xl mx-auto"
      >
        <p className="text-zinc-500 font-serif italic text-lg">
          {isAiFiltering ? "No biographical matches found in this collection." : "The collection is currently being curated."}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="py-8 px-2 md:px-8">
      <BentoGrid className="max-w-[100vw] md:max-w-7xl mx-auto">
        {photos.map((photo, idx) => {
          const isVideo = photo.contentType?.startsWith("video/");
          
          // Layout Logic for varied grid appearance
          // Pattern: 1: Big, 2: Small, 3: Small, 4: Wide, 5: Small, 6: Small...
          const layoutClass = cn(
            idx === 0 ? "md:col-span-2 md:row-span-2" : "",
            idx === 3 || idx === 6 ? "md:col-span-2" : "",
            "overflow-hidden bg-zinc-950 border-zinc-900/50 hover:border-zinc-700 transition-all duration-500 p-0"
          );

          return (
             <BentoGridItem
              key={photo.id || idx}
              title={isVideo ? "Cinematic Fragment" : "Static Legacy"}
              description={isVideo ? "Motion capture" : "Captured moment"}
              className={layoutClass}
              onClick={() => onPhotoClick(photo)}
              isFavorite={photo.isClientFavorite}
              onToggleFavorite={() => photo.id && onToggleFavorite?.(photo.id)}
              header={
                <div className="w-full h-full min-h-[12rem] relative group/media overflow-hidden">
                   <motion.div 
                    className="w-full h-full"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 1.2, ease: [0.165, 0.84, 0.44, 1] }}
                  >
                    {isVideo ? (
                      <div className="w-full h-full relative">
                        <video 
                          src={photo.url} 
                          className="w-full h-full object-cover grayscale-[0.3] group-hover/media:grayscale-0 transition-all duration-700"
                          muted 
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/media:bg-black/0 transition-colors duration-500">
                           <div className="w-12 h-12 rounded-full border border-white/50 flex items-center justify-center backdrop-blur-sm">
                            <Play className="text-white w-5 h-5 fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="relative w-full h-full">
                      <img 
                        src={photo.url} 
                        alt={`Wedding Moment ${idx + 1}`}
                        className="w-full h-full object-cover grayscale-[0.5] group-hover/media:grayscale-0 transition-all duration-700 brightness-[0.8] group-hover/media:brightness-100 pointer-events-none select-none"
                      />
                      {/* Transparent Overlay to block direct right-click/drag interaction */}
                      <div className="absolute inset-0 z-20 bg-transparent" />
                    </div>
                    )}
                  </motion.div>
                  
                  {/* Subtle Focus Ring */}
                  <div className="absolute inset-0 border border-white/0 group-hover/media:border-white/5 transition-colors duration-500 pointer-events-none" />
                </div>
              }
            />
          );
        })}
      </BentoGrid>
    </div>
  );
}
