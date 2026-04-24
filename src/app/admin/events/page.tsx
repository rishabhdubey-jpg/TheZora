"use client";

import StudioNavBar from '@/components/StudioNavBar';
import { Calendar } from "lucide-react";

export default function EventsAdminPage() {
  const studioId = "demo-studio";
  
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
               <Calendar size={20} />
               <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Events</span>
            </div>
            <h1 className="title" style={{ fontSize: '3.5rem', margin: 0 }}>Event Management</h1>
          </div>
        </header>

        <section className="glass-card" style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#71717a', fontSize: '1.1rem' }}>A complete list of your studio's galleries will appear here.</p>
        </section>
      </main>
    </>
  );
}
