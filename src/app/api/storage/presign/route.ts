import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedUploadUrl } from '@/lib/CloudService';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/storage/presign
 *
 * The gatekeeper endpoint. Before issuing a presigned URL:
 *   1. Verifies the studio exists and has a connected bucket.
 *   2. HARD LIMIT CHECK: Compares (storageUsed + requestedSize) vs storageLimit.
 *      If it would exceed the limit, returns 413.
 *   3. Issues a V4 presigned upload URL scoped to the max remaining quota.
 */

export const maxDuration = 60; // Optional, just in case

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.studioId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const studioId = session.studioId;
    const body = await req.json();
    const { eventId, filename, contentType, fileSizeBytes, credentials } = body;

    if (!eventId || !filename || !contentType || fileSizeBytes == null) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, filename, contentType, fileSizeBytes' },
        { status: 400 }
      );
    }

    // Fetch studio with storage info
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        storageBucketName: true,
        storageUsed: true,
        storageLimit: true,
        storageProvider: true,
        cloudCredentialsRef: true,
      },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found.' }, { status: 404 });
    }

    // Resolve credentials: body (only if populated) > database
    let activeCredentials = credentials;
    const isBodyPopulated = credentials && (credentials.accountName || credentials.account_name);
    
    if (!isBodyPopulated && studio.cloudCredentialsRef) {
      if (studio.cloudCredentialsRef === 'system-default') {
        activeCredentials = {};
        console.log(`[/api/storage/presign] Using system-default credentials for studio: ${studioId}`);
      } else {
        try {
          activeCredentials = JSON.parse(studio.cloudCredentialsRef);
          console.log(`[/api/storage/presign] Using stored credentials from database for studio: ${studioId}`);
        } catch (e) {
          console.error('[/api/storage/presign] Failed to parse cloudCredentialsRef:', e);
          activeCredentials = {}; // Safe fallback to .env
        }
      }
    }

    // DEBUG: Log the credentials being passed (masking account key)
    if (activeCredentials) {
      const logCreds = { ...activeCredentials };
      if (logCreds.accountKey) logCreds.accountKey = '***MASKED***';
      if (logCreds.account_key) logCreds.account_key = '***MASKED***';
      if (logCreds.privateKey) logCreds.privateKey = '***MASKED***';
      if (logCreds.private_key) logCreds.private_key = '***MASKED***';
      console.log('[/api/storage/presign] Active Credentials:', logCreds);
    }

    const bucketName = studio.storageBucketName?.trim();

    if (!bucketName) {
      console.error(`[/api/storage/presign] Error: Studio ${studioId} has no bucket provisioned (found: "${studio.storageBucketName}")`);
      return NextResponse.json(
        { error: 'No storage bucket provisioned for this studio. Please connect your cloud account first.' },
        { status: 428 }
      );
    }

    console.log(`[/api/storage/presign] Target Bucket: "${bucketName}"`);

    // ── Hard limit check ──────────────────────────────────────────────────────
    // storageUsed and storageLimit are BigInt in the Prisma schema.
    const usedBytes = studio.storageUsed;
    const limitBytes = studio.storageLimit;
    const requestedBytes = BigInt(fileSizeBytes);
    const remainingQuota = limitBytes - usedBytes;

    if (remainingQuota <= 0n) {
      return NextResponse.json(
        {
          error: 'Storage quota exceeded. Please upgrade your plan or free up space.',
          storageUsed: usedBytes.toString(),
          storageLimit: limitBytes.toString(),
        },
        { status: 400 }
      );
    }

    if (requestedBytes > remainingQuota) {
      return NextResponse.json(
        {
          error: `File size (${requestedBytes.toString()} bytes) exceeds remaining storage quota (${remainingQuota.toString()} bytes).`,
          storageUsed: usedBytes.toString(),
          storageLimit: limitBytes.toString(),
          remainingQuota: remainingQuota.toString(),
        },
        { status: 400 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Build the cloud path
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const blobPath = `${eventId}/${Date.now()}_${safeFilename}`;

    const result = await generatePresignedUploadUrl(
      studio.storageProvider || 'AZURE',
      bucketName,
      blobPath,
      contentType,
      Number(remainingQuota), // Convert to number for CloudService compat (Safe up to 9PB)
      activeCredentials
    );

    return NextResponse.json({
      uploadUrl: result.uploadUrl,
      blobPath: result.blobPath,
      bucketName,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[/api/storage/presign]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
