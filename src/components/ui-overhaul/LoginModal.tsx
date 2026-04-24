"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRScanner from "@/components/QRScanner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (code: string) => void;
  accessCode: string;
  setAccessCode: (code: string) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
  accessCode,
  setAccessCode,
}: LoginModalProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(accessCode);
  };

  const handleQRScan = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const eventCode = url.searchParams.get('event');
      if (eventCode) onLogin(eventCode);
    } catch {
      if (decodedText.length >= 4) onLogin(decodedText);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-black border-zinc-800 text-white rounded-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-center mb-2">Private Access</DialogTitle>
          <DialogDescription className="text-zinc-500 text-center text-xs tracking-widest uppercase">
            Unlock your cinematic collection
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {isScanning ? (
            <div className="flex flex-col gap-4">
              <div className="aspect-square bg-zinc-900 overflow-hidden border border-zinc-800">
                <QRScanner onScanSuccess={handleQRScan} />
              </div>
              <Button 
                variant="ghost" 
                className="text-zinc-500 hover:text-white"
                onClick={() => setIsScanning(false)}
              >
                Use Access Code
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="ENTER ACCESS CODE"
                  className="bg-zinc-900 border-zinc-800 text-white text-center tracking-[0.3em] uppercase h-14 rounded-none focus-visible:ring-1 focus-visible:ring-zinc-600"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-none text-xs tracking-[0.2em] uppercase"
                >
                  Unlock Gallery
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none text-xs tracking-[0.2em] uppercase"
                  onClick={() => setIsScanning(true)}
                >
                  Scan QR Invite
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
