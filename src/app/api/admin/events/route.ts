import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateUniqueAccessCode } from '@/lib/code-generator';

/**
 * GET /api/admin/events
 * 
 * Fetches all events for a studio, including photo summaries.
 * used by the Admin Dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get('studioId');

    if (!studioId) {
      return NextResponse.json({ error: 'Missing studioId' }, { status: 400 });
    }

    const events = await prisma.event.findMany({
      where: { studioId },
      include: {
        _count: {
          select: { photos: true }
        },
        photos: {
          orderBy: { uploadedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            gcsObjectPath: true,
            filename: true,
            gcsPublicUrl: true,
            sizeBytes: true,
            contentType: true,
            isClientFavorite: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to a cleaner format for the frontend
    const results = events.map(e => ({
      id: e.accessCode, // Using accessCode as display ID
      dbId: e.id,
      name: e.name,
      mediaCount: e._count.photos,
      cinematicVideoId: e.cinematicVideoId,
      cinematicPoster: e.cinematicPosterUrl,
      photos: e.photos.map(p => ({
        id: p.id,
        url: p.gcsPublicUrl || `/api/storage/proxy?path=${encodeURIComponent(p.gcsObjectPath)}&studioId=${e.studioId}`,
        contentType: p.contentType,
        isClientFavorite: p.isClientFavorite,
      }))
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[/api/admin/events] GET Error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    if (error.code === 'P1010') {
      return NextResponse.json({ 
        error: 'Database Access Denied', 
        details: 'The whitelisted IP may not have CONNECT permissions or the DB name is incorrect.' 
      }, { status: 403 });
    }

    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/events
 * 
 * Creates a new event for a studio.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, name } = body;
    let { accessCode } = body;

    if (!studioId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Force unique human-readable code generation on backend
    accessCode = await generateUniqueAccessCode(prisma);

    const event = await prisma.event.create({
      data: {
        studioId,
        name,
        accessCode,
      }
    });

    return NextResponse.json({
      success: true,
      id: event.accessCode,
      dbId: event.id
    });
  } catch (error: any) {
    console.error('[/api/admin/events] POST Error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/events
 * 
 * Permanently deletes an event, its associated photos, face data, 
 * and physical artifacts in Azure Storage.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id'); // Internal dbId
    const studioId = searchParams.get('studioId');

    if (!id || !studioId) {
      return NextResponse.json({ error: 'Missing required parameters (id, studioId)' }, { status: 400 });
    }

    // 1. Fetch event and its photos to get GCS paths and sizes
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        photos: {
          select: { gcsObjectPath: true, sizeBytes: true }
        },
        studio: {
          select: { storageBucketName: true, cloudCredentialsRef: true }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.studioId !== studioId) {
      return NextResponse.json({ error: 'Unauthorized: Studio mismatch' }, { status: 403 });
    }

    // 2. Setup CloudService credentials
    let credentials = null;
    if (event.studio.cloudCredentialsRef) {
      try {
        credentials = JSON.parse(event.studio.cloudCredentialsRef);
      } catch (e) {
        console.error('[DELETE Event] Failed to parse credentials:', e);
      }
    }

    const bucketName = event.studio.storageBucketName;

    // 3. Purge physical artifacts from Azure (Loop with individual try-catch)
    let deletedBytes = 0n;
    if (bucketName && credentials) {
      const { deleteStorageObject } = await import('@/lib/CloudService');
      
      for (const photo of event.photos) {
        try {
          await deleteStorageObject(bucketName, photo.gcsObjectPath, credentials);
          deletedBytes += photo.sizeBytes;
        } catch (err) {
          // Log and continue as per user request to ensure DB cleanup eventually happens
          console.error(`[DELETE Event] Failed to delete blob: ${photo.gcsObjectPath}`, err);
        }
      }
    }

    // 4. Update Studio Quota
    await prisma.studio.update({
      where: { id: studioId },
      data: {
        storageUsed: {
          decrement: deletedBytes
        }
      }
    });

    // 5. Delete from Prisma (Cascades to Photo and FaceDescriptor)
    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Library and artifacts purged successfully.',
      freedBytes: deletedBytes.toString()
    });
  } catch (error: any) {
    console.error('[/api/admin/events] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
