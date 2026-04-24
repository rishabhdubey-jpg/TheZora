import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Prevent multiple Prisma and Pool instances in development (HMR leaks)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

const createPool = () => {
  const isGCP = connectionString?.includes('34.131.211.217');
  
  return new Pool({ 
    connectionString,
    connectionTimeoutMillis: 10000, 
    idleTimeoutMillis: 30000,     
    max: 10,
    // If it's GCP, try to use SSL but allow failure if not required
    // Many GCP instances require SSL unless 'Allow unencrypted connections' is on.
    ssl: isGCP ? { rejectUnauthorized: false } : false
  });
};

let pool: Pool;
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  console.log('[/lib/prisma] Initializing production Prisma instance');
  pool = createPool();
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Singleton the Pool
  if (!globalForPrisma.pool) {
    const obscuredUrl = connectionString?.replace(/:[^:]+@/, ':****@');
    console.log(`[/lib/prisma] [HMR] Initializing new PG Pool. Target: ${obscuredUrl}`);
    globalForPrisma.pool = createPool();
    
    globalForPrisma.pool.on('error', (err) => {
      console.error('[/lib/prisma] Unexpected error on idle DB client', err);
    });
  }
  pool = globalForPrisma.pool;

  // Singleton the PrismaClient
  if (!globalForPrisma.prisma) {
    console.log('[/lib/prisma] [HMR] Initializing new PrismaClient with Driver Adapter');
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ 
      adapter,
      log: ['query', 'error', 'warn']
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma, pool };
