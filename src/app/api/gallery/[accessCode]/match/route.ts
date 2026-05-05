import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accessCode: string }> }
) {
  try {
    const { accessCode } = await params;
    const { descriptor } = await req.json();

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json({ error: 'Valid descriptor required' }, { status: 400 });
    }

    // Convert the descriptor array to a string format pgvector understands: '[v1,v2,v3...]'
    const vectorString = `[${descriptor.join(',')}]`;

    let matches: any[] = [];
    try {
      // High-performance matching using pgvector's Euclidean distance operator (<->)
      // We join FaceDescriptor with Photo and Event to filter by the specific gallery
      // Explicitly cast the string parameter to ::vector to satisfy pgvector
      matches = await prisma.$queryRaw`
        SELECT DISTINCT ON (p.id)
          p.id, 
          p."gcsObjectPath", 
          p."gcsPublicUrl", 
          p."contentType", 
          p."isClientFavorite",
          (fd.descriptor <-> ${vectorString}::vector) as distance
        FROM face_descriptors fd
        JOIN photos p ON fd."photoId" = p.id
        JOIN events e ON p."eventId" = e.id
        WHERE e."accessCode" = ${accessCode}
        ORDER BY p.id, distance ASC
      `;
    } catch (queryError) {
      console.error("Vector Query Error:", queryError);
      throw queryError;
    }

    // Sort by distance, filter for "Goldilocks" matches (< 0.58 threshold), and limit to top 100 for the final response
    const sortedMatches = matches
      .filter(p => p.distance < 0.58)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 100)
      .map(p => ({
        id: p.id,
        url: p.gcsPublicUrl || `/api/storage/proxy?path=${encodeURIComponent(p.gcsObjectPath)}`,
        contentType: p.contentType,
        isClientFavorite: p.isClientFavorite,
      }));

    return NextResponse.json({ photos: sortedMatches });
  } catch (error: any) {
    console.error('[Biometric Match] Global Error:', error);
    return NextResponse.json({ error: 'Neural matching failed' }, { status: 500 });
  }
}
