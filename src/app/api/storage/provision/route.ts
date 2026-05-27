export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { provisionStudioBucket } from '@/lib/CloudService';
import { mediaService } from '@/lib/MediaService';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/storage/provision
 * 
 * Triggered when a studio owner connects their cloud account.
 * Supports both AZURE (custom storage) and GCP (system-default Google Drive).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.studioId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const studioId = session.studioId;
    const body = await req.json();
    const { provider, credentials } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Missing required field: provider' },
        { status: 400 }
      );
    }

    let bucketName: string;
    let storagePath: string;

    if (provider === 'AZURE') {
      if (!credentials) {
        return NextResponse.json({ error: 'Missing Azure credentials' }, { status: 400 });
      }

      // Provision the Azure container in the client's own account
      const azureResult = await provisionStudioBucket(studioId, credentials);
      bucketName = azureResult.bucketName;
      storagePath = azureResult.storagePath;

      // Update the studio record in the database
      await prisma.studio.update({
        where: { id: studioId },
        data: {
          storageBucketName: bucketName,
          storagePath,
          storageProvider: 'AZURE',
          cloudCredentialsRef: JSON.stringify(credentials), // Persist Azure credentials
        },
      });

    } else if (provider === 'GCP') {
      // For GCP, we use our master Google One / Google Drive Service Account
      // Ensure the studio's folder exists in the master Drive
      const folderId = await mediaService.getOrCreateStudioFolder(studioId);
      
      bucketName = credentials?.bucketName || folderId;
      storagePath = `google-drive://${folderId}`;

      // Update the studio record in the database
      await prisma.studio.update({
        where: { id: studioId },
        data: {
          storageBucketName: bucketName,
          storagePath,
          storageProvider: 'GCP',
          cloudCredentialsRef: 'system-default', // Generic reference for master SA
        },
      });

    } else {
      return NextResponse.json(
        { error: `Provider ${provider} is not supported.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      bucketName,
      storagePath,
      message: `${provider} storage provisioned successfully for studio ${studioId}.`,
    });

  } catch (error: any) {
    console.error('[/api/storage/provision] CRITICAL FAILURE:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
