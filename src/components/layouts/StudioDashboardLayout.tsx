"use client";

import React from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  Settings, 
  PieChart, 
  LogOut,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioDashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'My Events', href: '/admin/events', icon: Camera },
  { name: 'Media Library', href: '/admin/storage', icon: ImageIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: PieChart },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function StudioDashboardLayout({ children }: StudioDashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 flex flex-col">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-white font-serif text-2xl tracking-tighter uppercase font-medium">
              <span className="font-light opacity-50">The</span>
              <span className="font-bold">Zora</span>
            </span>
          </Link>
          <p className="text-[10px] text-zinc-600 tracking-widest uppercase mt-2">Studio Portal</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-none text-xs tracking-widest uppercase transition-all duration-300",
                "text-zinc-500 hover:text-white hover:bg-zinc-900 group"
              )}
            >
              <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-zinc-900">
          <button 
            className="flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 transition-colors text-xs tracking-widest uppercase w-full"
            onClick={() => {
                // Implement logout logic here
                window.location.href = '/';
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-950/50">
        <div className="max-w-6xl mx-auto p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
