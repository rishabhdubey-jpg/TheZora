import { NextRequest, NextResponse } from 'next/server';
import { mediaService } from '@/lib/MediaService';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { Readable } from 'stream';

/**
 * POST /api/storage/upload/drive
 * 
 * Direct upload pass-through for Google Drive.
 * Refactored for robust FormData parsing and Stream-based uploads.
 */
export async function POST(req: NextRequest) {
  console.log('[Drive Upload] Incoming request...');

  let studioId: string | null = null;
  let file: File | null = null;

  try {
    // Robustly extract FormData
    const formData = await req.formData();
    file = formData.get('file') as File;
    studioId = formData.get('studioId') as string;

    if (!file) throw new Error('No file object found in FormData');
    if (!studioId) throw new Error('No studioId found in FormData');

    console.log(`[Drive Upload] Successfully extracted file: ${file.name} (${file.size} bytes) for studio: ${studioId}`);
  } catch (err: any) {
    console.error('[Drive Upload] 400 Bad Request - FormData Parsing Failed:', err.message);
    return NextResponse.json({ 
      error: 'Invalid multipart/form-data payload', 
      details: err.message 
    }, { status: 400 });
  }

  try {
    // 1. Authentication Check
    const session = await getSession();
    if (!session || !session.studioId) {
      console.warn('[Drive Upload] 401 Unauthorized - No active session');
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    // 2. Fetch studio configuration
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { storageBucketName: true }
    });

    if (!studio || !studio.storageBucketName) {
      console.error(`[Drive Upload] 404 Not Found - Studio ${studioId} not provisioned`);
      return NextResponse.json({ error: 'Studio not provisioned for Google Drive' }, { status: 404 });
    }

    // 3. Convert File to Stream
    // We first get the arrayBuffer, then Buffer, then convert to a Node.js Readable stream
    // This is the most stable way to pass file data to the googleapis drive client
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    console.log(`[Drive Upload] Starting Drive API transfer for ${file.name}...`);

    // 4. Execute Upload via MediaService
    // MediaService handles the drive.files.create call and permissions
    const result = await mediaService.uploadFile(
      stream,
      file.name,
      file.type,
      studio.storageBucketName // The provisioned Folder ID
    );

    console.log(`[Drive Upload] Success! File ID: ${result.fileId}`);

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      gcsObjectPath: `google-drive://${result.fileId}`, // Consistent path identifier
    });

  } catch (error: any) {
    console.error('[Drive Upload] 500 Internal Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error during Drive upload' 
    }, { status: 500 });
  }
}
