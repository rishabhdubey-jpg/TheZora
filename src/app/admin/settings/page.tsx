"use client";

import { useState, useRef, useEffect } from 'react';
import StudioNavBar from '@/components/StudioNavBar';
import { Settings, UploadCloud, Loader2, Save } from "lucide-react";
import { useCloudStore } from '@/lib/cloudStore';

export default function SettingsAdminPage() {
  const studioId = "demo-studio"; // In production, derived from session
  const { gcpProjectId, gcpClientEmail, gcpPrivateKey, azureAccountName, azureAccountKey, connectedProvider } = useCloudStore();

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#d4af37'); // Default gold
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/admin/settings?studioId=${studioId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.brandConfig) {
            setLogoUrl(data.brandConfig.logoUrl || '');
            setPrimaryColor(data.brandConfig.primaryColor || '#d4af37');
          }
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [studioId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!connectedProvider) {
      alert("Please connect a storage provider in the Dashboard first.");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const credentials = connectedProvider === "Azure" 
        ? { accountName: azureAccountName, accountKey: azureAccountKey }
        : { projectId: gcpProjectId, clientEmail: gcpClientEmail, privateKey: gcpPrivateKey };

      // 1. Get presigned URL
      const presignRes = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId,
          eventId: "brand", // Use fixed path for branding assets
          filename: file.name,
          contentType: file.type,
          fileSizeBytes: file.size,
          credentials
        })
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error || "Could not get upload URL.");
      }

      const { uploadUrl, gcsObjectPath, blobPath: azureBlobPath } = await presignRes.json();
      
      // 2. Upload file
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);
        if (connectedProvider === "Azure") {
          xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
          xhr.setRequestHeader("x-ms-blob-content-type", file.type);
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      // 3. Set logo URL (No need to confirm since it's not a gallery photo)
      const storagePath = azureBlobPath || gcsObjectPath;
      setLogoUrl(`/api/storage/proxy?path=${encodeURIComponent(storagePath)}&studioId=${studioId}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload logo.");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studioId,
          brandConfig: { logoUrl, primaryColor }
        })
      });

      if (!res.ok) throw new Error("Failed to save settings");
      alert("Settings saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <StudioNavBar
        studioName="TheZora"
        studioId={studioId}
        userEmail="owner@thezora.com"
        onLogout={() => {}}
      />
      
      <main className="container animate-fade-up" style={{ paddingTop: '2rem', minHeight: '100vh', paddingBottom: '5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
               <Settings size={20} />
               <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Brand & Settings</span>
            </div>
            <h1 className="title" style={{ fontSize: '3.5rem', margin: 0 }}>Studio Preferences</h1>
          </div>
          <button 
            onClick={handleSaveSettings} 
            disabled={isSaving || isLoading}
            className="btn-primary" 
            style={{ margin: 0, padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Settings
          </button>
        </header>

        {isLoading ? (
          <div style={{ padding: '5rem', display: 'flex', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={32} color="var(--accent)" />
          </div>
        ) : (
          <section className="glass-card" style={{ padding: '3.5rem', maxWidth: '800px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2.5rem', color: '#fff', fontFamily: 'var(--font-playfair)' }}>Brand Identity</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {/* Logo Upload */}
              <div>
                <label style={{ color: '#a1a1aa', display: 'block', marginBottom: '1rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Studio Logo
                </label>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: '120px', height: '120px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {isUploadingLogo ? (
                      <Loader2 className="animate-spin" color="var(--accent)" />
                    ) : logoUrl ? (
                      <img src={logoUrl} alt="Studio Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#52525b', fontSize: '0.8rem' }}>No Logo</span>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      style={{ display: 'none' }} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={isUploadingLogo}
                      className="btn-outline" 
                      style={{ margin: 0, padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                    >
                      <UploadCloud size={16} /> Upload New Logo
                    </button>
                    <p style={{ color: '#71717a', fontSize: '0.8rem', marginTop: '0.75rem' }}>Upload a transparent PNG or SVG for best results.</p>
                  </div>
                </div>
              </div>

              {/* Primary Brand Color */}
              <div>
                <label style={{ color: '#a1a1aa', display: 'block', marginBottom: '1rem', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Primary Brand Color
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    style={{ 
                      width: '50px', height: '50px', padding: '0', border: 'none', borderRadius: '8px', 
                      background: 'none', cursor: 'pointer', overflow: 'hidden' 
                    }} 
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="login-input" 
                    style={{ textAlign: 'left', padding: '0.8rem 1rem', width: '150px', letterSpacing: '0.1em' }} 
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
