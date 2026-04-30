import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/events/verify
 * 
 * Verifies a client access code and returns the associated studioId.
 * Used by the public Gateway (src/app/page.tsx) to route guests.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = body.accessCode;

    if (!rawCode) {
      return NextResponse.json({ error: 'Missing access code' }, { status: 400 });
    }

    // Normalization: trim and uppercase to prevent common entry errors
    const accessCode = rawCode.trim().toUpperCase();

    const event = await prisma.event.findUnique({
      where: { accessCode },
      select: { accessCode: true, studioId: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Invalid Access Code' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      accessCode: event.accessCode,
      studioId: event.studioId 
    });
  } catch (error: any) {
    console.error('[/api/events/verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
