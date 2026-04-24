"use client";

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [mode, setMode] = useState<'camera'|'file'>('camera');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'camera') {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [0] },
          false
        );
        scannerRef.current.render(onScanSuccess, onScanFailure || (() => {}));
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  }, [mode, onScanFailure, onScanSuccess]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        onScanSuccess(decodedText);
      } catch (err) {
        alert("Could not detect a valid QR code in this image.");
        if (onScanFailure) onScanFailure(err);
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
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

      {mode === 'camera' ? (
        <div className="space-y-4">
          <p className="text-zinc-500 text-[10px] tracking-widest uppercase text-center">
            Initializing optical sensor...
          </p>
          <div id="qr-reader" className="w-full overflow-hidden border border-zinc-800 bg-white"></div>
        </div>
      ) : (
        <div id="qr-reader-file" className="text-center p-12 border border-dashed border-zinc-800 bg-zinc-950/50 flex flex-col items-center justify-center">
          <Upload className="w-8 h-8 text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-xs font-light mb-6">Select a digital invitation from your device.</p>
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
