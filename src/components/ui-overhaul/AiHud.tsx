"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Crosshair, BrainCircuit, Loader2 } from "lucide-react";

interface AiHudProps {
  isActive: boolean;
  progress: number;
  matchCount?: number;
  statusText?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function AiHud({ 
  isActive, 
  progress, 
  matchCount = 0, 
  statusText = "Neural Scanning Active",
  onRetry,
  onClose
}: AiHudProps) {
  const isComplete = progress >= 100;
  const hasMatches = matchCount > 0;
  const isSuccess = isComplete && hasMatches;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl"
        >
          {/* Main Scanning Frame */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              borderColor: isSuccess ? "#d4af37" : "#27272a", // Zinc-800 to Gold
              boxShadow: isSuccess ? "0 0 40px rgba(212, 175, 55, 0.15)" : "none"
            }}
            transition={{ duration: 0.8 }}
            className="relative w-full max-w-2xl aspect-square md:aspect-video border-2 bg-black/80 overflow-hidden flex flex-col items-center justify-center transition-colors duration-1000"
          >
            
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] scale-150 rotate-12" />

            {/* Scanning Effect Overlay */}
            {!isComplete && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Horizontal Scanning Line */}
                <motion.div 
                  className="absolute left-0 right-0 z-30 flex flex-col items-center"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Sharp Line */}
                  <div className="w-full h-[1px] bg-white opacity-40 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  {/* Soft Glow */}
                  <div className="w-full h-24 bg-gradient-to-b from-white/10 via-transparent to-transparent -translate-y-12" />
                  <div className="w-full h-24 bg-gradient-to-t from-white/10 via-transparent to-transparent translate-y-12" />
                </motion.div>
                
                {/* Vertical Focal Line (optional but looks cool) */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-zinc-800/30" />
              </div>
            )}

            {/* Corner Brackets with dynamic coloring */}
            <motion.div 
              animate={{ borderColor: isSuccess ? "#d4af37" : "#52525b" }}
              className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 transition-colors duration-1000" 
            />
            <motion.div 
              animate={{ borderColor: isSuccess ? "#d4af37" : "#52525b" }}
              className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 transition-colors duration-1000" 
            />
            <motion.div 
              animate={{ borderColor: isSuccess ? "#d4af37" : "#52525b" }}
              className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 transition-colors duration-1000" 
            />
            <motion.div 
              animate={{ borderColor: isSuccess ? "#d4af37" : "#52525b" }}
              className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 transition-colors duration-1000" 
            />

            {/* Content Logic */}
            <div className="text-center relative z-20 px-8">
              <AnimatePresence mode="wait">
                {isComplete ? (
                  <motion.div 
                    key="complete"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className={hasMatches ? "text-gold" : "text-zinc-500"}>
                       {hasMatches ? (
                         <motion.div
                           animate={{ scale: [1, 1.1, 1], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] }}
                           transition={{ duration: 2, repeat: Infinity }}
                         >
                           <ShieldCheck className="w-20 h-20 mb-6 glow-gold" />
                         </motion.div>
                       ) : (
                         <BrainCircuit className="w-16 h-16 mb-6 opacity-40" />
                       )}
                    </div>
                    
                    <h3 className={hasMatches ? "text-white font-serif text-4xl mb-3 tracking-tight" : "text-zinc-500 font-serif text-3xl mb-2"}>
                      {hasMatches ? "Biometric Identification Validated" : "No Matches Found"}
                    </h3>
                    
                    <p className="text-zinc-500 text-[10px] tracking-[0.4em] uppercase mb-12">
                      {hasMatches ? `Matched ${matchCount} fragments in neural storage` : "We couldn't find any matching photos of you in this collection."}
                    </p>

                    {hasMatches ? (
                      <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "240px", opacity: 1 }}
                        className="h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent mb-8 shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                      />
                    ) : (
                      <div className="flex gap-4 mt-8">
                        <button 
                          onClick={onRetry}
                          className="px-6 py-3 bg-white text-black text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-zinc-200 transition-all"
                        >
                          Try Again
                        </button>
                        <button 
                          onClick={onClose}
                          className="px-6 py-3 border border-zinc-800 text-zinc-400 text-[10px] tracking-[0.2em] uppercase hover:text-white hover:border-zinc-600 transition-all"
                        >
                          Return to Gallery
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-8">
                      <Loader2 className="w-16 h-16 text-zinc-100/10 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Crosshair className="w-6 h-6 text-zinc-400" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                       <span className="text-zinc-100 text-xs tracking-[0.6em] uppercase font-light animate-pulse">
                         {statusText}
                       </span>
                       <div className="flex items-center gap-4 mt-4">
                          <span className="text-[10px] text-zinc-600 font-mono tracking-widest border border-zinc-800 px-3 py-1 rounded-full">
                            SNR. {progress > 90 ? "OPTIMIZING" : "SEARCHING"}
                          </span>
                          <span className="text-zinc-400 text-sm font-light font-mono tabular-nums">{progress}%</span>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dynamic Decorative HUD Elements */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-zinc-800/50" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-zinc-800/50" />

            {/* Bottom Progress Line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900">
               <motion.div 
                 className={`h-full ${isSuccess ? 'bg-gold shadow-[0_0_10px_#d4af37]' : 'bg-zinc-400'}`}
                 initial={{ width: "0%" }}
                 animate={{ width: `${progress}%` }}
                 transition={{ duration: 0.5 }}
               />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
