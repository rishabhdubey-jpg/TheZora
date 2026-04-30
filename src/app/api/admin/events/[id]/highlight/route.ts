import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/admin/events/[id]/highlight
 *
 * Updates the cinematicVideoId for a specific event.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // [id] represents the Event model's accessCode or internal id, based on standard. Our schema uses id and accessCode. Assume [id] is the event's dbId as per earlier Admin convention. Wait, let's verify what `id` is passed.
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await req.json();
    const { cinematicVideoId } = body;

    if (!id || cinematicVideoId === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // Verify the event belongs to the authenticated studio
    const eventCheck = await prisma.event.findUnique({
      where: { id },
      select: { studioId: true }
    });
    
    if (!eventCheck || eventCheck.studioId !== session.studioId) {
      return NextResponse.json({ error: 'Unauthorized or not found' }, { status: 403 });
    }

    // Update the event's cinematicVideoId
    const event = await prisma.event.update({
      where: { id },
      data: { cinematicVideoId },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('[/api/admin/events/[id]/highlight] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update highlight', details: error.message },
      { status: 500 }
    );
  }
}
