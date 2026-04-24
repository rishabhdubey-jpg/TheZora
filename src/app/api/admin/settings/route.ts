import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const studioId = url.searchParams.get('studioId');
    if (!studioId) return NextResponse.json({ error: 'Missing studioId' }, { status: 400 });

    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: { brandConfig: true }
    });

    return NextResponse.json({ brandConfig: studio?.brandConfig || {} });
  } catch (error: any) {
    console.error('[/api/admin/settings] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { studioId, brandConfig } = body;

    if (!studioId) {
      return NextResponse.json({ error: 'Missing studioId' }, { status: 400 });
    }

    if (!brandConfig) {
      return NextResponse.json({ error: 'Missing brandConfig payload' }, { status: 400 });
    }

    // Gracefully handle undefined or empty fields
    const safeBrandConfig = {
      logoUrl: brandConfig.logoUrl || '',
      primaryColor: brandConfig.primaryColor || '#d4af37'
    };

    const updated = await prisma.studio.update({
      where: { id: studioId },
      data: { brandConfig: safeBrandConfig },
    });

    return NextResponse.json({ success: true, brandConfig: updated.brandConfig });
  } catch (error: any) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
