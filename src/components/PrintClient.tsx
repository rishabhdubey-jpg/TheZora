"use client";

import QRCode from "react-qr-code";

interface PrintClientProps {
  event: {
    id: string;
    name: string;
    accessCode: string;
    studio: {
      name: string;
    };
  };
  logoUrl: string;
  appUrl: string;
}

export default function PrintClient({ event, logoUrl, appUrl }: PrintClientProps) {
  return (
    <div className="min-h-screen bg-zinc-50 p-0 sm:p-8 md:p-12 print:p-0">
      {/* Print Controls (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm print:hidden">
        <div>
          <h1 className="text-xl font-serif text-zinc-900">Table Card Generator</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Ready for Cardstock Printing</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-black text-white px-8 py-3 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-zinc-800 transition-all"
        >
          Print Now
        </button>
      </div>

      {/* The Cards Grid */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-white border-[0.5px] border-zinc-200 aspect-[5/7] flex flex-col items-center justify-between p-12 text-center relative overflow-hidden shadow-sm print:shadow-none print:border-zinc-300"
          >
            {/* Aesthetic Border Detail */}
            <div className="absolute inset-4 border border-zinc-100 pointer-events-none" />
            
            {/* Header / Logo */}
            <div className="z-10 flex flex-col items-center">
              {logoUrl ? (
                <div className="h-16 w-32 relative mb-6">
                  <img 
                    src={logoUrl} 
                    alt={event.studio.name}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <h2 className="text-2xl font-serif tracking-tighter text-zinc-900 mb-6">
                  {event.studio.name}
                </h2>
              )}
              <div className="h-[1px] w-12 bg-zinc-200 mb-6" />
            </div>

            {/* Main Content */}
            <div className="z-10 space-y-8">
              <h3 className="text-3xl font-serif font-light text-zinc-900 leading-tight">
                Capture the Magic.
              </h3>
              <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase leading-relaxed max-w-[200px] mx-auto">
                Scan to view and upload to the live gallery.
              </p>
              
              <div className="bg-white p-4 inline-block border border-zinc-100 shadow-sm mx-auto">
                <QRCode 
                  value={`${appUrl}/?code=${event.accessCode}`}
                  size={140}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>

              <div className="space-y-2">
                <p className="text-zinc-400 text-[8px] tracking-[0.3em] uppercase">Private Access Code</p>
                <p className="text-2xl font-mono tracking-[0.4em] text-zinc-900 font-bold select-all">
                  {event.accessCode}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="z-10">
              <p className="text-[9px] text-zinc-400 tracking-widest uppercase italic">
                {event.name}
              </p>
            </div>

            {/* Subtle branding for Zora */}
            <div className="absolute bottom-4 right-4 opacity-20">
               <p className="text-[6px] tracking-[0.5em] uppercase text-zinc-900">Powered by Zora</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
