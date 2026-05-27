import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
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
    let creds: any = {};

    // 1. Resolve Studio & Credentials
    let dbContentType = 'video/mp4'; // Safe fallback
    
    const photo = await prisma.photo.findFirst({
      where: { gcsObjectPath: blobPath },
      select: { studioId: true, contentType: true }
    });

    if (photo) {
      if (!studioId) studioId = photo.studioId;
      if (photo.contentType) dbContentType = photo.contentType;
    } else if (!studioId) {
      console.warn(`[/api/storage/proxy] Photo not indexed for path: ${blobPath}.`);
      return NextResponse.json({ error: 'Photo not indexed' }, { status: 404 });
    }

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { storageBucketName: true, cloudCredentialsRef: true, storageProvider: true }
    });

    if (!studio || !studio.cloudCredentialsRef) {
      return NextResponse.json({ error: 'Studio or credentials not found' }, { status: 404 });
    }

    try {
      if (studio.cloudCredentialsRef && studio.cloudCredentialsRef !== 'system-default') {
        creds = JSON.parse(studio.cloudCredentialsRef);
      }
      accountName = creds.accountName || creds.account_name || '';
      accountKey = creds.accountKey || creds.account_key || '';
      containerName = studio.storageBucketName || '';
    } catch (e) {
      console.error('[/api/storage/proxy] Failed to parse credentials:', e);
      return NextResponse.json({ error: 'Invalid studio credentials' }, { status: 500 });
    }

    const provider = studio.storageProvider || 'AZURE';
    
    // Intercept Google Drive requests
    if (provider === 'GOOGLE_DRIVE' || blobPath.startsWith('google-drive://')) {
      const fileId = blobPath.replace('google-drive://', '');
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      try {
        // 1. Get the raw access token directly from our OAuth client
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error("Failed to retrieve Google OAuth token");

        // 2. Prepare headers, forwarding the browser's Range request
        const rangeHeader = req.headers.get('range');
        const fetchHeaders: Record<string, string> = {
          Authorization: `Bearer ${token}`
        };
        if (rangeHeader) {
          fetchHeaders['Range'] = rangeHeader;
        }

        // 3. Use native fetch to get a pure Web Stream response
        const driveFetchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: fetchHeaders }
        );

        if (!driveFetchRes.ok) {
          throw new Error(`Google Drive API responded with ${driveFetchRes.status}`);
        }

        // 4. Construct response headers using DB fallback for strict MIME typing
        const responseHeaders = new Headers(driveFetchRes.headers);
        const contentType = dbContentType || 'video/mp4';
        
        responseHeaders.set('Content-Type', contentType);
        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

        // 5. Pipe the native Web Stream directly to Next.js
        return new NextResponse(driveFetchRes.body, {
          status: driveFetchRes.status,
          headers: responseHeaders
        });

      } catch (driveErr) {
        console.error('[/api/storage/proxy] Google Drive native fetch error:', driveErr);
        return NextResponse.json({ error: 'Failed to stream from Google Drive' }, { status: 500 });
      }
    }

    let totalLength = 0;
    let webStream: any = null;
    let contentType = 'application/octet-stream';
    const range = req.headers.get('range');
    let status = 200;
    let offset = 0;
    let count = 0;
    let end = 0;

    if (provider === 'GCP') {
      const projectId = creds.projectId || creds.project_id;
      const clientEmail = creds.clientEmail || creds.client_email;
      const privateKey = (creds.privateKey || creds.private_key || '').replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        return NextResponse.json({ error: 'Incomplete GCP configuration' }, { status: 500 });
      }

      const storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        }
      });

      const file = storage.bucket(containerName).file(blobPath);
      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json({ error: 'Blob not found in GCP' }, { status: 404 });
      }

      const [metadata] = await file.getMetadata();
      totalLength = parseInt(metadata.size, 10) || 0;
      count = totalLength;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
        
        if (!isNaN(start)) {
          offset = start;
          status = 206;
          count = end - start + 1;
        }
      } else {
        end = totalLength - 1;
      }

      const downloadStream = file.createReadStream({ start: offset, end: end });
      contentType = metadata.contentType || contentType;
      webStream = Readable.toWeb(downloadStream as any);

    } else {
      // Azure
      accountName = creds.accountName || creds.account_name;
      accountKey = creds.accountKey || creds.account_key;

      if (!accountName || !accountKey) {
        return NextResponse.json({ error: 'Incomplete Azure configuration' }, { status: 500 });
      }

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      const blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );

      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobPath);
      
      const exists = await blobClient.exists();
      if (!exists) {
        return NextResponse.json({ error: 'Blob not found in Azure' }, { status: 404 });
      }

      const properties = await blobClient.getProperties();
      totalLength = properties.contentLength || 0;
      count = totalLength;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
        
        if (!isNaN(start)) {
          offset = start;
          status = 206;
          count = end - start + 1;
        }
      } else {
        end = totalLength - 1;
      }

      const downloadResponse = await blobClient.downloadToBuffer(offset, count);
      contentType = properties.contentType || contentType;
      webStream = downloadResponse;
    }

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };

    if (status === 206) {
      headers['Content-Range'] = `bytes ${offset}-${end}/${totalLength}`;
      headers['Content-Length'] = count.toString();
    } else {
      headers['Content-Length'] = totalLength.toString();
    }

    return new NextResponse(webStream, {
      status,
      headers,
    });
  } catch (error) {
    console.error('[/api/storage/proxy]', error);
    return NextResponse.json({ error: 'Artifact retrieval failed' }, { status: 500 });
  }
}
