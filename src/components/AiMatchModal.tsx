"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, Sparkles, Loader2, AlertCircle } from "lucide-react";

interface Props {
  onClose: () => void;
  onMatchSuccess: (descriptor: Float32Array) => void;
}

export default function AiMatchModal({ onClose, onMatchSuccess }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [faceapi, setFaceapi] = useState<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    // 10 Second Safety Timeout
    const timeout = setTimeout(() => {
      if (!modelsLoaded && !cancelled) {
        console.error('[AiMatchModal] Initialization timeout exceeded (10s)');
        setHasError(true);
        setStatusText('Calibration stalled. Please refresh.');
      }
    }, 10000);

    const load = async () => {
      try {
        setStatusText('Calibrating AI...');
        const fa = await import('@vladmandic/face-api');
        
        // TF Backend Hardening
        const tf = fa.tf as any;
        try {
          console.log('[AiMatchModal] Initializing Neural Engine: Attempting WebGL acceleration...');
          await tf.setBackend('webgl');
        } catch (e) {
          console.warn('[AiMatchModal] WebGL acceleration unavailable, falling back to CPU engine:', e);
          await tf.setBackend('cpu');
        }
        
        // Await TF readiness and confirm backend
        await tf.ready();
        console.log(`[AiMatchModal] Neural Engine Active. Backend: ${tf.getBackend().toUpperCase()}`);

        // Fast-track with TinyFaceDetector (~200KB vs ~5MB)
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri('/models'),
          fa.nets.faceLandmark68Net.loadFromUri('/models'),
          fa.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        if (!cancelled) {
          clearTimeout(timeout);
          setFaceapi(fa);
          setModelsLoaded(true);
          setStatusText('');
          console.log('[AiMatchModal] Neural networks synchronized.');
        }
      } catch (e) {
        console.error('[AiMatchModal] Critical initialization error:', e);
        if (!cancelled) {
          clearTimeout(timeout);
          setHasError(true);
          setStatusText('Fatal: Neural match failed to link.');
        }
      }
    };
    load();
    return () => { 
      cancelled = true; 
      clearTimeout(timeout);
    };
  }, [modelsLoaded]);

  const capture = useCallback(() => {
    if (!modelsLoaded || !faceapi) return;
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setImageSrc(screenshot);
      runDetection(screenshot);
    }
  }, [modelsLoaded, faceapi]);

  const runDetection = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setStatusText('Isolating Facial Signatures...');
    try {
      const img = new window.Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image failed to render'));
      });

      // Use TinyFaceDetectorOptions for sub-second analysis
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      const detection = await faceapi
        .detectSingleFace(img, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert('Biometric isolation failed. Ensure clear facial visibility.');
        setImageSrc(null);
        setIsAnalyzing(false);
        setStatusText('');
        return;
      }

      setStatusText(`Neural signatures verified.`);
      await new Promise(r => setTimeout(r, 800));
      onMatchSuccess(detection.descriptor);
    } catch (err) {
      console.error('[AiMatchModal] Detection crash:', err);
      alert('Neural processing interrupted. Please initiate again.');
      setImageSrc(null);
      setIsAnalyzing(false);
      setStatusText('');
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white rounded-none p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-serif font-light text-center tracking-tight">Neural Match</DialogTitle>
            <DialogDescription className="text-zinc-600 text-center text-[9px] tracking-[0.3em] uppercase mt-3">
              Biometric synchronization active
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
             {!imageSrc ? (
               <div className="space-y-8">
                 <div className="aspect-square bg-black border border-zinc-900 overflow-hidden relative group">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user', width: 480, height: 480 }}
                      className="w-full h-full object-cover grayscale transition-all duration-700 opacity-60 group-hover:opacity-90 group-hover:grayscale-0"
                    />
                    {/* Scanner Lines overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-500/5 to-transparent pointer-events-none animate-scan" />
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-700" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-700" />
                 </div>
                 
                 <div className="space-y-5">
                    <p className="text-zinc-500 text-center text-[11px] leading-relaxed px-4 font-light">
                      Position your face within the optic frame. Our AI will filter this collection to isolate only the moments you appear in.
                    </p>
                    
                    <Button 
                      onClick={capture} 
                      disabled={!modelsLoaded || hasError}
                      className={`w-full h-14 rounded-none text-[10px] tracking-[0.2em] uppercase transition-all duration-500 border ${
                        hasError 
                          ? 'bg-zinc-950 border-red-900 text-red-700' 
                          : 'bg-white text-black hover:bg-zinc-200 border-transparent'
                      }`}
                    >
                      {modelsLoaded ? (
                        <>
                          <Camera className="w-3.5 h-3.5 mr-2" />
                          Initiate Scan
                        </>
                      ) : hasError ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 mr-2" />
                          Initialization Failed - Check Console
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Calibrating AI
                        </>
                      )}
                    </Button>
                 </div>
               </div>
             ) : (
               <div className="space-y-8">
                  <div className="aspect-square bg-black border border-zinc-900 overflow-hidden relative">
                    <img
                      src={imageSrc}
                      alt="Neural Input"
                      className={`w-full h-full object-cover transition-all duration-1000 ${isAnalyzing ? 'opacity-20 grayscale scale-110 blur-xl' : ''}`}
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                        <Loader2 className="w-12 h-12 text-zinc-400 animate-spin stroke-[1]" />
                        <div className="flex flex-col items-center gap-2">
                           <span className="text-[9px] tracking-[0.4em] uppercase text-zinc-400 animate-pulse">{statusText}</span>
                           <div className="w-24 h-[1px] bg-zinc-900 overflow-hidden">
                              <div className="w-full h-full bg-zinc-500 animate-progress" />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isAnalyzing && (
                     <Button 
                      variant="outline"
                      onClick={() => setImageSrc(null)}
                      className="w-full h-14 border-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-950 rounded-none text-[10px] tracking-[0.2em] uppercase transition-all"
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                      Re-calibrate
                    </Button>
                  )}
               </div>
             )}
          </div>
        </div>
        
        {/* Aesthetic footer detail */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-30" />
      </DialogContent>
    </Dialog>
  );
}
