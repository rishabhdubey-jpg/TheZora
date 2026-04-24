"use client";

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, LayoutDashboard, Globe, AlertCircle, RefreshCw, Star, Settings, Trash2, Heart } from "lucide-react";
import StudioNavBar from '@/components/StudioNavBar';
import StorageHealthWidget from '@/components/StorageHealthWidget';
import UploadHandler from '@/components/UploadHandler';
import { useCloudStore } from '@/lib/cloudStore';
import AccessCard from '@/components/ui-overhaul/AccessCard';
import CinematicPlayer from '@/components/CinematicPlayer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster, toast } from 'sonner';

interface GalleryEvent {
  id: string; // The access code
  dbId: string; // Internal Prisma ID
  name: string;
  mediaCount: number;
  photos: { id?: string; url: string; contentType: string; isClientFavorite?: boolean }[];
  cinematicPoster?: string;
  cinematicVideoId?: string | null;
}

export default function AdminDashboard() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [masterPassword, setMasterPassword] = useState('admin123');
  
  const router = useRouter();
  const { connectedProvider } = useCloudStore();
  
  const [events, setEvents] = useState<GalleryEvent[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard'|'security'>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<'media'|'cinematic'>('media');
  const [activeEventId, setActiveEventId] = useState<string>(''); // Access Code

  const studioId = "demo-studio"; // In a real app, this would come from a session

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch(`/api/admin/events?studioId=${studioId}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        if (data.length > 0 && !activeEventId) {
          setActiveEventId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch Events Error:", err);
    } finally {
      setIsLoadingEvents(false);
      setIsLoaded(true);
    }
  }, [studioId, activeEventId]);

  // Initialization
  useEffect(() => {
    const savedPwd = localStorage.getItem('studioAdminPwd');
    if (savedPwd) setMasterPassword(savedPwd);
    fetchEvents();
  }, [fetchEvents]);

  const handleStorageDisconnect = useCallback(() => {
    setEvents([]);
    setActiveEventId('');
    setActiveMedia(null);
    localStorage.removeItem('studioEvents');
    localStorage.removeItem('antigravity_last_event');
    router.refresh();
  }, [router]);

  const [searchQuery, setSearchQuery] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [provisionedEventName, setProvisionedEventName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [activeMedia, setActiveMedia] = useState<{ url: string; contentType: string } | null>(null);
  const [proofingTab, setProofingTab] = useState<'all' | 'favorites'>('all');

  const activeEvent = events.find(e => e.id === activeEventId);
  const searchResults = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === masterPassword) setIsAdminLoggedIn(true);
    else alert("Incorrect admin password.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      alert("Password too short.");
      return;
    }
    setMasterPassword(newPassword);
    localStorage.setItem('studioAdminPwd', newPassword);
    setNewPassword('');
    alert("Security updated.");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName) return;
    
    // The server will generate the human-readable code now
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId,
          name: newEventName,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const realCode = data.id; // Server returned [ADJECTIVE]-[NOUN]-2026
        
        setProvisionedEventName(newEventName);
        setGeneratedCode(realCode);
        setNewEventName('');
        await fetchEvents();
        setActiveEventId(realCode);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteEvent = async (eventId: string, dbId: string) => {
    setIsDeleting(true);
    const toastId = toast.loading("Purging cloud artifacts...");
    
    try {
      const res = await fetch(`/api/admin/events?id=${dbId}&studioId=${studioId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success("Library permanently deleted", { id: toastId });
        await fetchEvents();
        if (activeEventId === eventId) {
          setActiveEventId('');
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to delete library", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error during deletion", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetHighlight = async (photoId: string) => {
    const activeEv = events.find(e => e.id === activeEventId);
    if (!activeEv || !photoId) return;
    try {
      const res = await fetch(`/api/admin/events/${activeEv.dbId}/highlight`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cinematicVideoId: photoId })
      });
      if (res.ok) {
        fetchEvents();
      } else {
        alert("Failed to update highlight.");
      }
    } catch (e) {
      console.error(e);
      alert("Error setting highlight.");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-zinc-500" size={48} />
      </div>
    );
  }

  if (!isAdminLoggedIn) {
     return (
       <main className="min-h-screen flex items-center justify-center bg-black p-6">
         <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 p-12 shadow-2xl">
           <div className="text-center mb-12">
              <div className="inline-flex p-4 bg-zinc-900/50 rounded-full mb-6 border border-zinc-800">
                <ShieldCheck className="text-zinc-400" size={32} />
              </div>
              <h2 className="text-4xl font-serif font-light text-white mb-2 leading-tight">Studio Admin</h2>
              <p className="text-zinc-600 text-[10px] tracking-[0.3em] uppercase">Access Terminal</p>
           </div>
           <form onSubmit={handleLogin} className="space-y-6">
             <input 
                type="password" 
                placeholder="MASTER KEY" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                className="w-full bg-black border border-zinc-900 text-white p-5 text-center tracking-[0.5em] focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-800" 
                autoFocus 
                required 
             />
             <button type="submit" className="w-full bg-white text-black p-5 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-zinc-200 transition-all">Authenticate</button>
           </form>
           <div className="text-center mt-12">
             <Link href="/" className="text-zinc-600 hover:text-white text-[10px] tracking-[0.1em] transition-all flex items-center justify-center gap-2 uppercase">
               <Globe size={14} /> Global Entry
             </Link>
           </div>
         </div>
       </main>
     );
  }

  return (
    <>
      <StudioNavBar
        studioName="TheZora"
        studioId={studioId}
        userEmail="owner@thezora.com"
        onLogout={() => setIsAdminLoggedIn(false)}
        onStorageDisconnect={handleStorageDisconnect}
      />
      
      <main className="min-h-screen bg-black text-zinc-400 font-sans selection:bg-zinc-800 selection:text-white px-6 md:px-12">
        <div className="max-w-7xl mx-auto py-16">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-8 border-b border-zinc-900 pb-12">
            <div>
              <div className="flex items-center gap-3 text-zinc-600 mb-4 uppercase tracking-[0.3em] text-[10px]">
                 <LayoutDashboard size={14} />
                 <span>Admin Control Panel</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-none -ml-1">Portal</h1>
            </div>
            <nav className="flex gap-2">
              <button 
                onClick={() => setActiveAdminTab('dashboard')} 
                className={`px-8 py-3 text-[10px] tracking-[0.2em] uppercase transition-all ${activeAdminTab === 'dashboard' ? 'bg-white text-black' : 'border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
              >
                Collection
              </button>
              <button 
                onClick={() => setActiveAdminTab('security')} 
                className={`px-8 py-3 text-[10px] tracking-[0.2em] uppercase transition-all ${activeAdminTab === 'security' ? 'bg-white text-black' : 'border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
              >
                Security
              </button>
            </nav>
          </header>

        {activeAdminTab === 'security' && (
          <section className="bg-zinc-950 border border-zinc-900 p-12 max-w-2xl mx-auto shadow-2xl animate-fade-up">
            <h2 className="text-4xl font-serif font-light text-white mb-6">Encryption Key</h2>
            <p className="text-zinc-500 mb-10 leading-relaxed text-sm">Rotate your studio's master authentication credentials. This key secures all private galleries and physical asset manifests.</p>
            <form onSubmit={handleChangePassword} className="space-y-8">
              <div className="space-y-3">
                 <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 block">New Management Key</label>
                 <input type="password" placeholder="Enter secure key" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black border border-zinc-900 text-white p-5 focus:border-zinc-700 outline-none transition-all placeholder:text-zinc-800" />
              </div>
              <button type="submit" className="w-full bg-white text-black p-5 text-[10px] tracking-[0.2em] font-bold uppercase hover:bg-zinc-200 transition-all">Synchronize Permissions</button>
            </form>
          </section>
        )}

        {activeAdminTab === 'dashboard' && (
          <div className="animate-fade-up space-y-24">
            <section className="bg-zinc-950 border border-zinc-900 p-8">
              <StorageHealthWidget studioId={studioId} plan="ENTERPRISE" />
            </section>

            {connectedProvider && (
              <>
            <section>
              <div className="flex justify-between items-end mb-10 border-b border-zinc-900 pb-6">
                <h2 className="text-3xl font-serif font-light text-white">Active Libraries</h2>
                <button 
                  onClick={() => fetchEvents()} 
                  disabled={isLoadingEvents}
                  className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-[10px] tracking-[0.2em] uppercase pb-1"
                >
                  <RefreshCw size={12} className={isLoadingEvents ? "animate-spin" : ""} /> Update Manifest
                </button>
              </div>
              
              <div className="flex gap-6 overflow-x-auto pb-10 scrollbar-hide">
                {events.length === 0 && !isLoadingEvents && (
                  <div className="w-full bg-zinc-950 border border-zinc-900 border-dashed p-20 text-center">
                    <AlertCircle size={32} className="text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-600 font-light text-sm">No active collection manifests found.</p>
                  </div>
                )}
                
                {events.map(ev => (
                  <div 
                    key={ev.id} 
                    className={`min-w-[380px] p-10 border transition-all duration-700 flex flex-col justify-between h-[340px] group ${
                      activeEventId === ev.id 
                        ? 'bg-zinc-900 border-zinc-500 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                        : 'bg-zinc-950 border-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-3xl font-serif font-light text-white group-hover:text-zinc-200 transition-colors mb-3 line-clamp-1">
                          {ev.name}
                        </h3>
                        <div className="inline-block bg-black border border-zinc-900 px-3 py-1 text-[10px] tracking-[0.2em] text-zinc-500">
                          {ev.id}
                        </div>
                      </div>
                      
                      <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-3 bg-black border border-zinc-900 text-zinc-600 hover:text-white transition-all">
                                <Settings size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-900 text-zinc-400 rounded-none w-56">
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em]">Management</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-zinc-900" />
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-red-900 focus:text-red-400 focus:bg-red-900/10 cursor-pointer text-xs">
                                  <Trash2 size={14} className="mr-3" />
                                  Purge Library
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <AlertDialogContent className="bg-zinc-950 border border-zinc-900 text-white rounded-none">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-serif text-2xl font-light">Critical Action Required</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-500 text-sm py-4">
                                This will permanently purge all high-resolution masters, biometric signatures, and cloud artifacts for <span className="text-white">"{ev.name}"</span>.
                                <br/><br/>
                                <span className="text-red-900 uppercase tracking-widest text-[10px] font-bold">Effect: Irreversible deletion.</span>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-900 rounded-none text-xs">Abort</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteEvent(ev.id, ev.dbId)}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold transition-all"
                              >
                                Confirm Purge
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <div className="space-y-6">
                      <p className="text-zinc-600 text-xs font-light tracking-wide">{ev.mediaCount} artifacts synced to node</p>
                      <button 
                        onClick={() => setActiveEventId(ev.id)} 
                        className={`w-full py-4 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${
                          activeEventId === ev.id 
                            ? 'bg-zinc-100 text-black' 
                            : 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-zinc-400 hover:text-white'
                        }`}
                      >
                        {activeEventId === ev.id ? "Connected" : "Connect"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-20">
              <div className="flex gap-12 border-b border-zinc-900 mb-12">
                <button 
                  onClick={() => setActiveSubTab('media')} 
                  className={`pb-4 text-[11px] tracking-[0.3em] uppercase transition-all relative font-bold ${
                    activeSubTab === 'media' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Unified Terminal
                  {activeSubTab === 'media' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />}
                </button>
                <button 
                  onClick={() => setActiveSubTab('cinematic')} 
                  className={`pb-4 text-[11px] tracking-[0.3em] uppercase transition-all relative font-bold ${
                    activeSubTab === 'cinematic' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Gallery Logic
                  {activeSubTab === 'cinematic' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />}
                </button>
              </div>

              {activeSubTab === 'media' && (
                 <div className="grid gap-8">
                    <div className="bg-zinc-950 border border-zinc-900 p-10">
                      <h3 className="text-2xl font-serif font-light text-white mb-4">Cloud Pipeline</h3>
                      <p className="text-zinc-500 text-sm mb-10 leading-relaxed max-w-2xl">
                        Direct-to-cloud media ingestion. Artifacts are automatically indexed and optimized for guest biometric matching.
                      </p>
                      {activeEvent ? (
                        <div className="bg-black border border-zinc-900 p-8">
                          <UploadHandler 
                            studioId={studioId} 
                            eventId={activeEvent.dbId} 
                            onUploadComplete={() => fetchEvents()} 
                          />
                        </div>
                      ) : (
                        <div className="p-16 text-center border border-zinc-900 bg-black">
                          <p className="text-zinc-700 text-xs tracking-widest uppercase italic">Select an active collection to begin ingestion.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-zinc-950 border border-zinc-900 p-10">
                      <h3 className="text-2xl font-serif font-light text-white mb-4">Provision Manifest</h3>
                      <p className="text-zinc-500 text-sm mb-10 leading-relaxed max-w-2xl">Deploy a new collection environment. The system will generate a unique biometric access node.</p>
                      <form onSubmit={handleGenerate} className="flex flex-col gap-6">
                        <input 
                          type="text" 
                          placeholder="Collection Name (e.g. Smith Wedding)" 
                          value={newEventName}
                          onChange={(e) => setNewEventName(e.target.value)}
                          className="bg-black border border-zinc-900 text-white p-5 outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-800 text-sm" 
                          required
                        />
                        <button type="submit" className="bg-white text-black py-4 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-zinc-200 transition-all">Generate Environment</button>
                      </form>

                      {generatedCode && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-12 p-10 border border-zinc-800 bg-black text-center"
                        >
                          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-bold mb-6">Environment Provisioned Successfully</p>
                          <h2 className="text-4xl md:text-5xl font-mono text-white tracking-widest mb-10 select-all">{generatedCode}</h2>
                          
                          <div className="flex justify-center border-t border-zinc-900 pt-10">
                             <AccessCard 
                               eventName={provisionedEventName || "New Event"}
                               accessCode={generatedCode}
                             />
                          </div>
                        </motion.div>
                      )}
                    </div>
                 </div>
              )}

              {activeSubTab === 'cinematic' && (
                 <div className="bg-zinc-950 border border-zinc-900 p-20 animate-fade-up">
                    <div className="text-center">
                       <AlertCircle size={40} className="text-zinc-800 mx-auto mb-6" />
                       <h3 className="text-2xl font-serif font-light text-white mb-3">Logic Maintenance</h3>
                       <p className="text-zinc-600 text-sm font-light">Global metadata definitions are currently offline for migration.</p>
                    </div>
                 </div>
              )}
            </section>

            {activeEvent && activeSubTab === 'media' && (
              <section className="pb-32">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-zinc-900 pb-10 gap-6">
                  <div>
                    <h2 className="text-4xl font-serif font-light text-white mb-4">Artifact Stream</h2>
                    <div className="flex gap-4">
                       <button 
                         onClick={() => setProofingTab('all')}
                         className={`text-[9px] tracking-[0.3em] uppercase py-2 px-4 transition-all ${proofingTab === 'all' ? 'bg-white text-black font-bold' : 'text-zinc-600 hover:text-zinc-400 border border-zinc-900'}`}
                       >
                         Full Manifest
                       </button>
                       <button 
                         onClick={() => setProofingTab('favorites')}
                         className={`text-[9px] tracking-[0.3em] uppercase py-2 px-4 transition-all flex items-center gap-2 ${proofingTab === 'favorites' ? 'bg-yellow-500 text-black font-bold' : 'text-zinc-600 hover:text-zinc-400 border border-zinc-900'}`}
                       >
                         <Heart size={10} fill={proofingTab === 'favorites' ? 'black' : 'none'} />
                         Client Favorites
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-zinc-600 text-[10px] tracking-widest uppercase italic">{activeEvent.photos.length} Synced Nodes</p>
                    {activeEvent.photos.filter(p => p.isClientFavorite).length > 0 && (
                       <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-yellow-500 text-[9px] font-bold tracking-widest uppercase animate-pulse">
                         Favorites: {activeEvent.photos.filter(p => p.isClientFavorite).length} / {activeEvent.photos.length}
                       </div>
                    )}
                  </div>
                </div>
                
                {activeEvent.photos.length === 0 ? (
                   <div className="p-24 text-center border border-zinc-900 bg-zinc-950">
                      <p className="text-zinc-800 text-xs tracking-[0.4em] uppercase">No persistent records found.</p>
                   </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {activeEvent.photos
                      .filter(p => proofingTab === 'all' || p.isClientFavorite)
                      .map((photo, index) => {
                       const isVideo = photo.contentType?.startsWith("video/") || false;
                       return (
                         <motion.div 
                            key={index} 
                            whileHover={{ scale: 0.98 }}
                            className="aspect-square bg-black border border-zinc-900 overflow-hidden relative group cursor-pointer"
                          >
                           {isVideo ? (
                             <div className="w-full h-full flex items-center justify-center" onClick={() => setActiveMedia(photo)}>
                               <video className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-all grayscale group-hover:grayscale-0" muted playsInline>
                                 <source src={photo.url} type={photo.contentType} />
                               </video>
                               <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-full">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <img 
                                src={photo.url} 
                                alt="Artifact" 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all grayscale group-hover:grayscale-0 duration-1000"
                                onClick={() => setActiveMedia(photo)}
                             />
                           )}
                           
                           <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={(e) => { e.stopPropagation(); if (photo.id) handleSetHighlight(photo.id); }}
                                className={`p-3 border backdrop-blur-xl transition-all ${
                                  activeEvent.cinematicVideoId === photo.id 
                                    ? 'bg-white border-white text-black' 
                                    : 'bg-black/50 border-zinc-800 text-white hover:bg-zinc-900'
                                }`}
                              >
                                <Star size={14} fill={activeEvent.cinematicVideoId === photo.id ? 'black' : 'none'} />
                              </button>
                           </div>

                           <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 border border-zinc-800 text-[8px] tracking-widest text-zinc-500 uppercase">
                              Node #{activeEvent.mediaCount - index}
                           </div>
                         </motion.div>
                       );
                    })}
                  </div>
                )}
              </section>
            )}
              </>
            )}
          </div>
        )}

        {activeMedia && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 md:p-12" onClick={() => setActiveMedia(null)}>
            <button 
              className="absolute top-10 right-10 w-12 h-12 flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-all font-light text-2xl z-[10001]" 
              onClick={() => setActiveMedia(null)}
            >
              ×
            </button>
            <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {activeMedia.contentType?.startsWith("video/") ? (
                <div className="w-[90vw] md:w-[70vw] lg:w-[60vw] aspect-video">
                  <CinematicPlayer 
                    src={activeMedia.url} 
                    contentType={activeMedia.contentType}
                  />
                </div>
              ) : (
                <img src={activeMedia.url} alt="Enlarged" className="max-w-full max-h-full object-contain border border-zinc-900 shadow-2xl" />
              )}
            </div>
          </div>
        )}
        </div>
      </main>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  );
}
