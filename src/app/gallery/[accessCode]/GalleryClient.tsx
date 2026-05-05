"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

import Header from '@/components/ui-overhaul/Header';
import GalleryGrid from '@/components/ui-overhaul/GalleryGrid';
import AiHud from '@/components/ui-overhaul/AiHud';
import AiMatchModal from '@/components/AiMatchModal';
import AccessCard from '@/components/ui-overhaul/AccessCard';
import CinematicPlayer from '@/components/CinematicPlayer';
import { toast } from 'sonner';

interface GalleryPhoto {
  id?: string;
  url: string;
  contentType: string;
  isClientFavorite?: boolean;
}

interface GalleryEvent {
  id: string; // This is accessCode
  dbId: string; // This is the actual DB ID
  studioId: string; // Added studioId for URL sanitization
  name: string;
  mediaCount: number;
  photos: GalleryPhoto[];
  cinematicPoster?: string;
  cinematicVideoId?: string | null;
  studioName?: string;
  brandConfig?: { logoUrl?: string; primaryColor?: string } | null;
}

export default function GalleryClient({ initialEvent }: { initialEvent: GalleryEvent }) {
  const [currentEvent, setCurrentEvent] = useState<GalleryEvent>(initialEvent);
  const [showAiInputModal, setShowAiInputModal] = useState(false);
  const [aiFilterActive, setAiFilterActive] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState<GalleryPhoto | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmptyMatch, setIsEmptyMatch] = useState(false);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG') {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsAdmin(urlParams.get('admin') === 'true');
    }
  }, []);

  const handleAiMatchSuccess = async (selfieDescriptor: Float32Array) => {
    setShowAiInputModal(false);
    setIsAiProcessing(true);
    setIsEmptyMatch(false);
    setScanProgress(0);

    try {
      // Near-instant matching via pgvector backend
      const res = await fetch(`/api/gallery/${currentEvent.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: Array.from(selfieDescriptor) })
      });

      if (!res.ok) throw new Error('Backend matching failed');

      const data = await res.json();
      
      setFilteredPhotos(data.photos);
      setAiFilterActive(data.photos.length > 0);
      
      // Artificial delay for UX "scanned" feel, but much shorter now
      for (let i = 0; i <= 100; i += 20) {
        setScanProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }

      if (data.photos.length > 0) {
        setTimeout(() => setIsAiProcessing(false), 500);
      } else {
        setIsEmptyMatch(true);
        // Keep isAiProcessing true so the HUD stays visible with the empty state UI
      }

    } catch (err) {
      console.error("Deep Scan Failure:", err);
      toast.error("The biometric scan encountered a neural network error.");
      setIsAiProcessing(false);
    }
  };

  const handleToggleFavorite = async (photoId: string) => {
    const updatedPhotos = currentEvent.photos.map(p => 
      p.id === photoId ? { ...p, isClientFavorite: !p.isClientFavorite } : p
    );
    
    const previousEventState = { ...currentEvent };
    setCurrentEvent({ ...currentEvent, photos: updatedPhotos });

    try {
      const isFavorite = updatedPhotos.find(p => p.id === photoId)?.isClientFavorite;
      const res = await fetch(`/api/gallery/${photoId}/favorite`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
      });
      if (!res.ok) {
        setCurrentEvent(previousEventState);
        toast.error("Failed to save favorite.");
      }
    } catch (err) {
      setCurrentEvent(previousEventState);
      toast.error("Network error. Failed to save favorite.");
    }
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  const displayPhotos = aiFilterActive ? filteredPhotos : currentEvent.photos;
  const highlightVideo = currentEvent.photos.find(p => p.id === currentEvent.cinematicVideoId) || currentEvent.photos.find(p => p.contentType?.startsWith('video/'));

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      <Header 
        isGallery={true}
        studioName={currentEvent.studioName}
        logoUrl={currentEvent.brandConfig?.logoUrl}
        eventName={currentEvent.name}
        onLogoutClick={handleLogout}
      />

      <main className="pt-24 md:pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <section className="mb-20 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl font-serif font-light mb-6"
          >
            {currentEvent.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-zinc-500 text-sm md:text-base tracking-widest uppercase mb-12"
          >
            A timeless celebration of love and legacy.
          </motion.p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
             {isAdmin && (
                <AccessCard 
                  studioName={currentEvent.studioName}
                  logoUrl={currentEvent.brandConfig?.logoUrl}
                  eventName={currentEvent.name}
                  accessCode={currentEvent.id}
                />
             )}
             {!aiFilterActive && (
                <Button 
                  onClick={() => setShowAiInputModal(true)}
                  className="bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 rounded-none px-8 py-6 text-xs tracking-[0.2em] uppercase transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Biometric Identification
                </Button>
             )}
             {aiFilterActive && (
                <Button 
                  onClick={() => setAiFilterActive(false)}
                  variant="outline"
                  className="border-zinc-800 text-zinc-400 hover:text-white rounded-none px-8 py-6 text-xs tracking-[0.2em] uppercase"
                >
                  View Original Collection
                </Button>
             )}
          </div>
        </section>

        <section className="mb-32">
           <div className="flex items-center gap-4 mb-8">
             <div className="h-px flex-1 bg-zinc-900" />
             <h2 className="text-zinc-500 text-[10px] tracking-[0.4em] uppercase">Cinematic Highlight</h2>
             <div className="h-px flex-1 bg-zinc-900" />
           </div>
           
           {highlightVideo ? (
              <div className="relative aspect-video md:aspect-[21/9] bg-zinc-900 overflow-hidden border border-zinc-900/50">
                  <CinematicPlayer 
                    src={highlightVideo.url} 
                    poster={currentEvent.cinematicPoster}
                    contentType={highlightVideo.contentType}
                    studioId={currentEvent.studioId}
                  />
              </div>
           ) : (
              <div className="aspect-[21/9] bg-zinc-950 border border-zinc-900/50 flex flex-col items-center justify-center text-center p-12">
                 <Camera className="w-8 h-8 text-zinc-800 mb-4" />
                 <p className="text-zinc-600 font-serif italic">The highlighting process is underway.</p>
              </div>
           )}
        </section>

        <section id="collection">
           <div className="flex items-center justify-between mb-12">
              <h3 className="font-serif text-2xl md:text-3xl text-white font-light lowercase">
                  {aiFilterActive ? "identities found" : "the collection"}
              </h3>
              <span className="text-zinc-600 text-[10px] tracking-[0.2em] uppercase">{displayPhotos.length} Assets</span>
           </div>
           
           <GalleryGrid 
              photos={displayPhotos} 
              isAiFiltering={aiFilterActive}
              onPhotoClick={(photo) => setCurrentPhoto(photo)}
              onToggleFavorite={handleToggleFavorite}
            />
        </section>
      </main>

      <AiHud 
        isActive={isAiProcessing} 
        progress={scanProgress} 
        matchCount={filteredPhotos.length}
        onRetry={() => {
          setIsAiProcessing(false);
          setShowAiInputModal(true);
        }}
        onClose={() => setIsAiProcessing(false)}
      />

      <AnimatePresence>
        {currentPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setCurrentPhoto(null)}
          >
            <button className="absolute top-8 right-8 text-white p-2 z-[210] hover:scale-110 transition-transform">
              <X className="w-8 h-8" />
            </button>
            
            <motion.div 
              className="max-w-full max-h-full flex items-center justify-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {currentPhoto.contentType?.startsWith("video/") ? (
                <div className="w-[90vw] md:w-[70vw] lg:w-[60vw] aspect-video">
                  <CinematicPlayer 
                    src={currentPhoto.url} 
                    contentType={currentPhoto.contentType}
                    studioId={currentEvent.studioId}
                  />
                </div>
              ) : (
                <img src={currentPhoto.url} alt="Magnified Moment" className="max-w-full max-h-[90vh] object-contain shadow-2xl" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAiInputModal && (
        <AiMatchModal
          onClose={() => setShowAiInputModal(false)}
          onMatchSuccess={handleAiMatchSuccess}
        />
      )}

      <footer className="py-20 px-6 border-t border-zinc-900 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
           <span className="font-serif text-xl tracking-tighter opacity-50 uppercase">{currentEvent.studioName || "TheZora"}</span>
           <p className="text-zinc-600 text-[10px] tracking-widest uppercase">&copy; 2026 TheZora. Legacy Guaranteed.</p>
        </div>
      </footer>
    </div>
  );
}
