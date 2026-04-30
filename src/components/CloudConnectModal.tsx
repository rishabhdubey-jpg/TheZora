"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useCloudStore } from "@/lib/cloudStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  provider: "GCP" | "AWS" | "Azure";
}

export default function CloudConnectModal({ isOpen, onClose, provider }: Props) {
  const { connectGCP, connectAWS, connectAzure, isConnecting, connectionError, setConnectionError, syncProviderFromDB } =
    useCloudStore();

  // GCP form state
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [gcpClientEmail, setGcpClientEmail] = useState("");
  const [gcpPrivateKey, setGcpPrivateKey] = useState("");
  const [gcpBucketName, setGcpBucketName] = useState("");

  // AWS form state
  const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsBucketName, setAwsBucketName] = useState("");

  // Azure form state
  const [azureAccountName, setAzureAccountName] = useState("");
  const [azureAccountKey, setAzureAccountKey] = useState("");
  const [azureContainerName, setAzureContainerName] = useState("");
  const [azureSasToken, setAzureSasToken] = useState("");

  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setConnectionError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionError(null);
    try {
      if (provider === "GCP") {
        await connectGCP({
          projectId: gcpProjectId,
          clientEmail: gcpClientEmail,
          privateKey: gcpPrivateKey.replace(/\\n/g, "\n"),
          bucketName: gcpBucketName,
        });
      } else if (provider === "AWS") {
        await connectAWS({
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretKey,
          region: awsRegion,
          bucketName: awsBucketName,
        });
      } else {
        await connectAzure({
          accountName: azureAccountName,
          accountKey: azureAccountKey,
          containerName: azureContainerName,
          sasToken: azureSasToken || undefined,
        });
      }
      setSuccess(true);
      syncProviderFromDB();
      setTimeout(handleClose, 2000);
    } catch {
      // Error is already set in the store
    }
  };

  const providerMeta: Record<string, { label: string; color: string; docsUrl: string }> = {
    GCP: {
      label: "Google Cloud Storage",
      color: "#4285F4",
      docsUrl: "https://cloud.google.com/storage/docs",
    },
    AWS: {
      label: "Amazon S3",
      color: "#FF9900",
      docsUrl: "https://docs.aws.amazon.com/s3/",
    },
    Azure: {
      label: "Azure Blob Storage",
      color: "#0078D4",
      docsUrl: "https://learn.microsoft.com/azure/storage/blobs/",
    },
  };
  const meta = providerMeta[provider];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ zIndex: 2000 }}
        >
          <motion.div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: "2.5rem",
              position: "relative",
              borderColor: meta.color + "44",
              boxShadow: `0 0 40px ${meta.color}22`,
            }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  {provider === "GCP" ? <GCPLogo size={28} /> : provider === "AWS" ? <AWSLogo size={28} /> : <AzureLogo size={28} />}
                  <h2 style={{ fontSize: "1.5rem", color: "#fff", fontFamily: "var(--font-playfair)" }}>
                    Connect {meta.label}
                  </h2>
                </div>
                <p style={{ color: "#71717a", fontSize: "0.85rem" }}>
                  Your credentials are used in-session only and never stored in our servers.{" "}
                  <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: meta.color, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    Docs <ExternalLink size={11} />
                  </a>
                </p>
              </div>
              <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: "0.25rem" }}>
                <X size={20} />
              </button>
            </div>

            {/* Success State */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem" }}
              >
                <CheckCircle size={56} color="#22c55e" />
                <p style={{ color: "#22c55e", fontSize: "1.1rem", fontWeight: 600 }}>
                  {provider === "GCP" ? "GCP" : provider === "AWS" ? "AWS" : "Azure"} Connected!
                </p>
                <p style={{ color: "#71717a", fontSize: "0.85rem" }}>Your storage bucket is being provisioned…</p>
              </motion.div>
            )}

            {/* Error */}
            {connectionError && !success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", padding: "1rem", marginBottom: "1.5rem" }}>
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <p style={{ color: "#ef4444", fontSize: "0.85rem" }}>{connectionError}</p>
              </motion.div>
            )}

            {/* Form */}
            {!success && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {provider === "GCP" ? (
                  <>
                    <FormField label="GCP Project ID" value={gcpProjectId} onChange={setGcpProjectId} placeholder="my-gcp-project-123" required />
                    <FormField label="Service Account Email" value={gcpClientEmail} onChange={setGcpClientEmail} placeholder="studio@project.iam.gserviceaccount.com" type="email" required />
                    <FormField label="Private Key (JSON key format)" value={gcpPrivateKey} onChange={setGcpPrivateKey} placeholder="-----BEGIN RSA PRIVATE KEY-----\n..." multiline required />
                    <FormField label="Bucket Name (optional — auto-generated if blank)" value={gcpBucketName} onChange={setGcpBucketName} placeholder="e.g. my-studio-bucket" />
                  </>
                ) : provider === "AWS" ? (
                  <>
                    <FormField label="AWS Access Key ID" value={awsAccessKeyId} onChange={setAwsAccessKeyId} placeholder="AKIA..." required />
                    <FormField label="AWS Secret Access Key" value={awsSecretKey} onChange={setAwsSecretKey} placeholder="wJalrXUt..." type="password" required />
                    <FormField label="Region" value={awsRegion} onChange={setAwsRegion} placeholder="us-east-1" required />
                    <FormField label="S3 Bucket Name" value={awsBucketName} onChange={setAwsBucketName} placeholder="my-studio-bucket" required />
                  </>
                ) : (
                  <>
                    <FormField label="Storage Account Name" value={azureAccountName} onChange={setAzureAccountName} placeholder="mystorageaccount" required />
                    <FormField label="Account Key" value={azureAccountKey} onChange={setAzureAccountKey} placeholder="base64-encoded-key..." type="password" required />
                    <FormField label="Container Name" value={azureContainerName} onChange={setAzureContainerName} placeholder="my-studio-container" required />
                    <FormField label="SAS Token (optional)" value={azureSasToken} onChange={setAzureSasToken} placeholder="sv=2022-..." type="password" />
                  </>
                )}

                <button
                  type="submit"
                  disabled={isConnecting}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                    background: meta.color, color: "#fff", border: "none", borderRadius: "6px",
                    padding: "1rem", fontSize: "0.95rem", fontWeight: 600, cursor: isConnecting ? "not-allowed" : "pointer",
                    opacity: isConnecting ? 0.7 : 1, transition: "opacity 0.2s",
                  }}
                >
                  {isConnecting ? (
                    <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Provisioning…</>
                  ) : (
                    <>Connect & Provision Storage</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label, value, onChange, placeholder, type = "text", multiline = false, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; multiline?: boolean; required?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    width: "100%", padding: "0.85rem 1rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: "0.9rem", outline: "none",
    fontFamily: "var(--font-inter)", resize: "vertical",
    transition: "border-color 0.2s",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      <label style={{ color: "#a1a1aa", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          rows={3} style={baseStyle} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          required={required} style={baseStyle} />
      )}
    </div>
  );
}

function GCPLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 8l8.5 14.7H23.5L32 8z" fill="#EA4335" />
      <path d="M23.5 22.7H8.8L16.2 36l7.3-13.3z" fill="#FBBC05" />
      <path d="M55.2 22.7H40.5L47.8 36l7.4-13.3z" fill="#4285F4" />
      <path d="M16.2 36L8.8 49.3h30L47.8 36H16.2z" fill="#34A853" />
    </svg>
  );
}

function AWSLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 60" fill="none">
      <text x="0" y="42" fontSize="48" fontWeight="bold" fill="#FF9900" fontFamily="Arial">
        aws
      </text>
    </svg>
  );
}

function AzureLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <path d="M33.1 6H54l-20.7 61.5 21 24.5H14.2L33.1 6z" fill="#0078D4" />
      <path d="M54 6l17.5 50.8L33.3 68.9 54 6z" fill="#0050A0" />
      <path d="M71.5 56.8L82.8 92H39.3l32.2-35.2z" fill="#0078D4" />
    </svg>
  );
}
