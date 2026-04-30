import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/storage/confirm
 *
 * Called by the client AFTER a successful direct upload to GCS.
 * Atomically:
 * 1. Creates the Photo DB record.
 * 2. Increments studio storage_used.
 * 3. Saves Face Descriptors (if provided) for instant AI indexing.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.studioId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    const studioId = session.studioId;
    const body = await req.json();
    const { 
      eventId, 
      gcsObjectPath, 
      filename, 
      contentType, 
      sizeBytes,
      faceDescriptors // Optional array of { descriptor: number[], boundingBox: any }
    } = body;

    if (!eventId || !gcsObjectPath || !filename || sizeBytes == null) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, gcsObjectPath, filename, sizeBytes' },
        { status: 400 }
      );
    }

    const uploadedBytes = BigInt(sizeBytes);

    // Atomic transaction: create photo + increment storage_used + save faces
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the photo
      const photo = await tx.photo.create({
        data: {
          eventId,
          studioId,
          gcsObjectPath,
          filename,
          contentType: contentType || 'application/octet-stream',
          sizeBytes: uploadedBytes,
        },
      });

      // 2. Increment studio storage usage
      await tx.studio.update({
        where: { id: studioId },
        data: {
          storageUsed: {
            increment: uploadedBytes,
          },
        },
      });

      // 3. Save face descriptors if they exist
      if (faceDescriptors && Array.isArray(faceDescriptors) && faceDescriptors.length > 0) {
        for (const face of faceDescriptors) {
          const vectorString = `[${face.descriptor.join(',')}]`;
          const id = `fd_${Math.random().toString(36).substring(2, 15)}`; // Simple unique ID
          await tx.$executeRawUnsafe(
            `INSERT INTO "face_descriptors" ("id", "photoId", "descriptor", "boundingBox", "createdAt") 
             VALUES ($1, $2, $3::vector, $4, NOW())`,
            id,
            photo.id,
            vectorString,
            JSON.stringify(face.boundingBox || {})
          );
        }
      }

      return photo;
    });

    return NextResponse.json({
      success: true,
      photoId: result.id,
      faceCount: (faceDescriptors?.length || 0),
      message: `Photo indexed with ${faceDescriptors?.length || 0} faces. Storage usage updated (+${sizeBytes} bytes).`,
    });
  } catch (error) {
    console.error('[/api/storage/confirm]', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
