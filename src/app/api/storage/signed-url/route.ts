import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedReadUrl } from '@/lib/CloudService';

/**
 * GET /api/storage/signed-url
 * 
 * Generates a direct cloud signed URL (SAS for Azure, Signed URL for GCS)
 * to bypass Next.js API proxy memory bottlenecks for heavy video streams.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blobPath = searchParams.get('path');
    const studioId = searchParams.get('studioId');

    if (!blobPath || !studioId) {
      return NextResponse.json({ error: 'Missing path or studioId' }, { status: 400 });
    }

    // 1. Fetch Studio & Credentials
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { 
        storageBucketName: true, 
        cloudCredentialsRef: true, 
        storageProvider: true 
      }
    });

    if (!studio || !studio.cloudCredentialsRef || !studio.storageBucketName) {
      return NextResponse.json({ error: 'Studio storage configuration incomplete' }, { status: 404 });
    }

    let credentials: any = {};
    try {
      if (studio.cloudCredentialsRef && studio.cloudCredentialsRef !== 'system-default') {
        credentials = JSON.parse(studio.cloudCredentialsRef);
      }
    } catch (e) {
      console.error('[/api/storage/signed-url] Credentials parse error:', e);
      return NextResponse.json({ error: 'Invalid storage credentials' }, { status: 500 });
    }

    const provider = studio.storageProvider || 'AZURE';

    // Route Google Drive requests straight to our streaming proxy
    if (provider === 'GOOGLE_DRIVE' || blobPath.startsWith('google-drive://')) {
      const proxyUrl = `/api/storage/proxy?path=${encodeURIComponent(blobPath)}&studioId=${studioId}`;
      return NextResponse.json({ url: proxyUrl });
    }

    // 2. Generate Signed URL (valid for 1 hour)
    const signedUrl = await generatePresignedReadUrl(
      studio.storageProvider,
      studio.storageBucketName,
      blobPath,
      credentials,
      3600 // 1 hour expiration
    );

    return NextResponse.json({ url: signedUrl });

  } catch (error: any) {
    console.error('[/api/storage/signed-url] Error:', error.message);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
