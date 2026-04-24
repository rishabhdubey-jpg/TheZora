"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

// New Components
import Header from '@/components/ui-overhaul/Header';
import Hero from '@/components/ui-overhaul/Hero';
import GalleryGrid from '@/components/ui-overhaul/GalleryGrid';
import AiHud from '@/components/ui-overhaul/AiHud';
import LoginModal from '@/components/ui-overhaul/LoginModal';
import AiMatchModal from '@/components/AiMatchModal';
import AccessCard from '@/components/ui-overhaul/AccessCard';
import CinematicPlayer from '@/components/CinematicPlayer';
import { toast, Toaster } from 'sonner';

interface GalleryPhoto {
  id?: string;
  url: string;
  contentType: string;
  isClientFavorite?: boolean;
}

interface GalleryEvent {
  id: string;
  name: string;
  mediaCount: number;
  photos: GalleryPhoto[];
  cinematicPoster?: string;
  cinematicVideoId?: string | null;
  studioName?: string;
  brandConfig?: { logoUrl?: string; primaryColor?: string } | null;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAiInputModal, setShowAiInputModal] = useState(false);
  const [aiFilterActive, setAiFilterActive] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [accessCode, setAccessCode] = useState('');
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState<GalleryPhoto | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [currentEvent, setCurrentEvent] = useState<GalleryEvent | null>(null);
  const [publicStudio, setPublicStudio] = useState<{ name: string; brandConfig?: { logoUrl?: string; primaryColor?: string } | null } | null>(null);

  // --- EXISTING LOGIC STARTS ---
  const validateCodeAndLogin = async (code: string) => {
    try {
      const res = await fetch(`/api/events/verify?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        if (res.status === 404) {
          alert("Invalid Access Code. Please try again.");
        } else {
          throw new Error("Failed to verify access code.");
        }
        return;
      }

      const event = await res.json();
      setCurrentEvent(event);
      setIsLoggedIn(true);
      setShowLoginModal(false);
      localStorage.setItem('antigravity_last_event', JSON.stringify(event));
    } catch (error) {
      console.error("[Login] Verification error:", error);
      alert("Verification server unavailable. Please try again later.");
    }
  };

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
      fetch('/api/admin/settings?studioId=demo-studio')
        .then(res => res.json())
        .then(data => {
          if (data.brandConfig) {
            setPublicStudio({ name: "TheZora", brandConfig: data.brandConfig });
          }
        })
        .catch(err => console.error("Error fetching public branding:", err));

      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get('event');
      setIsAdmin(urlParams.get('admin') === 'true');
      
      if (eventId) {
        setAccessCode(eventId.toUpperCase());
        validateCodeAndLogin(eventId);
      } else {
        const saved = localStorage.getItem('antigravity_last_event');
        if (saved) {
          const event = JSON.parse(saved);
          setCurrentEvent(event);
          setIsLoggedIn(true);

          fetch(`/api/events/verify?code=${encodeURIComponent(event.id)}`)
            .then(res => res.json())
            .then(freshData => {
              if (freshData.error) return;
              setCurrentEvent(freshData);
              localStorage.setItem('antigravity_last_event', JSON.stringify(freshData));
            })
            .catch(err => console.error('[Hydration] Background validation failed:', err));
        }
      }
    }
  }, []);

  const handleAiMatchSuccess = async (selfieDescriptor: Float32Array) => {
    if (!currentEvent) return;

    setShowAiInputModal(false);
    setIsAiProcessing(true);
    setScanProgress(0);

    try {
      const faceapi = await import('@vladmandic/face-api');
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);

      const matched: GalleryPhoto[] = [];
      const threshold = 0.6; 

      for (let i = 0; i < currentEvent.photos.length; i++) {
        const photo = currentEvent.photos[i];
        if (!photo.contentType?.startsWith("image/")) continue;

        setScanProgress(Math.round(((i + 1) / currentEvent.photos.length) * 100));

        try {
          const img = new Image();
          img.src = photo.url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          const detections = await (faceapi as any).detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();

          for (const det of detections) {
            const distance = (faceapi as any).euclideanDistance(selfieDescriptor, det.descriptor);
            if (distance < threshold) {
              matched.push(photo);
              break;
            }
          }
        } catch (e) {
          console.error(`Skipping photo ${photo.url} due to error:`, e);
        }
      }

      setFilteredPhotos(matched);
      setAiFilterActive(matched.length > 0);
      
      // Keep HUD active for a moment if matches found to show the "Success" state
      if (matched.length > 0) {
        setTimeout(() => setIsAiProcessing(false), 2000);
      } else {
        setIsAiProcessing(false);
      }

    } catch (err) {
      console.error("Deep Scan Failure:", err);
      alert("The biometric scan encountered a neural network error.");
      setIsAiProcessing(false);
    }
  };

  const handleToggleFavorite = async (photoId: string) => {
    if (!currentEvent) return;

    // OPTIMISTIC UPDATE: Immediate UI response
    const updatedPhotos = currentEvent.photos.map(p => 
      p.id === photoId ? { ...p, isClientFavorite: !p.isClientFavorite } : p
    );
    
    const previousEventState = { ...currentEvent };
    setCurrentEvent({ ...currentEvent, photos: updatedPhotos });

    // BACKGROUND SYNC: Atomically update the persistent state
    try {
      const isFavorite = updatedPhotos.find(p => p.id === photoId)?.isClientFavorite;
      const res = await fetch(`/api/gallery/${photoId}/favorite`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
      });
      if (!res.ok) {
        // Rollback on server failure
        setCurrentEvent(previousEventState);
        toast.error("Failed to save favorite.");
      }
    } catch (err) {
      setCurrentEvent(previousEventState);
      toast.error("Network error. Failed to save favorite.");
    }
  };
  // --- EXISTING LOGIC ENDS ---

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentEvent(null);
    setAiFilterActive(false);
    localStorage.removeItem('antigravity_last_event');
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  if (isLoggedIn && currentEvent) {
    const displayPhotos = aiFilterActive ? filteredPhotos : currentEvent.photos;
    const highlightVideo = currentEvent.photos.find(p => p.id === currentEvent.cinematicVideoId) || currentEvent.photos.find(p => p.contentType?.startsWith('video/'));

    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
        <Header 
          isGallery={true}
          studioName={currentEvent.studioName || publicStudio?.name}
          logoUrl={currentEvent.brandConfig?.logoUrl}
          eventName={currentEvent.name}
          onLogoutClick={handleLogout}
        />

        <main className="pt-24 md:pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
          {/* Gallery Header */}
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
                    studioName={currentEvent.studioName || publicStudio?.name}
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

          {/* Cinematic Highlight */}
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
                    />
                </div>
             ) : (
                <div className="aspect-[21/9] bg-zinc-950 border border-zinc-900/50 flex flex-col items-center justify-center text-center p-12">
                   <Camera className="w-8 h-8 text-zinc-800 mb-4" />
                   <p className="text-zinc-600 font-serif italic">The highlighting process is underway.</p>
                </div>
             )}
          </section>

          {/* Grid Collection */}
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

        {/* HUD Layer */}
        <AiHud 
          isActive={isAiProcessing} 
          progress={scanProgress} 
          matchCount={filteredPhotos.length}
        />

        {/* Lightbox */}
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
             <span className="font-serif text-xl tracking-tighter opacity-50 uppercase">{publicStudio?.name || "TheZora"}</span>
             <p className="text-zinc-600 text-[10px] tracking-widest uppercase">&copy; 2026 TheZora. Legacy Guaranteed.</p>
          </div>
        </footer>
      </div>
    );
  }

  // --- PUBLIC LANDING VIEW ---
  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-white selection:text-black">
      <Header 
        isGallery={false}
        studioName={publicStudio?.name}
        logoUrl={publicStudio?.brandConfig?.logoUrl}
        onLoginClick={() => setShowLoginModal(true)}
      />

      <main>
        <Hero onUnlockClick={() => setShowLoginModal(true)} />
        
        {/* About Section (Minimalist) */}
        <section id="about" className="py-32 px-6 md:px-12 bg-black border-y border-zinc-900">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">Artistic Vision</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Combining cinematic storytelling with high-fashion aesthetics to create a visual legacy.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">Optic Excellence</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Utilizing state-of-the-art anamorphic optics to capture every shimmer of light and emotion.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">Private Access</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Neural-powered galleries designed to deliver your memories with elegance and privacy.</p>
              </motion.div>
           </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="py-40 px-6 text-center">
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="max-w-3xl mx-auto"
           >
              <h2 className="text-4xl md:text-6xl font-serif font-light mb-8">Reserve Your Legacy</h2>
              <p className="text-zinc-400 text-base md:text-lg mb-12 font-light">Limited commissions accepted for the 2026-2027 seasons.</p>
              <Button 
                variant="outline" 
                className="rounded-none border-zinc-800 hover:border-white text-zinc-400 hover:text-white px-12 py-8 text-xs tracking-[0.3em] uppercase transition-all duration-500"
                onClick={() => alert("Inquiries are managed via the TheZora portal.")}
              >
                Inquire Now
              </Button>
           </motion.div>
        </section>
      </main>

      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={validateCodeAndLogin}
        accessCode={accessCode}
        setAccessCode={setAccessCode}
      />

      <footer className="py-20 px-6 border-t border-zinc-900 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
           <div className="flex items-center gap-8">
              <Link href="https://www.instagram.com/thezora.in/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white text-[10px] tracking-[0.2em] uppercase transition-colors">Instagram</Link>
              <Link href="/admin" className="text-zinc-500 hover:text-white text-[10px] tracking-[0.2em] uppercase transition-colors">Studio Access</Link>
           </div>
           <p className="text-zinc-600 text-[10px] tracking-widest uppercase">&copy; 2026 TheZora. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
