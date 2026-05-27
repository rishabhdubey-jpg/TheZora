import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const studioId = session.studioId;

    const studio = await prisma.studio.findUnique({
      where: { id: studioId }
    });

    if (!studio) return NextResponse.json({ error: 'Studio not found' }, { status: 404 });

    const cloudConfig = {
      storageProvider: studio.storageProvider,
      storageBucketName: studio.storageBucketName,
      cloudCredentialsRef: studio.cloudCredentialsRef
    };

    return NextResponse.json({ 
      studioId,
      brandConfig: studio.brandConfig || {}, 
      cloudConfig 
    });
  } catch (error: any) {
    console.error('[/api/admin/settings] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const studioId = session.studioId;

    const body = await req.json();
    const { brandConfig, cloudConfig } = body;

    if (!brandConfig && !cloudConfig) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const updateData: any = {};

    if (brandConfig) {
      updateData.brandConfig = {
        logoUrl: brandConfig.logoUrl || '',
        primaryColor: brandConfig.primaryColor || '#d4af37'
      };
    }

    if (cloudConfig) {
      updateData.storageProvider = cloudConfig.storageProvider;
      if (cloudConfig.storageBucketName) updateData.storageBucketName = cloudConfig.storageBucketName;
      if (cloudConfig.cloudCredentialsRef) updateData.cloudCredentialsRef = cloudConfig.cloudCredentialsRef;
    }

    const updated = await prisma.studio.update({
      where: { id: studioId },
      data: updateData,
    });

    return NextResponse.json({ success: true, brandConfig: updated.brandConfig });
  } catch (error: any) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
