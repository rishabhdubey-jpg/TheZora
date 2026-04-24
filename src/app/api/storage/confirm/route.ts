import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const body = await req.json();
    const { 
      studioId, 
      eventId, 
      gcsObjectPath, 
      filename, 
      contentType, 
      sizeBytes,
      faceDescriptors // Optional array of { descriptor: number[], boundingBox: any }
    } = body;

    if (!studioId || !eventId || !gcsObjectPath || !filename || sizeBytes == null) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
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
        await tx.faceDescriptor.createMany({
          data: faceDescriptors.map((face: any) => ({
            photoId: photo.id,
            descriptor: face.descriptor,
            boundingBox: face.boundingBox || {},
          })),
        });
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
