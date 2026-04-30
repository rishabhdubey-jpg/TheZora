"use client";
import { useEffect, useState } from 'react';

export const useFaceRecognition = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [faceapi, setFaceapi] = useState<any>(null);

  useEffect(() => {
    // This only runs in the browser
    const loadAI = async () => {
      setStatus('loading');
      try {
        // 1. Dynamically import the library
        const faceapiModule = await import('@vladmandic/face-api');
        setFaceapi(faceapiModule);

        // 2. Load models from the public folder
        const MODEL_URL = '/models';
        await Promise.all([
          faceapiModule.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        setStatus('ready');
      } catch (err) {
        console.error("AI Initialization failed:", err);
        setStatus('error');
      }
    };

    loadAI();
  }, []);

  const detectSingleFace = async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    if (!faceapi || status !== 'ready') return;

    const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };
    faceapi.matchDimensions(canvasElement, displaySize);

    const task = async () => {
      const detection = await faceapi.detectSingleFace(
        videoElement, 
        new faceapi.SsdMobilenetv1Options()
      ).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        const resized = faceapi.resizeResults(detection, displaySize);
        const ctx = canvasElement.getContext('2d');
        ctx?.clearRect(0, 0, displaySize.width, displaySize.height);
        
        // Custom draw styling for your "Premium" look
        faceapi.draw.drawDetections(canvasElement, resized);
        faceapi.draw.drawFaceLandmarks(canvasElement, resized);
      }
      setTimeout(() => {
        requestAnimationFrame(task);
      }, 200);
    };

    task();
  };

  return { status, detectSingleFace };
};