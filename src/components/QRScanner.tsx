"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, Upload, ShieldAlert, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulletproof scanner initialization
  useEffect(() => {
    if (mode !== 'camera') return;

    let isMounted = true;
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = html5QrCode;

    const initializeScanner = async () => {
      setIsInitializing(true);
      setError(null);
      try {
        // 1. Check if hardware is available before starting
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0 && isMounted) {
          const config = {
            fps: 10,
            qrbox: (videoWidth: number, videoHeight: number) => {
              if (!videoWidth || !videoHeight) return { width: 250, height: 250 };
              const size = Math.floor(Math.min(videoWidth, videoHeight) * 0.7);
              return { width: size, height: size };
            }
          };

          try {
            // 2. Try rear camera first (Mobile)
            await html5QrCode.start(
              { facingMode: "environment" }, 
              config, 
              (decodedText) => {
                if (isMounted) onScanSuccess(decodedText);
              }
            );
            if (isMounted) setIsScanning(true);
          } catch (environmentErr) {
            // 3. Fallback to the first available device (Desktop)
            if (isMounted) {
              console.warn("Rear camera failed, falling back to default device.");
              try {
                await html5QrCode.start(
                  devices[0].id, 
                  config, 
                  (decodedText) => {
                    if (isMounted) onScanSuccess(decodedText);
                  }
                );
                setIsScanning(true);
              } catch (fallbackErr) {
                console.error("All camera initialization failed", fallbackErr);
                setError("Camera access blocked or unavailable.");
              }
            }
          }
        } else if (isMounted) {
          setError("No cameras detected on this device.");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to query cameras or start scanner:", err);
          setError("Failed to access camera hardware.");
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    initializeScanner();

    return () => {
      isMounted = false;
      if (html5QrCode.isScanning) {
        html5QrCode.stop()
          .then(() => html5QrCode.clear())
          .catch((err) => console.error("Cleanup error:", err));
      }
    };
  }, [mode, onScanSuccess]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        onScanSuccess(decodedText);
      } catch (err) {
        setError("Could not detect a valid QR code in this image.");
        if (onScanFailure) onScanFailure(err);
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 justify-center p-1 bg-zinc-900 rounded-none border border-zinc-800">
        <Button 
          variant={mode === 'camera' ? 'secondary' : 'ghost'} 
          size="sm"
          className="rounded-none text-[10px] tracking-widest uppercase flex-1"
          onClick={() => setMode('camera')}
        >
          <Camera className="w-3 h-3 mr-2" />
          Camera
        </Button>
        <Button 
          variant={mode === 'file' ? 'secondary' : 'ghost'} 
          size="sm"
          className="rounded-none text-[10px] tracking-widest uppercase flex-1"
          onClick={() => setMode('file')}
        >
          <Upload className="w-3 h-3 mr-2" />
          Upload
        </Button>
      </div>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <div className="space-y-4">


          {isInitializing && (
            <div className="flex flex-col items-center justify-center p-12 border border-zinc-800 bg-zinc-950/50">
              <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mb-4" />
              <p className="text-zinc-500 text-[10px] tracking-widest uppercase text-center">
                Accessing optical sensor...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center p-12 border border-red-900/50 bg-red-950/20">
              <ShieldAlert className="w-8 h-8 text-red-900 mb-4" />
              <p className="text-red-500 text-[10px] tracking-widest uppercase text-center mb-6">
                {error}
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-red-900/50 text-red-500 hover:bg-red-500/10 rounded-none text-[10px] tracking-widest uppercase px-8"
              >
                Reload Page
              </Button>
            </div>
          )}

          {/* Hidden initially, shown when isScanning is true */}
          <div 
            id="qr-reader" 
            className={`w-full overflow-hidden border border-zinc-800 bg-black aspect-square md:aspect-video min-h-[300px] ${isScanning || isInitializing ? 'block' : 'hidden'}`}
          ></div>
          
          {isScanning && (
            <p className="text-zinc-500 text-[10px] tracking-widest uppercase text-center">
              Align code within frame
            </p>
          )}
        </div>
      )}

      {/* File Mode */}
      {mode === 'file' && (
        <div id="qr-reader-file" className="text-center p-12 border border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center">
          <Upload className="w-8 h-8 text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-xs font-light mb-6">Select a digital invitation from your device.</p>
          
          {error && mode === 'file' && (
            <p className="text-red-500 text-[10px] tracking-widest uppercase mb-4">{error}</p>
          )}

          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            ref={fileInputRef}
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-white text-black hover:bg-zinc-200 rounded-none text-[10px] tracking-widest uppercase px-8"
          >
            Browse Files
          </Button>
        </div>
      )}
    </div>
  );
}
