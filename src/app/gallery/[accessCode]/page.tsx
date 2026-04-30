import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import GalleryClient from './GalleryClient';

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}) {
  const { accessCode } = await params;
  
  if (!accessCode) {
    notFound();
  }

  const normalizedCode = accessCode.trim().toUpperCase();

  const event = await prisma.event.findUnique({
    where: { accessCode: normalizedCode },
    include: {
      studio: {
        select: { name: true, brandConfig: true }
      },
      _count: {
        select: { photos: true }
      },
      photos: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          gcsObjectPath: true,
          gcsPublicUrl: true,
          contentType: true,
          isClientFavorite: true,
        }
      }
    }
  });

  if (!event) {
    notFound();
  }

  let logoUrl = event.studio.brandConfig?.logoUrl;
  if (logoUrl) {
    logoUrl = logoUrl.replace(/studioId=[^&]+/, `studioId=${event.studioId}`);
  }

  let cinematicPoster = event.cinematicPosterUrl;
  if (cinematicPoster) {
    cinematicPoster = cinematicPoster.replace('demo-studio', event.studioId);
  }

  let cinematicVideoId = event.cinematicVideoId;
  if (cinematicVideoId) {
    cinematicVideoId = cinematicVideoId.replace('demo-studio', event.studioId);
  }

  const galleryData = {
    id: event.accessCode,
    name: event.name,
    mediaCount: event._count.photos,
    photos: event.photos.map(p => {
      let finalUrl = p.gcsPublicUrl || `/api/storage/proxy?path=${encodeURIComponent(p.gcsObjectPath)}&studioId=${event.studioId}`;
      if (finalUrl.includes('studioId=')) {
        finalUrl = finalUrl.replace(/studioId=[^&]+/, `studioId=${event.studioId}`);
      }
      return {
        id: p.id,
        url: finalUrl,
        contentType: p.contentType,
        isClientFavorite: p.isClientFavorite,
      };
    }),
    cinematicPoster: cinematicPoster || undefined,
    cinematicVideoId: cinematicVideoId,
    studioId: event.studioId,
    studioName: event.studio.name,
    brandConfig: {
      ...event.studio.brandConfig,
      logoUrl
    },
  };

  return <GalleryClient initialEvent={galleryData} />;
}
