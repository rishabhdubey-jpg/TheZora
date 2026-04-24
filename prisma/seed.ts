import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Seeding database with adapter-pg...');

  try {
    // 1. Create Demo Studio
    const studio = await prisma.studio.upsert({
      where: { id: 'demo-studio' },
      update: {},
      create: {
        id: 'demo-studio',
        name: 'Studio Aurora',
        email: 'owner@studioaurora.com',
        storageLimit: BigInt(10 * 1024 * 1024 * 1024), // 10GB
        storageUsed: BigInt(0),
      },
    });

    console.log(`✅ Studio created: ${studio.name}`);

    // 2. Create sample event for demo (Cleaned up for schema alignment)
    const event = await prisma.event.upsert({
      where: { id: 'WED-2026' },
      update: {},
      create: {
        id: 'WED-2026',
        accessCode: 'WED-2026',
        name: 'John & Jane Wedding',
        studioId: studio.id,
      },
    });

    console.log(`✅ Sample Event created: ${event.name} (${event.id})`);
    console.log('✨ Seeding complete.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
