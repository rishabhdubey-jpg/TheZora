import { NextRequest, NextResponse } from 'next/server';
import { provisionStudioBucket } from '@/lib/CloudService';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/storage/provision
 * 
 * Triggered when a studio owner connects their GCP account.
 * Creates a dedicated GCS bucket for the studio and records the path in the DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, provider, credentials } = body;

    if (!studioId || !provider || !credentials) {
      return NextResponse.json(
        { error: 'Missing required fields: studioId, provider, credentials' },
        { status: 400 }
      );
    }

    if (provider !== 'AZURE') {
      return NextResponse.json(
        { error: 'Only AZURE provider is supported for this migration phase.' },
        { status: 501 }
      );
    }

    // Provision the Azure container
    const { bucketName, storagePath } = await provisionStudioBucket(
      studioId,
      credentials
    );

    // Update the studio record in the database
    await prisma.studio.update({
      where: { id: studioId },
      data: {
        storageBucketName: bucketName,
        storagePath,
        cloudProvider: 'AZURE',
        cloudCredentialsRef: JSON.stringify(credentials), // Persist Azure credentials
      },
    });

    return NextResponse.json({
      success: true,
      bucketName,
      storagePath,
      message: `Bucket ${bucketName} provisioned successfully.`,
    });
  } catch (error) {
    console.error('[/api/storage/provision]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
