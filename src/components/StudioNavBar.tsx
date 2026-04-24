"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  HardDrive,
  ChevronDown,
  User,
  Menu,
  X,
  CheckCircle,
  AlertTriangle,
  Cloud,
  Unplug,
  Settings,
  LogOut,
} from "lucide-react";
import { useCloudStore } from "@/lib/cloudStore";
import CloudConnectModal from "./CloudConnectModal";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
];

interface Props {
  studioName?: string;
  studioId?: string;
  userEmail?: string;
  onLogout?: () => void;
  onStorageDisconnect?: () => void;
}

export default function StudioNavBar({
  studioName = "TheZora",
  studioId = "demo-studio",
  userEmail = "owner@thezora.com",
  onLogout,
  onStorageDisconnect,
}: Props) {
  const pathname = usePathname();
  const { connectedProvider, storageUsedBytes, storageLimitBytes, disconnect, setStudioId } =
    useCloudStore();

  const [cloudDropdownOpen, setCloudDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCloudOpen, setMobileCloudOpen] = useState(false);
  const [cloudModal, setCloudModal] = useState<"GCP" | "AWS" | "Azure" | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const cloudRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStudioId(studioId);
  }, [studioId, setStudioId]);

  // Scroll detection for navbar shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cloudRef.current && !cloudRef.current.contains(e.target as Node)) setCloudDropdownOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const storagePercent = Math.min((storageUsedBytes / storageLimitBytes) * 100, 100);
  const isStorageFull = storagePercent >= 95;
  const isStorageWarning = storagePercent >= 75 && !isStorageFull;

  return (
    <>
      {/* ── Navbar ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: scrolled
            ? "rgba(5,5,5,0.88)"
            : "rgba(5,5,5,0.65)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.04)",
          boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
          transition: "all 0.35s ease",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            padding: "0 2rem",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
          }}
        >
          {/* ── LEFT: Logo ── */}
          <Link href="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #d4af37, #9a7c20)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "#000", fontSize: "0.9rem", fontWeight: 800 }}>Z</span>
            </div>
            <span style={{ fontFamily: "var(--font-playfair)", fontSize: "1.2rem", color: "#fff", fontWeight: 600 }}>
              {studioName}
            </span>
          </Link>

          {/* ── CENTER: Nav Links (desktop) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }} className="nav-desktop">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname?.startsWith(href));
              return (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: "0.45rem",
                      padding: "0.5rem 0.9rem", borderRadius: "8px",
                      color: isActive ? "#d4af37" : "#a1a1aa",
                      background: isActive ? "rgba(212,175,55,0.12)" : "transparent",
                      fontSize: "0.875rem", fontWeight: isActive ? 600 : 400,
                      transition: "all 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
                  >
                    <Icon size={15} />
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── RIGHT: Cloud Integration + User ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }} className="nav-desktop">
            {/* Storage mini-bar */}
            {connectedProvider && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.75rem", borderRadius: "999px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {isStorageFull ? (
                  <AlertTriangle size={12} color="#ef4444" />
                ) : (
                  <HardDrive size={12} color={isStorageWarning ? "#f59e0b" : "#22c55e"} />
                )}
                <div style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${storagePercent}%`, borderRadius: "2px", background: isStorageFull ? "#ef4444" : isStorageWarning ? "#f59e0b" : "#22c55e", transition: "width 0.5s ease" }} />
                </div>
                {isStorageFull && (
                  <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 700, animation: "pulse 2s infinite" }}>FULL</span>
                )}
              </div>
            )}

            {/* Cloud Dropdown */}
            <div ref={cloudRef} style={{ position: "relative" }}>
              <button
                onClick={() => setCloudDropdownOpen((p) => !p)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 1rem", borderRadius: "8px",
                  background: connectedProvider ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                  border: connectedProvider ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  color: connectedProvider ? "#22c55e" : "#a1a1aa",
                  fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {connectedProvider ? (
                  <CheckCircle size={14} />
                ) : (
                  <Cloud size={14} />
                )}
                {connectedProvider ? `${connectedProvider} Connected` : "Connect Storage"}
                <ChevronDown size={14} style={{ transition: "transform 0.2s", transform: cloudDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              <AnimatePresence>
                {cloudDropdownOpen && (
                  <CloudDropdown
                    connectedProvider={connectedProvider}
                    onConnect={(p) => { setCloudModal(p); setCloudDropdownOpen(false); }}
                    onDisconnect={() => { 
                      disconnect(); 
                      setCloudDropdownOpen(false);
                      if (onStorageDisconnect) onStorageDisconnect(); 
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* User dropdown */}
            <div ref={userRef} style={{ position: "relative" }}>
              <button
                onClick={() => setUserDropdownOpen((p) => !p)}
                style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.15))",
                  border: "1px solid rgba(212,175,55,0.3)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <User size={16} color="#d4af37" />
              </button>
              <AnimatePresence>
                {userDropdownOpen && (
                  <UserDropdown email={userEmail} onLogout={onLogout} onClose={() => setUserDropdownOpen(false)} />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Hamburger (mobile) ── */}
          <button
            className="nav-mobile"
            onClick={() => setMobileMenuOpen((p) => !p)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: "0.5rem" }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div style={{ padding: "1rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} style={{ textDecoration: "none" }} onClick={() => setMobileMenuOpen(false)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "8px", color: pathname === href ? "#d4af37" : "#e4e4e7", background: pathname === href ? "rgba(212,175,55,0.1)" : "transparent", fontSize: "0.95rem" }}>
                      <Icon size={18} />
                      {label}
                    </div>
                  </Link>
                ))}

                {/* Mobile — Settings sub-menu with Cloud options */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
                  <button
                    onClick={() => setMobileCloudOpen((p) => !p)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#a1a1aa", fontSize: "0.9rem", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Settings size={16} />
                      Storage Settings
                    </div>
                    <ChevronDown size={14} style={{ transform: mobileCloudOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>

                  <AnimatePresence>
                    {mobileCloudOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: "hidden", marginTop: "0.5rem", padding: "0 0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}
                      >
                        {connectedProvider ? (
                          <button
                            onClick={() => { 
                              disconnect(); 
                              setMobileMenuOpen(false);
                              if (onStorageDisconnect) onStorageDisconnect(); 
                            }}
                            style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: "0.875rem", cursor: "pointer" }}
                          >
                            <Unplug size={15} />
                            Disconnect {connectedProvider}
                          </button>
                        ) : (
                          <>
                            <ProviderButton provider="GCP" onClick={() => { setCloudModal("GCP"); setMobileMenuOpen(false); }} />
                            <ProviderButton provider="AWS" onClick={() => { setCloudModal("AWS"); setMobileMenuOpen(false); }} />
                            <ProviderButton provider="Azure" onClick={() => { setCloudModal("Azure"); setMobileMenuOpen(false); }} />
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile user info + logout */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(255,255,255,0.02)", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <User size={16} color="#d4af37" />
                    <span style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>{userEmail}</span>
                  </div>
                  {onLogout && (
                    <button onClick={onLogout} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer" }}>
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Spacer to push page content below fixed navbar */}
      <div style={{ height: "64px" }} />

      {/* Cloud Connect Modal */}
      {cloudModal && (
        <CloudConnectModal
          isOpen={!!cloudModal}
          provider={cloudModal as "GCP" | "AWS" | "Azure"}
          onClose={() => setCloudModal(null)}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .nav-desktop { display: flex; }
        .nav-mobile { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
      `}</style>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CloudDropdown({
  connectedProvider,
  onConnect,
  onDisconnect,
}: {
  connectedProvider: string | null;
  onConnect: (p: "GCP" | "AWS" | "Azure") => void;
  onDisconnect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        width: "300px",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "#71717a", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Cloud Storage Provider
        </p>
      </div>
      <div style={{ padding: "0.75rem" }}>
        {connectedProvider ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 0.75rem", marginBottom: "0.5rem", borderRadius: "8px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle size={14} color="#22c55e" />
              <span style={{ color: "#22c55e", fontSize: "0.875rem", fontWeight: 600 }}>
                {connectedProvider} Connected
              </span>
            </div>
            <button
              onClick={onDisconnect}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.65rem 0.75rem", borderRadius: "8px", background: "none",
                border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444",
                fontSize: "0.85rem", cursor: "pointer", transition: "background 0.2s",
              }}
            >
              <Unplug size={14} />
              Disconnect
            </button>
          </>
        ) : (
          <>
            <ProviderButton provider="GCP" onClick={() => onConnect("GCP")} />
            <div style={{ height: "0.5rem" }} />
            <ProviderButton provider="AWS" onClick={() => onConnect("AWS")} />
            <div style={{ height: "0.5rem" }} />
            <ProviderButton provider="Azure" onClick={() => onConnect("Azure")} />
          </>
        )}
      </div>
      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ color: "#52525b", fontSize: "0.75rem" }}>
          Your credentials are never stored on our servers.
        </p>
      </div>
    </motion.div>
  );
}

function UserDropdown({
  email,
  onLogout,
  onClose,
}: {
  email: string;
  onLogout?: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        width: "220px",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "#d4af37", fontSize: "0.9rem", fontWeight: 600 }}>Studio Owner</p>
        <p style={{ color: "#71717a", fontSize: "0.78rem", marginTop: "0.2rem", wordBreak: "break-all" }}>{email}</p>
      </div>
      <div style={{ padding: "0.5rem" }}>
        <Link href="/admin/settings" style={{ textDecoration: "none" }} onClick={onClose}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.75rem", borderRadius: "6px", color: "#a1a1aa", fontSize: "0.875rem", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}>
            <Settings size={14} />
            Settings
          </div>
        </Link>
        {onLogout && (
          <button
            onClick={onLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.65rem 0.75rem", borderRadius: "6px", color: "#ef4444", background: "none", border: "none", fontSize: "0.875rem", cursor: "pointer" }}
          >
            <LogOut size={14} />
            Logout
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ProviderButton({ provider, onClick }: { provider: "GCP" | "AWS" | "Azure"; onClick: () => void }) {
  const meta: Record<string, { label: string; bg: string; border: string; color: string; logo: React.ReactNode }> = {
    GCP: {
      label: "Sign in with Google Cloud",
      bg: "rgba(66,133,244,0.08)",
      border: "rgba(66,133,244,0.25)",
      color: "#4285F4",
      logo: (
        <svg width={18} height={18} viewBox="0 0 64 64" fill="none">
          <path d="M32 8l8.5 14.7H23.5L32 8z" fill="#EA4335" />
          <path d="M23.5 22.7H8.8L16.2 36l7.3-13.3z" fill="#FBBC05" />
          <path d="M55.2 22.7H40.5L47.8 36l7.4-13.3z" fill="#4285F4" />
          <path d="M16.2 36L8.8 49.3h30L47.8 36H16.2z" fill="#34A853" />
        </svg>
      ),
    },
    AWS: {
      label: "Sign in with Amazon AWS",
      bg: "rgba(255,153,0,0.08)",
      border: "rgba(255,153,0,0.25)",
      color: "#FF9900",
      logo: (
        <svg width={22} height={14} viewBox="0 0 100 60" fill="none">
          <text x="0" y="48" fontSize="56" fontWeight="bold" fill="#FF9900" fontFamily="Arial">aws</text>
        </svg>
      ),
    },
    Azure: {
      label: "Sign in with Microsoft Azure",
      bg: "rgba(0,120,212,0.08)",
      border: "rgba(0,120,212,0.25)",
      color: "#0078D4",
      logo: (
        <svg width={18} height={18} viewBox="0 0 96 96" fill="none">
          <path d="M33.1 6H54l-20.7 61.5 21 24.5H14.2L33.1 6z" fill="#0078D4" />
          <path d="M54 6l17.5 50.8L33.3 68.9 54 6z" fill="#0050A0" />
          <path d="M71.5 56.8L82.8 92H39.3l32.2-35.2z" fill="#0078D4" />
        </svg>
      ),
    },
  };
  const m = meta[provider];

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.75rem 1rem", borderRadius: "9px",
        background: m.bg, border: `1px solid ${m.border}`,
        color: m.color, fontWeight: 600, fontSize: "0.875rem",
        cursor: "pointer", transition: "all 0.2s", textAlign: "left",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = "none"; }}
    >
      {m.logo}
      {m.label}
    </button>
  );
}
