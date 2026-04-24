import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Next.js 16 requirements: await the params promise
  const { id: photoId } = await params;

  try {
    // 2. JSON Body Parsing: Extract explicit state from the request
    const body = await request.json();
    const { isFavorite } = body;

    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: "Missing or invalid 'isFavorite' state in payload" }, { status: 400 });
    }

    // 3. Prisma Execution: Apply the state change
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        isClientFavorite: isFavorite
      }
    });

    // 4. Cache Invalidation: Purge stale server caches for all portals
    revalidatePath("/admin", "page");
    revalidatePath("/", "page");

    // 4. Return State: Respond with the full updated record (serialize BigInt fields)
    const serializedPhoto = { 
      ...updatedPhoto, 
      sizeBytes: updatedPhoto.sizeBytes.toString() 
    };
    return NextResponse.json(serializedPhoto);

  } catch (error: any) {
    // 5. Error Handling: Detailed logging for the server console
    console.error("[Curation API] Database error toggling favorite:", error.message);
    
    // Return specific error message to the browser for debugging
    return NextResponse.json({ 
      error: error.message,
      code: error.code || "UNKNOWN_DB_ERROR"
    }, { status: 500 });
  }
}
