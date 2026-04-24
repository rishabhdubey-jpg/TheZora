"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onUnlockClick?: () => void;
}

export default function Hero({ onUnlockClick }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-black">
      {/* Background Decorative Element */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-zinc-900 rounded-full opacity-20 pointer-events-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-zinc-800 rounded-full opacity-10 pointer-events-none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 2.5, ease: "easeOut", delay: 0.2 }}
      />

      <div className="relative z-10 max-w-4xl">
        <motion.span 
          className="inline-block text-zinc-500 text-xs md:text-sm tracking-[0.4em] uppercase mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Exclusive Fine Art Photography
        </motion.span>
        
        <motion.h1 
          className="text-white font-serif text-5xl md:text-8xl leading-tight md:leading-tight mb-8 font-light"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          Capturing <span className="italic">Eternal</span> <br className="hidden md:block" /> Love in Motion
        </motion.h1>
        
        <motion.p 
          className="text-zinc-400 text-base md:text-xl font-light tracking-wide max-w-xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
        >
          Cinematic storytelling for the modern couple who <br className="hidden md:block" /> 
          values the art of the moment.
        </motion.p>
        
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
           className="flex flex-col md:flex-row items-center justify-center gap-6"
        >
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-none px-10 py-7 text-xs tracking-[0.2em] uppercase transition-all duration-300 transform hover:scale-105"
            onClick={onUnlockClick}
          >
            Unlock Your Gallery
          </Button>
          <Button 
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-transparent rounded-none px-10 py-7 text-xs tracking-[0.2em] uppercase border border-transparent hover:border-zinc-800 transition-all duration-300"
            onClick={() => {
                document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View Portfolio
          </Button>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <span className="text-[10px] text-zinc-600 tracking-[0.3em] uppercase rotate-90 origin-left ml-4">Scroll</span>
        <div className="w-[1px] h-16 bg-gradient-to-b from-zinc-800 to-transparent" />
      </motion.div>
    </section>
  );
}
