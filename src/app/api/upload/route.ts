import { NextRequest, NextResponse } from 'next/server';
import { mediaService } from '@/lib/MediaService';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

/**
 * PRODUCTION-READY API Route for Studio Media Uploads.
 * Handles:
 * 1. Multi-tenant studio folder management.
 * 2. Cross-watermarking for images (Sharp) and videos (FFmpeg).
 * 3. Google Drive upload (Google One 5 TB quota).
 * 4. Database metadata persistence via Prisma.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const studioId = formData.get('studioId') as string;

    if (!file || !studioId) {
      return NextResponse.json({ error: 'Missing file or studioId' }, { status: 400 });
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const mimeType = file.type;

    // 1. Ensure studio folder exists in Google Drive
    const studioFolderId = await mediaService.getOrCreateStudioFolder(studioId);

    let finalBuffer: Buffer;
    let driveFileId: string;
    let driveUrl: string;

    if (mimeType.startsWith('image/')) {
      // 2a. Process Image Watermark
      finalBuffer = await mediaService.watermarkImage(originalBuffer);
      
      // 3a. Upload to Drive
      const uploadResult = await mediaService.uploadFile(
        finalBuffer,
        fileName,
        mimeType,
        studioFolderId
      );
      
      driveFileId = uploadResult.fileId;
      driveUrl = uploadResult.webViewLink!;
    } else if (mimeType.startsWith('video/')) {
      // 2b. Process Video Watermark (Requires temp files for FFmpeg)
      const tempId = crypto.randomUUID();
      const inputPath = path.join(os.tmpdir(), `${tempId}_input${path.extname(fileName)}`);
      const outputPath = path.join(os.tmpdir(), `${tempId}_output${path.extname(fileName)}`);

      try {
        fs.writeFileSync(inputPath, originalBuffer);
        
        await mediaService.watermarkVideo(inputPath, outputPath);
        
        const processedBuffer = fs.readFileSync(outputPath);

        // 3b. Upload to Drive
        const uploadResult = await mediaService.uploadFile(
          processedBuffer,
          fileName,
          mimeType,
          studioFolderId
        );

        driveFileId = uploadResult.fileId;
        driveUrl = uploadResult.webViewLink!;
      } finally {
        // Cleanup temp files
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    } else {
      // Direct upload for other types (no watermark)
      const uploadResult = await mediaService.uploadFile(
        originalBuffer,
        fileName,
        mimeType,
        studioFolderId
      );
      driveFileId = uploadResult.fileId;
      driveUrl = uploadResult.webViewLink!;
    }

    // 4. Persistence: Save metadata to Prisma
    const savedMedia = await prisma.media.create({
      data: {
        driveId: driveFileId,
        url: driveUrl,
        studioId: studioId,
      },
    });

    return NextResponse.json({
      success: true,
      media: savedMedia
    });

  } catch (error: any) {
    console.error('CRITICAL: Media Upload Failure:', error);
    return NextResponse.json({ 
      error: 'Failed to process and upload media',
      details: error.message 
    }, { status: 500 });
  }
}
