"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

import Header from '@/components/ui-overhaul/Header';
import Hero from '@/components/ui-overhaul/Hero';
import LoginModal from '@/components/ui-overhaul/LoginModal';

export default function Home() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [publicStudio, setPublicStudio] = useState<{ name: string; brandConfig?: { logoUrl?: string; primaryColor?: string } | null } | null>(null);

  const validateCodeAndLogin = async (code: string) => {
    try {
      const res = await fetch('/api/events/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code })
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          alert("Invalid Access Code. Please try again.");
        } else {
          throw new Error("Failed to verify access code.");
        }
        return;
      }

      const data = await res.json();
      setShowLoginModal(false);
      router.push(`/gallery/${data.accessCode}`);
    } catch (error) {
      console.error("[Login] Verification error:", error);
      alert("Verification server unavailable. Please try again later.");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetch('/api/studio/public-config')
        .then(res => res.json())
        .then(data => {
          if (data.name || data.brandConfig) {
            setPublicStudio({ name: data.name || "TheZora", brandConfig: data.brandConfig });
          }
        })
        .catch(err => console.error("Error fetching public branding:", err));

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code') || urlParams.get('event');
      
      if (code) {
        const cleanCode = code.toUpperCase();
        setAccessCode(cleanCode);
        validateCodeAndLogin(cleanCode);
      }
    }
  }, []);

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
        
        {/* Features Section */}
        <section id="features" className="py-32 px-6 md:px-12 bg-black border-y border-zinc-900">
           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-20">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">AI-Driven Galleries</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Neural-powered face recognition allows your clients to find their photos instantly across thousands of images.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">Branded Experience</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Every studio receives a dedicated, white-labeled portal. Your brand, your colors, your legacy, delivered with elegance.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <h4 className="text-white font-serif text-2xl font-light">Unified Dashboard</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-light">Manage events, client access, and storage infrastructure from a single, high-performance interface.</p>
              </motion.div>
           </div>
        </section>

        {/* Studio Lead Gen Section */}
        <section id="contact" className="py-40 px-6 text-center bg-zinc-950/30">
           <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             className="max-w-3xl mx-auto"
           >
              <h2 className="text-4xl md:text-6xl font-serif font-light mb-8">Join the Future of Photography</h2>
              <p className="text-zinc-400 text-base md:text-lg mb-12 font-light">Empower your studio with state-of-the-art delivery technology. Limited studio openings for the Q3 2026 cohort.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  className="rounded-none border-zinc-800 hover:border-white text-zinc-400 hover:text-white px-12 py-8 text-xs tracking-[0.3em] uppercase transition-all duration-500 w-full sm:w-auto"
                  onClick={() => router.push('/admin')}
                >
                  Join the Platform
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-zinc-500 hover:text-white text-[10px] tracking-[0.2em] uppercase"
                  onClick={() => alert("Registration for new studios is currently by invite only. Please contact support@thezora.com")}
                >
                  Request Invite
                </Button>
              </div>
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
