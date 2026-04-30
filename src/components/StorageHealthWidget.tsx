"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Archive, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useCloudStore } from "@/lib/cloudStore";

interface Props {
  studioId: string;
  plan?: "FREE" | "PRO" | "ENTERPRISE";
}

export default function StorageHealthWidget({ studioId, plan = "FREE" }: Props) {
  const { storageUsedBytes, storageLimitBytes, refreshStorageUsage } = useCloudStore();
  const [autoArchive, setAutoArchive] = useState(false);
  const [isTogglingArchive, setIsTogglingArchive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Only fetch once studioId is available to avoid undefined requests
    if (!studioId) return;
    refreshStorageUsage();
  }, [studioId, refreshStorageUsage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshStorageUsage();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAutoArchiveToggle = async () => {
    if (plan === "FREE") {
      alert("Auto-Archive is a Pro plan feature. Upgrade to unlock this.");
      return;
    }
    setIsTogglingArchive(true);
    try {
      const res = await fetch("/api/storage/usage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId, autoArchiveColdStorage: !autoArchive }),
      });
      if (res.ok) setAutoArchive(!autoArchive);
    } catch (err) {
      console.error("Failed to toggle auto-archive:", err);
    }
    setIsTogglingArchive(false);
  };

  const usedGB = storageUsedBytes / 1024 / 1024 / 1024;
  const limitGB = storageLimitBytes / 1024 / 1024 / 1024;
  const percent = Math.min((storageUsedBytes / storageLimitBytes) * 100, 100);
  const isCritical = percent >= 90;
  const isWarning = percent >= 75 && percent < 90;

  const barColor = isCritical
    ? "#ef4444"
    : isWarning
    ? "#f59e0b"
    : "#22c55e";

  const barGradient = isCritical
    ? "linear-gradient(90deg, #ef4444, #dc2626)"
    : isWarning
    ? "linear-gradient(90deg, #f59e0b, #d97706)"
    : "linear-gradient(90deg, #22c55e, #16a34a)";

  return (
    <div className="glass-card" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: `${barColor}22`, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <HardDrive size={20} color={barColor} />
          </div>
          <div>
            <h3 style={{ color: "#fff", fontSize: "1rem", fontWeight: 600 }}>Storage Health</h3>
            <p style={{ color: "#71717a", fontSize: "0.78rem" }}>
              {plan} Plan
              {plan !== "FREE" && (
                <span style={{ marginLeft: "0.5rem", color: "#d4af37", fontSize: "0.72rem", background: "rgba(212,175,55,0.15)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                  PRO
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          title="Refresh usage"
          style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: "0.4rem" }}
        >
          <RefreshCw size={16} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {/* Usage numbers */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-inter)" }}>
            {usedGB < 0.1 
              ? `${(storageUsedBytes / 1024 / 1024).toFixed(1)} MB` 
              : `${usedGB.toFixed(2)} GB`}
          </span>
          <span style={{ color: "#71717a", fontSize: "1rem" }}> / {limitGB.toFixed(0)} GB used</span>
        </div>
        <span style={{ color: barColor, fontWeight: 700, fontSize: "1.1rem" }}>
          {Math.round(percent)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ height: "10px", background: "rgba(255,255,255,0.07)", borderRadius: "999px", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: "999px", background: barGradient }}
        />
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1rem", borderRadius: "8px", background: `${barColor}11`, border: `1px solid ${barColor}33` }}>
        {isCritical ? (
          <AlertTriangle size={14} color={barColor} />
        ) : (
          <CheckCircle size={14} color={barColor} />
        )}
        <span style={{ color: barColor, fontSize: "0.82rem", fontWeight: 500 }}>
          {isCritical
            ? "Storage almost full! Please upgrade or delete old events."
            : isWarning
            ? `Running low — ${(limitGB - usedGB).toFixed(1)} GB remaining.`
            : `Healthy — ${(limitGB - usedGB).toFixed(1)} GB remaining.`}
        </span>
      </div>

      {/* Auto-Archive Toggle (Pro only) */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 1.25rem", borderRadius: "10px",
          background: plan === "FREE" ? "rgba(255,255,255,0.02)" : "rgba(212,175,55,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          opacity: plan === "FREE" ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Archive size={18} color={plan === "PRO" || plan === "ENTERPRISE" ? "#d4af37" : "#52525b"} />
          <div>
            <p style={{ color: "#e4e4e7", fontSize: "0.9rem", fontWeight: 500 }}>Auto-Archive to Cold Storage</p>
            <p style={{ color: "#71717a", fontSize: "0.78rem", marginTop: "0.15rem" }}>
              Events older than 12 months move to Nearline (cheaper).{" "}
              {plan === "FREE" && <span style={{ color: "#d4af37" }}>Pro+</span>}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          onClick={handleAutoArchiveToggle}
          disabled={isTogglingArchive || plan === "FREE"}
          title={plan === "FREE" ? "Requires Pro plan" : "Toggle auto-archive"}
          style={{
            width: "48px", height: "26px", borderRadius: "999px", border: "none",
            background: autoArchive ? "#d4af37" : "rgba(255,255,255,0.1)",
            cursor: plan === "FREE" ? "not-allowed" : "pointer",
            position: "relative", transition: "background 0.3s", flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ x: autoArchive ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "absolute", top: "3px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#fff",
            }}
          />
        </button>
      </div>

      {/* Upgrade CTA for free tier */}
      {plan === "FREE" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            padding: "0.9rem 1.25rem", borderRadius: "8px",
            background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))",
            border: "1px solid rgba(212,175,55,0.25)", textAlign: "center",
          }}>
          <p style={{ color: "#d4af37", fontSize: "0.85rem", fontWeight: 500 }}>
            Upgrade to Pro for 100 GB, Auto-Archive &amp; Priority Support →
          </p>
        </motion.div>
      )}
    </div>
  );
}
