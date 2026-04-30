"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isGallery?: boolean;
  studioName?: string;
  eventName?: string;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

export default function Header({
  isGallery = false,
  studioName = "TheZora",
  eventName,
  onLoginClick,
  onLogoutClick,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4 md:px-12 md:py-6",
        scrolled ? "bg-black/80 backdrop-blur-xl border-b border-zinc-900" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 group" aria-label="TheZora - Capture. Automate. Scale.">
          {/* Static Primary Branding */}
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-zinc-500 font-serif text-xl md:text-2xl tracking-tighter uppercase font-medium">The</span>
            <span className="text-white font-serif text-xl md:text-2xl tracking-tighter uppercase font-bold ml-0.5">Zora</span>
          </motion.div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          <AnimatePresence mode="wait">
            {isGallery ? (
              <motion.div 
                key="gallery-nav"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-8"
              >
                <span className="text-zinc-400 text-xs tracking-widest uppercase ornament-line">
                  {eventName}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
                  onClick={onLogoutClick}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="public-nav"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-10"
              >
                <Link href="#portfolio" className="text-zinc-400 hover:text-white text-xs tracking-[0.2em] uppercase transition-colors">
                  Portfolio
                </Link>
                <Link href="#about" className="text-zinc-400 hover:text-white text-xs tracking-[0.2em] uppercase transition-colors">
                  Our Approach
                </Link>
                <Link href="/admin" className="text-zinc-500 hover:text-white text-xs tracking-[0.2em] uppercase transition-colors border-l border-zinc-800 pl-8 ml-4">
                  Studio Portal
                </Link>
                
                {/* Premium Login Button with Spotlight effect */}
                <div className="relative group">
                   <Button 
                    variant="outline"
                    className="relative z-10 rounded-none bg-black border-zinc-800 text-white text-xs tracking-[0.2em] uppercase px-8 py-6 hover:border-zinc-500 transition-all duration-500"
                    onClick={onLoginClick}
                  >
                    Client Login
                  </Button>
                  <div className="absolute -inset-1 bg-gradient-to-b from-zinc-800 to-transparent opacity-0 group-hover:opacity-20 transition-opacity blur-lg pointer-events-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100vh" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-0 top-[72px] bg-black z-40 md:hidden flex flex-col items-center justify-center gap-8"
          >
            {isGallery ? (
              <>
                <span className="text-zinc-500 text-sm">{eventName}</span>
                <Button variant="ghost" className="text-white" onClick={onLogoutClick}>Sign Out</Button>
              </>
            ) : (
              <>
                <Link href="#portfolio" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg tracking-widest uppercase">Portfolio</Link>
                <Link href="#about" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg tracking-widest uppercase">Our Approach</Link>
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 text-lg tracking-widest uppercase">Studio Portal</Link>
                <Button variant="outline" className="border-zinc-800 text-white w-full" onClick={onLoginClick}>Client Login</Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .ornament-line {
          position: relative;
          padding-left: 20px;
        }
        .ornament-line::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 12px;
          height: 1px;
          background: #3f3f46;
        }
      `}</style>
    </header>
  );
}
