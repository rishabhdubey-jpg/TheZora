"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessCardProps {
  studioName?: string;
  logoUrl?: string;
  eventName: string;
  accessCode: string;
}

export default function AccessCard({ studioName, logoUrl, eventName, accessCode }: AccessCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const downloadCard = async () => {
    if (cardRef.current === null) return;
    
    try {
      // High-res export (pixelRatio: 4 for ~300 DPI quality)
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true,
        pixelRatio: 4,
        quality: 1
      });
      const link = document.createElement('a');
      link.download = `${eventName.replace(/\s+/g, '-')}-Access-Card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate Access Card:', err);
    }
  };

  const galleryUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}?event=${accessCode}` 
    : "";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Hidden Card used for Capture */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div 
          ref={cardRef}
          className="w-[400px] h-[550px] bg-zinc-950 p-12 flex flex-col items-center text-center border border-zinc-800"
        >
          {/* Top: Event Name */}
          <div className="mb-8 w-full">
            <p className="text-zinc-500 text-[9px] tracking-[0.4em] uppercase mb-2 font-sans">Official Access</p>
            <h1 className="text-white font-serif text-3xl tracking-tight leading-tight">
              {eventName}
            </h1>
          </div>

          <div className="h-[1px] w-12 bg-zinc-800 mb-8" />

          {/* Center: QR Code */}
          <div className="bg-white p-6 mb-10 rounded-none shadow-2xl">
             <QRCodeSVG value={galleryUrl} size={180} level="H" includeMargin={false} />
          </div>

          {/* Bottom: Access Code */}
          <div className="mt-auto w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-zinc-800" />
              <p className="text-zinc-600 text-[8px] tracking-[0.4em] uppercase">Private Key</p>
              <div className="h-[1px] flex-1 bg-zinc-800" />
            </div>
            <h2 className="text-white font-sans font-black text-4xl tracking-widest uppercase">
               {accessCode}
            </h2>
          </div>

          {/* Footer: Studio Brand */}
          <div className="mt-8 pt-6 border-t border-zinc-900/50 w-full flex justify-between items-center text-[8px] tracking-[0.2em] uppercase text-zinc-600">
             <span>TheZora</span>
             <span className="italic">Collection 2026</span>
          </div>
        </div>
      </div>

      {/* Visible Action Button */}
      <Button 
        onClick={downloadCard}
        variant="outline"
        className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-950 rounded-none px-6 py-5 text-[10px] tracking-[0.2em] uppercase font-medium flex items-center gap-2 transition-all duration-300"
      >
        <Download className="w-3.5 h-3.5" />
        Export Access Card
      </Button>
    </div>
  );
}
