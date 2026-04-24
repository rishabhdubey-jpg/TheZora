import { NextRequest, NextResponse } from 'next/server';

// In a real app, this would be a database lookup
const eventMappings: Record<string, string> = {
  'demo-wedding': '/?event=demo-wedding',
  'john-jane-2026': '/?event=john-jane-2026',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const resolvedParams = await params;
  const eventId = resolvedParams.eventId;
  const destination = eventMappings[eventId];

  if (destination) {
    // Collect analytics here (e.g. logging scan, user agent, etc.)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    console.log(`[QR SCAN ANALYTICS] Event: ${eventId}, IP: ${ip}, Time: ${new Date().toISOString()}`);
    
    // Redirect to the actual gallery URL
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Fallback if event is not found
  return NextResponse.redirect(new URL('/?error=event_not_found', request.url));
}
