import { Storage } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const projectId = process.env.GCP_PROJECT_ID;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function setupCors() {
  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing GCP credentials in .env file.');
    console.log('Required: GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY');
    process.exit(1);
  }

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  try {
    const [buckets] = await storage.getBuckets();
    
    // We target buckets that start with 'antigravity-studio-'
    const studioBuckets = buckets.filter(b => b.name.startsWith('antigravity-studio-'));

    if (studioBuckets.length === 0) {
      console.log('ℹ️ No studio buckets found. If you just started, provision a bucket first.');
      return;
    }

    const corsConfiguration = [
      {
        origin: [appUrl, 'http://localhost:3000'],
        method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
        responseHeader: [
          'Content-Type',
          'Content-MD5',
          'Content-Disposition',
          'x-goog-resumable',
          'Authorization',
        ],
        maxAgeSeconds: 3600,
      },
    ];

    console.log(`🚀 Setting CORS for ${studioBuckets.length} bucket(s)...`);

    for (const bucket of studioBuckets) {
      await bucket.setCorsConfiguration(corsConfiguration);
      console.log(`✅ CORS configured for: ${bucket.name}`);
    }

    console.log('\n✨ GCS CORS setup complete. Browser uploads should now work without blocks.');
  } catch (error) {
    console.error('❌ Failed to set CORS configuration:', error);
  }
}

setupCors();
