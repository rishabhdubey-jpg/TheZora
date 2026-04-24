import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/events/verify
 * 
 * Verifies a client access code and returns the associated event metadata.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawCode = searchParams.get('code');

    if (!rawCode) {
      return NextResponse.json({ error: 'Missing access code' }, { status: 400 });
    }

    // Normalization: trim and uppercase to prevent common entry errors
    const accessCode = rawCode.trim().toUpperCase();

    const event = await prisma.event.findUnique({
      where: { accessCode },
      include: {
        studio: {
          select: { name: true, brandConfig: true }
        },
        _count: {
          select: { photos: true }
        },
        photos: {
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            gcsObjectPath: true,
            gcsPublicUrl: true,
            contentType: true,
            isClientFavorite: true,
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Invalid Access Code' }, { status: 404 });
    }

    // Map to the format expected by the frontend GalleryEvent interface
    const result = {
      id: event.accessCode,
      name: event.name,
      mediaCount: event._count.photos,
      photos: event.photos.map(p => ({
        id: p.id,
        url: p.gcsPublicUrl || `/api/storage/proxy?path=${encodeURIComponent(p.gcsObjectPath)}&studioId=${event.studioId}`,
        contentType: p.contentType,
        isClientFavorite: p.isClientFavorite,
      })),
      cinematicPoster: event.cinematicPosterUrl,
      cinematicVideoId: event.cinematicVideoId,
      studioName: event.studio.name,
      brandConfig: event.studio.brandConfig || null,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[/api/events/verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
