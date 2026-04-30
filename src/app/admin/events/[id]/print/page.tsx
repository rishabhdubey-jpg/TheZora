import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintClient from "@/components/PrintClient";

export const dynamic = 'force-dynamic';

export default async function PrintTableCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  // 1. Fetch Event and Studio Data
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      studio: {
        select: {
          name: true,
          brandConfig: true,
        },
      },
    },
  });

  if (!event) return notFound();

  const brandConfig = event.studio.brandConfig as any;
  const logoUrl = brandConfig?.logoUrl || "";
  
  // Prepare data for client component
  const eventData = {
    id: event.id,
    name: event.name,
    accessCode: event.accessCode,
    studio: {
      name: event.studio.name
    }
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <PrintClient 
      event={eventData} 
      logoUrl={logoUrl} 
      appUrl={appUrl} 
    />
  );
}
