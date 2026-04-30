import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const studioId = url.searchParams.get('studioId');
    const slug = url.searchParams.get('slug');

    const studio = await prisma.studio.findFirst({
      where: {
        OR: [
          { id: studioId || 'demo-studio' },
          { slug: slug || undefined }
        ]
      },
      select: { id: true, name: true, brandConfig: true }
    });

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      name: studio.name, 
      brandConfig: studio.brandConfig || {} 
    });
  } catch (error: any) {
    console.error('[/api/studio/public-config] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch public config' }, { status: 500 });
  }
}
