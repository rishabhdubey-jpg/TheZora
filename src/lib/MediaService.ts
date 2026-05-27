import { google } from 'googleapis';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

/**
 * MediaService handles media processing (watermarking) and 
 * Google Drive integration for studio uploads.
 */
export class MediaService {
  private drive;
  private rootFolderId: string;

  constructor() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    // Explicitly set credentials
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Force the client to refresh the token immediately on initialization
    oauth2Client.refreshAccessToken().catch((err) => {
      console.error("Failed to refresh token during init:", err);
    });

    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim().replace(/^"|"$/g, '');
  }

  /**
   * Checks if a folder named after the studioId exists within the Root Folder; 
   * if not, creates it.
   */
  async getOrCreateStudioFolder(studioId: string): Promise<string> {
    try {
      const response = await this.drive.files.list({
        q: `name = '${studioId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
      });

      const folders = response.data.files;
      if (folders && folders.length > 0) {
        return folders[0].id!;
      }

      // Create new folder
      const folderMetadata = {
        name: studioId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.rootFolderId],
      };

      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });

      return folder.data.id!;
    } catch (error) {
      console.error('Error in getOrCreateStudioFolder:', error);
      throw error;
    }
  }

  /**
   * Applies a diagonal "Cross Watermark" to an image buffer.
   */
  async watermarkImage(buffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 1920;
      const height = metadata.height || 1080;

      // Generate SVG overlay with two diagonal lines
      const svgOverlay = `
        <svg width="${width}" height="${height}">
          <style>
            .line { stroke: white; stroke-opacity: 0.3; stroke-width: ${Math.max(2, Math.floor(width / 200))}; }
          </style>
          <line x1="0" y1="0" x2="${width}" y2="${height}" class="line" />
          <line x1="0" y1="${height}" x2="${width}" y2="0" class="line" />
        </svg>
      `;

      return await sharp(buffer)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .toBuffer();
    } catch (error) {
      console.error('Error in watermarkImage:', error);
      throw error;
    }
  }

  /**
   * Applies a diagonal "Cross Watermark" to a video using FFmpeg.
   */
  async watermarkVideo(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters([
          'drawline=x0=0:y0=0:x1=W:y1=H:color=white@0.3',
          'drawline=x0=0:y0=H:x1=W:y1=0:color=white@0.3'
        ])
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('Error in watermarkVideo:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Uploads a file to a specific Google Drive folder and sets public permissions.
   */
  async uploadFile(fileSource: Buffer | Readable, fileName: string, mimeType: string, studioFolderId: string) {
    try {
      const requestBody = {
        name: fileName,
        parents: [studioFolderId],
      };

      const media = {
        mimeType: mimeType,
        body: fileSource instanceof Buffer ? Readable.from(fileSource) : fileSource,
      };

      const file = await this.drive.files.create({
        requestBody: requestBody,
        media: media,
        fields: 'id, webViewLink',
      });

      const fileId = file.data.id!;

      // Set permission to anyone with reader role
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return {
        fileId: fileId,
        webViewLink: file.data.webViewLink,
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  }
}

export const mediaService = new MediaService();
