import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/storage/usage?studioId=xxx
 *
 * Returns the current storage usage and limit for a studio.
 */
export async function GET(req: NextRequest) {
  const studioId = req.nextUrl.searchParams.get('studioId');

  if (!studioId) {
    return NextResponse.json({ error: 'Missing studioId parameter.' }, { status: 400 });
  }

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      storageUsed: true,
      storageLimit: true,
      plan: true,
      autoArchiveColdStorage: true,
    },
  });

  if (!studio) {
    return NextResponse.json({ error: 'Studio not found.' }, { status: 404 });
  }

  return NextResponse.json({
    storageUsed: studio.storageUsed.toString(),
    storageLimit: studio.storageLimit.toString(),
    plan: studio.plan,
    autoArchiveColdStorage: studio.autoArchiveColdStorage,
  });
}

/**
 * PATCH /api/storage/usage
 *
 * Toggles the auto-archive cold storage setting for a studio.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { studioId, autoArchiveColdStorage } = await req.json();

    if (!studioId || typeof autoArchiveColdStorage !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing studioId or autoArchiveColdStorage (boolean) field.' },
        { status: 400 }
      );
    }

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { plan: true },
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found.' }, { status: 404 });
    }

    if (studio.plan === 'FREE' && autoArchiveColdStorage) {
      return NextResponse.json(
        { error: 'Auto-Archive is a Pro plan feature. Please upgrade to enable this.' },
        { status: 403 }
      );
    }

    await prisma.studio.update({
      where: { id: studioId },
      data: { autoArchiveColdStorage },
    });

    return NextResponse.json({ success: true, autoArchiveColdStorage });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
