"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  CheckCircle2,
  XCircle,
  Loader2,
  FileVideo,
  FileImage,
  X,
  Search,
} from "lucide-react";
import { useCloudStore } from "@/lib/cloudStore";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "uploading" | "done" | "error";
  progress: number;
  errorMessage?: string;
  gcsObjectPath?: string;
  faceCount?: number;
}

interface Props {
  studioId: string;
  eventId: string;
  onUploadComplete?: (files: { gcsObjectPath: string; filename: string; sizeBytes: number }[]) => void;
}

export default function UploadHandler({ studioId, eventId, onUploadComplete }: Props) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    gcpProjectId, gcpClientEmail, gcpPrivateKey, 
    azureAccountName, azureAccountKey,
    connectedProvider 
  } = useCloudStore();

  // Load Face-API models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapiModule = await import("@vladmandic/face-api");
        const MODEL_URL = "/models";
        
        // Ensure models are only loaded once
        await Promise.all([
          faceapiModule.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setFaceapi(faceapiModule);
        setModelsLoaded(true);
        console.log("✅ [FaceAPI] Models loaded successfully");
      } catch (err) {
        console.error("❌ [FaceAPI] Model loading failed:", err);
      }
    };
    loadModels();
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    addFiles(droppedFiles);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  /**
   * Scans a local file for faces using face-api.js
   */
  const scanFileForFaces = async (file: File) => {
    if (!faceapi || !modelsLoaded || !file.type.startsWith("image/")) return [];

    return new Promise<any[]>(async (resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      img.onload = async () => {
        try {
          const detections = await faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceDescriptors();

          const results = detections.map((d: any) => ({
            descriptor: Array.from(d.descriptor),
            boundingBox: {
              x: d.detection.box.x,
              y: d.detection.box.y,
              width: d.detection.box.width,
              height: d.detection.box.height,
            },
          }));

          URL.revokeObjectURL(url);
          resolve(results);
        } catch (err) {
          console.error("Face detection error:", err);
          URL.revokeObjectURL(url);
          resolve([]);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve([]);
      };
    });
  };

  const uploadSingle = async (uploadFile: UploadFile): Promise<void> => {
    const updateFile = (patch: Partial<UploadFile>) =>
      setFiles((prev) => prev.map((f) => (f.id === uploadFile.id ? { ...f, ...patch } : f)));

    updateFile({ status: "uploading", progress: 0 });

    try {
      // Step 1 — Get presigned (or SAS) URL
      const presignRes = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId,
          eventId,
          filename: uploadFile.file.name,
          contentType: uploadFile.file.type,
          fileSizeBytes: uploadFile.file.size,
          credentials: connectedProvider === "Azure" 
            ? { accountName: azureAccountName, accountKey: azureAccountKey }
            : { projectId: gcpProjectId, clientEmail: gcpClientEmail, privateKey: gcpPrivateKey },
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Could not get upload URL.");
      }

      const { uploadUrl, gcsObjectPath, blobPath: azureBlobPath } = await presignRes.json();
      const storagePath = azureBlobPath || gcsObjectPath; // Azure uses blobPath, GCS uses gcsObjectPath

      // Step 2 — Direct PUT to Cloud Storage (GCS or Azure)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", uploadFile.file.type);
        
        // Azure specific headers
        if (connectedProvider === "Azure") {
          xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
          xhr.setRequestHeader("x-ms-blob-content-type", uploadFile.file.type);
        }

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateFile({ progress });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(uploadFile.file);
      });

      // Step 2.5 — Immediate Face Scan
      let faceDescriptors: any[] = [];
      if (uploadFile.file.type.startsWith("image/")) {
        updateFile({ status: "processing", progress: 100 });
        faceDescriptors = await scanFileForFaces(uploadFile.file);
        updateFile({ faceCount: faceDescriptors.length });
      }

      // Step 3 — Confirm upload to backend
      await fetch("/api/storage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId,
          eventId,
          gcsObjectPath: storagePath, // We reuse the same DB field name for now
          filename: uploadFile.file.name,
          contentType: uploadFile.file.type,
          sizeBytes: uploadFile.file.size,
          faceDescriptors,
        }),
      });

      updateFile({ status: "done", gcsObjectPath: storagePath });
    } catch (error) {
      updateFile({ status: "error", errorMessage: (error as Error).message });
      throw error;
    }
  };

  const handleUploadAll = async () => {
    if (!connectedProvider) {
      alert("Please connect a cloud storage provider first.");
      return;
    }
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (!pendingFiles.length) return;

    setIsUploading(true);

    for (const file of pendingFiles) {
      try {
        await uploadSingle(file);
      } catch {
        // Errors handled in uploadSingle
      }
    }

    setIsUploading(false);

    const completed = files
      .filter((f) => f.status === "done" && f.gcsObjectPath)
      .map((f) => ({
        gcsObjectPath: f.gcsObjectPath!,
        filename: f.file.name,
        sizeBytes: f.file.size,
      }));
    onUploadComplete?.(completed);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Drop Zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        animate={{ borderColor: isDragging ? "var(--accent)" : "rgba(255,255,255,0.1)", scale: isDragging ? 1.01 : 1 }}
        transition={{ duration: 0.2 }}
        style={{
          border: "2px dashed rgba(255,255,255,0.1)",
          borderRadius: "12px",
          padding: "3rem 2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          cursor: "pointer",
          background: isDragging ? "rgba(212,175,55,0.05)" : "rgba(255,255,255,0.02)",
          transition: "background 0.2s",
        }}
      >
        <UploadCloud size={40} color={isDragging ? "var(--accent)" : "#525252"} />
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#fff", fontWeight: 500, marginBottom: "0.25rem" }}>
            Drag &amp; drop photos/videos here
          </p>
          <p style={{ color: "#71717a", fontSize: "0.85rem" }}>
            {modelsLoaded ? "AI Core Ready — Search within seconds" : "Initializing AI…"}
          </p>
        </div>
        <input
          type="file"
          multiple
          accept="image/*,video/mp4,video/quicktime"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
          }}
        />
      </motion.div>

      {/* File List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {files.map((f) => (
          <motion.div
            key={f.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: "1rem",
              padding: "0.9rem 1.2rem",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${f.status === "error" ? "rgba(239,68,68,0.3)" : f.status === "done" ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "8px",
            }}
          >
            {f.file.type.startsWith("video/") ? (
              <FileVideo size={20} color="#a1a1aa" style={{ flexShrink: 0 }} />
            ) : (
              <FileImage size={20} color="#a1a1aa" style={{ flexShrink: 0 }} />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "#e4e4e7", fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.file.name}
                  <span style={{ color: "#71717a", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                    ({formatBytes(f.file.size)})
                  </span>
                </p>
                {f.faceCount !== undefined && (
                  <span style={{ fontSize: "0.7rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(212,175,55,0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                    <Search size={10} /> {f.faceCount} face{f.faceCount !== 1 ? 's' : ''} indexed
                  </span>
                )}
              </div>
              {(f.status === "uploading" || f.status === "processing") && (
                <div style={{ marginTop: "0.5rem", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: f.status === "processing" ? "100%" : `${f.progress}%` }}
                    transition={{ duration: 0.3 }}
                    style={{ height: "100%", background: f.status === "processing" ? "var(--accent)" : "linear-gradient(90deg, #d4af37, #f5d17a)", borderRadius: "2px" }}
                  />
                </div>
              )}
            </div>

            {f.status === "uploading" && <Loader2 size={18} color="var(--accent)" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />}
            {f.status === "processing" && <Search size={18} color="var(--accent)" style={{ animation: "pulse 1.5s infinite", flexShrink: 0 }} />}
            {f.status === "done" && <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />}
            {f.status === "error" && <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />}
            {f.status === "pending" && (
              <button onClick={() => removeFile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", flexShrink: 0 }}>
                <X size={16} />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Action Bar */}
      {files.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "#71717a", fontSize: "0.85rem" }}>
            {doneCount > 0 && <span style={{ color: "#22c55e" }}>{doneCount} uploaded </span>}
            {errorCount > 0 && <span style={{ color: "#ef4444" }}>{errorCount} failed </span>}
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => setFiles([])}
              disabled={isUploading}
              className="btn-outline"
              style={{ padding: "0.65rem 1.2rem", margin: 0, fontSize: "0.85rem", opacity: isUploading ? 0.5 : 1 }}
            >
              Clear All
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || pendingCount === 0 || !modelsLoaded}
              className="btn-primary"
              style={{ padding: "0.65rem 1.5rem", margin: 0, fontSize: "0.85rem", opacity: (isUploading || pendingCount === 0 || !modelsLoaded) ? 0.6 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {isUploading ? (
                <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Working…</>
              ) : (
                <><UploadCloud size={16} /> Upload {pendingCount > 0 ? `${pendingCount} File${pendingCount > 1 ? "s" : ""}` : "All"}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
