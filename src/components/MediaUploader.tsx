"use client";

import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

/**
 * MediaUploader Component
 * Handles file selection, watermarking (via API), and Google Drive upload.
 */
export default function MediaUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ url: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Temporary hardcoded studioId as per requirements
      formData.append('studioId', 'test-studio-123');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResult({
        url: data.media.url,
        id: data.media.driveId,
      });
      setFile(null); // Clear file after success
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Upload Studio Media</h2>
          <p className="text-sm text-zinc-400">
            Files will be watermarked and saved to Google Drive automatically.
          </p>
        </div>

        {/* Upload Zone */}
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 transition-colors ${
            file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            accept="image/*,video/*"
          />
          <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
            {file ? (
              <>
                <CheckCircle className="w-10 h-10 text-indigo-400" />
                <span className="text-sm font-medium text-zinc-200 truncate max-w-xs">
                  {file.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-300">
                  Click or drag to select media
                </span>
                <span className="text-xs text-zinc-500">
                  Supports Images and Videos
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all ${
            !file || isUploading
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing Media...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Start Upload</span>
            </>
          )}
        </button>

        {/* Feedback Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-2 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {uploadResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              <span>Upload Successful!</span>
            </div>
            <p className="text-xs text-zinc-400">
              Your media has been processed, watermarked, and saved to your studio folder.
            </p>
            <a
              href={uploadResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <span>View watermarked file on Drive</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
