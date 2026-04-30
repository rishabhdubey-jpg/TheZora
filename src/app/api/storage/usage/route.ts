import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/storage/usage
 *
 * Returns the current storage usage and limit for the authenticated studio.
 * Resolves studioId from the JWT session cookie — no query param required.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const studioId = session.studioId;

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
