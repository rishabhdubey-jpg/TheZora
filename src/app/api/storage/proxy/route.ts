import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { prisma } from '@/lib/prisma';
import { Readable } from 'stream';

/**
 * GET /api/storage/proxy
 * 
 * Securely streams a private Azure blob to the browser.
 * Resolves credentials dynamically from the database based on the path.
 * Supports Range requests (HTTP 206) for video streaming.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const blobPath = searchParams.get('path');
    const overrideStudioId = searchParams.get('studioId');

    if (!blobPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    let studioId = overrideStudioId;
    let containerName = '';
    let accountName = '';
    let accountKey = '';

    // 1. Resolve Studio & Credentials
    if (!studioId) {
      const photo = await prisma.photo.findFirst({
        where: { gcsObjectPath: blobPath },
        select: { studioId: true }
      });

      if (!photo) {
        console.warn(`[/api/storage/proxy] Photo not indexed for path: ${blobPath}.`);
        return NextResponse.json({ error: 'Photo not indexed' }, { status: 404 });
      }
      studioId = photo.studioId;
    }

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { storageBucketName: true, cloudCredentialsRef: true }
    });

    if (!studio || !studio.cloudCredentialsRef) {
      return NextResponse.json({ error: 'Studio or credentials not found' }, { status: 404 });
    }

    try {
      const creds = JSON.parse(studio.cloudCredentialsRef);
      accountName = creds.accountName || creds.account_name;
      accountKey = creds.accountKey || creds.account_key;
      containerName = studio.storageBucketName || '';
    } catch (e) {
      console.error('[/api/storage/proxy] Failed to parse credentials:', e);
      return NextResponse.json({ error: 'Invalid studio credentials' }, { status: 500 });
    }

    if (!accountName || !accountKey || !containerName) {
      return NextResponse.json({ error: 'Incomplete storage configuration' }, { status: 500 });
    }

    // 2. Stream from Azure
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobPath);
    
    // Check if blob exists
    const exists = await blobClient.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Blob not found in Azure' }, { status: 404 });
    }

    // 3. Handle Range Requests (HTTP 206)
    const range = req.headers.get('range');
    const properties = await blobClient.getProperties();
    const totalLength = properties.contentLength || 0;

    let status = 200;
    let offset = 0;
    let count = totalLength;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      
      if (!isNaN(start)) {
        offset = start;
        status = 206;
        count = end - start + 1;
      }
    }

    const downloadResponse = await blobClient.download(offset, count);
    
    const headers: Record<string, string> = {
      'Content-Type': downloadResponse.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    };

    if (status === 206) {
      const end = offset + (downloadResponse.contentLength || 0) - 1;
      headers['Content-Range'] = `bytes ${offset}-${end}/${totalLength}`;
      headers['Content-Length'] = (downloadResponse.contentLength || 0).toString();
    } else {
      headers['Content-Length'] = totalLength.toString();
    }
    
    // Explicitly convert Node.js stream to Web ReadableStream for Next.js App Router
    const webStream = downloadResponse.readableStreamBody 
      ? Readable.toWeb(downloadResponse.readableStreamBody as any) 
      : null;

    return new NextResponse(webStream as any, {
      status,
      headers,
    });
  } catch (error) {
    console.error('[/api/storage/proxy]', error);
    return NextResponse.json({ error: 'Artifact retrieval failed' }, { status: 500 });
  }
}
