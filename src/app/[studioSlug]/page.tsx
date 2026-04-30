"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Header from '@/components/ui-overhaul/Header';
import Hero from '@/components/ui-overhaul/Hero';
import LoginModal from '@/components/ui-overhaul/LoginModal';

export default function StudioPortfolio() {
  const params = useParams();
  const router = useRouter();
  const studioSlug = params.studioSlug as string;
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [studio, setStudio] = useState<{ name: string; brandConfig?: { logoUrl?: string; primaryColor?: string } | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const validateCodeAndLogin = async (code: string) => {
    try {
      const res = await fetch('/api/events/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code })
      });
      
      if (!res.ok) {
        alert("Invalid Access Code. Please try again.");
        return;
      }

      const data = await res.json();
      setShowLoginModal(false);
      router.push(`/gallery/${data.accessCode}`);
    } catch (error) {
      console.error("[Login] Verification error:", error);
    }
  };

  useEffect(() => {
    if (studioSlug) {
      fetch(`/api/studio/public-config?slug=${studioSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.name) {
            setStudio({ name: data.name, brandConfig: data.brandConfig });
            document.title = `${data.name} | TheZora`;
          } else {
            // Redirect to home if studio not found
            router.push('/');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching studio portfolio:", err);
          setLoading(false);
        });
    }
  }, [studioSlug, router]);

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-white font-sans selection:bg-white selection:text-black">
      <Header 
        isGallery={false}
        studioName={studio?.name || "TheZora"}
        logoUrl={studio?.brandConfig?.logoUrl}
        onLoginClick={() => setShowLoginModal(true)}
      />

      <main>
        {/* Studio Specific Hero */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
             <div className="relative z-10 max-w-4xl">
                <motion.span 
                  className="inline-block text-zinc-500 text-xs tracking-[0.4em] uppercase mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Portfolio of {studio?.name}
                </motion.span>
                <motion.h1 
                  className="text-white font-serif text-5xl md:text-7xl leading-tight mb-8 font-light"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Capturing <span className="italic">Eternal</span> <br /> Moments in Motion
                </motion.h1>
                <p className="text-zinc-400 text-lg font-light tracking-wide max-w-xl mx-auto mb-12">
                   Cinematic storytelling and premium delivery for {studio?.name}&apos;s exclusive clientele.
                </p>
                <button 
                  className="bg-white text-black hover:bg-zinc-200 rounded-none px-12 py-6 text-xs tracking-[0.2em] uppercase transition-all duration-300"
                  onClick={() => setShowLoginModal(true)}
                >
                  Unlock Your Gallery
                </button>
             </div>
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black pointer-events-none" />
        </section>

        {/* Portfolio Content (Placeholder for studio's work) */}
        <section id="portfolio" className="py-32 px-6 md:px-12 bg-black border-t border-zinc-900 text-center">
           <h3 className="text-2xl md:text-4xl font-serif font-light mb-12">The Portfolio</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/5] bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                   <span className="text-zinc-700 text-[10px] tracking-widest uppercase">Work Sample {i}</span>
                </div>
              ))}
           </div>
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
           <p className="text-zinc-600 text-[10px] tracking-widest uppercase">&copy; 2026 {studio?.name}. Powered by TheZora.</p>
        </div>
      </footer>
    </div>
  );
}
