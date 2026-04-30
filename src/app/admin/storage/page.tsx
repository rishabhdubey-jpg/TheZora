"use client";

import StudioNavBar from '@/components/StudioNavBar';
import { Database } from "lucide-react";

export default function StorageAdminPage() {
  
  return (
    <>
      <StudioNavBar
        studioName="TheZora"

        userEmail="owner@thezora.com"
        onLogout={() => {}}
      />
      
      <main className="container animate-fade-up" style={{ paddingTop: '2rem', minHeight: '100vh', paddingBottom: '5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
               <Database size={20} />
               <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Storage</span>
            </div>
            <h1 className="title" style={{ fontSize: '3.5rem', margin: 0 }}>Storage Management</h1>
          </div>
        </header>

        <section className="glass-card" style={{ padding: '4rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#71717a', fontSize: '1.1rem' }}>Detailed Azure storage breakdown will appear here.</p>
        </section>
      </main>
    </>
  );
}
