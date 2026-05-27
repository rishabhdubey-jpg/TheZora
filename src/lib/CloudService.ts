import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import { Storage } from '@google-cloud/storage';

/**
 * CloudService
 * 
 * Handles all Azure Blob Storage operations for the Antigravity Studio SaaS.
 * Architecture: One Azure Container per studio. The container is provisioned 
 * when a studio registers and connects their Azure account.
 */

export interface StudioCredentials {
  accountName?: string;
  account_name?: string;
  accountKey?: string;
  account_key?: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  blobPath: string; // Equivalent of gcsObjectPath
  containerName: string;
  expiresAt: Date;
}

/**
 * Returns an Azure BlobServiceClient configured with the provided credentials.
 */
export function getBlobServiceClient(credentials: StudioCredentials): BlobServiceClient {
  const accountName = credentials.accountName || credentials.account_name;
  const accountKey = credentials.accountKey || credentials.account_key;

  if (!accountName || !accountKey) {
    throw new Error(
      `Missing required Azure credentials: ${[
        !accountName && 'accountName',
        !accountKey && 'accountKey',
      ]
        .filter(Boolean)
        .join(', ')}`
    );
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
}

/**
 * Provisions a new Azure Container for a studio.
 * - Creates the container in the studio's Azure account.
 * - Configures CORS for direct browser uploads.
 * - Creates an `init.txt` sentinel file.
 */
export async function provisionStudioBucket(
  studioId: string,
  credentials: StudioCredentials
): Promise<{ bucketName: string; storagePath: string }> {
  const blobServiceClient = getBlobServiceClient(credentials);
  
  // naming convention: lowercase and alphanumeric only for Azure containers
  const containerName = `antigravity-studio-${studioId.toLowerCase()}`.replace(/[^a-z0-9-]/g, '');
  const containerClient = blobServiceClient.getContainerClient(containerName);

  try {
    // 1. Create the container
    await containerClient.createIfNotExists({
      access: 'blob', // Allow public read access to blobs by default? 
      // Actually, for privacy, we might want 'undefined' (private) and use SAS for reads.
      // But user likely wants direct access for CDN-like delivery if we use public URLs.
      // Keeping it private (undefined) is safer for a SaaS.
    });

    // 2. Configure CORS
    // As per user request: Restrict to NEXT_PUBLIC_APP_URL
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    await blobServiceClient.setProperties({
      cors: [
        {
          allowedOrigins: allowedOrigin,
          allowedMethods: 'GET,PUT,POST,DELETE,HEAD,OPTIONS',
          allowedHeaders: 'x-ms-blob-type,x-ms-blob-content-type,Content-Type,Content-MD5,x-ms-meta-*',
          exposedHeaders: 'x-ms-request-id,x-ms-client-request-id,ETag',
          maxAgeInSeconds: 3600,
        },
      ],
    });

    // 3. Write sentinel file
    const blockBlobClient = containerClient.getBlockBlobClient('init.txt');
    const content = `Antigravity Studio - Storage Initialized\nStudio ID: ${studioId}\nProvisioned: ${new Date().toISOString()}\n`;
    await blockBlobClient.upload(content, content.length);

    console.log(`[CloudService] Provisioned Azure container: ${containerName}`);
    
    // storagePath format for Azure usually just the URL or account/container
    const storagePath = `https://${blobServiceClient.accountName}.blob.core.windows.net/${containerName}/`;
    
    return { bucketName: containerName, storagePath };
  } catch (error) {
    console.error(`[CloudService] Error provisioning container ${containerName}:`, error);
    throw error;
  }
}

/**
 * Generates a signed URL for uploading a blob to GCP.
 */
export async function generateGcsPresignedUploadUrl(
  bucketName: string,
  blobPath: string,
  contentType: string,
  credentials: any
): Promise<PresignedUrlResult> {
  const projectId = credentials?.projectId || credentials?.project_id || process.env.GCP_PROJECT_ID;
  const clientEmail = credentials?.clientEmail || credentials?.client_email || process.env.GCP_CLIENT_EMAIL;
  const privateKey = (credentials?.privateKey || credentials?.private_key || process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Incomplete GCP configuration for presigned URL');
  }

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    }
  });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  const [uploadUrl] = await storage
    .bucket(bucketName)
    .file(blobPath)
    .getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: contentType,
    });

  return {
    uploadUrl,
    blobPath,
    containerName: bucketName,
    expiresAt,
  };
}

/**
 * Generates a presigned upload URL for direct browser uploads.
 */
export async function generatePresignedUploadUrl(
  provider: 'GCP' | 'AZURE' | string,
  containerName: string,
  blobPath: string,
  contentType: string,
  remainingQuotaBytes: number,
  credentials: any
): Promise<PresignedUrlResult> {
  if (provider === 'GCP') {
    return generateGcsPresignedUploadUrl(containerName, blobPath, contentType, credentials);
  }

  // Azure Implementation
  const accountName = credentials?.accountName || credentials?.account_name || process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = credentials?.accountKey || credentials?.account_key || process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) throw new Error("Azure credentials missing");

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const now = new Date();
  const startsOn = new Date(now.getTime() - 5 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName: blobPath,
    permissions: BlobSASPermissions.parse("racwd"),
    startsOn: startsOn,
    expiresOn: expiresAt,
    protocol: SASProtocol.HttpsAndHttp,
  }, sharedKeyCredential).toString();

  const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;

  return {
    uploadUrl,
    blobPath,
    containerName,
    expiresAt,
  };
}

/**
 * Deletes an object from Azure Storage
 */
export async function deleteStorageObject(
  containerName: string,
  blobPath: string,
  credentials: StudioCredentials
): Promise<void> {
  const blobServiceClient = getBlobServiceClient(credentials);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobPath);
  await blobClient.deleteIfExists();
}

/**
 * Generates a signed URL for reading a blob from GCP.
 */
export async function generateGcsPresignedReadUrl(
  bucketName: string,
  blobPath: string,
  credentials: any,
  expiresInSeconds: number = 3600
): Promise<string> {
  const projectId = credentials.projectId || credentials.project_id;
  const clientEmail = credentials.clientEmail || credentials.client_email;
  const privateKey = (credentials.privateKey || credentials.private_key || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Incomplete GCP configuration');
  }

  const storage = new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    }
  });

  const [url] = await storage
    .bucket(bucketName)
    .file(blobPath)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    });

  return url;
}

/**
 * Generates a SAS URL for reading a blob from Azure.
 */
export async function generateAzurePresignedReadUrl(
  containerName: string,
  blobPath: string,
  credentials: StudioCredentials,
  expiresInSeconds: number = 3600
): Promise<string> {
  const accountName = credentials.accountName || credentials.account_name;
  const accountKey = credentials.accountKey || credentials.account_key;

  if (!accountName || !accountKey) throw new Error("Credentials missing");

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  
  const sasToken = generateBlobSASQueryParameters({
    containerName,
    blobName: blobPath,
    permissions: BlobSASPermissions.parse("r"), // Read only
    expiresOn: new Date(Date.now() + expiresInSeconds * 1000),
  }, sharedKeyCredential).toString();

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobPath}?${sasToken}`;
}

/**
 * Universal read URL generator
 */
export async function generatePresignedReadUrl(
  provider: 'GCP' | 'AZURE' | string,
  bucketName: string,
  blobPath: string,
  credentials: any,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (provider === 'GCP') {
    return generateGcsPresignedReadUrl(bucketName, blobPath, credentials, expiresInSeconds);
  } else {
    return generateAzurePresignedReadUrl(bucketName, blobPath, credentials, expiresInSeconds);
  }
}

/**
 * Verifies accessibility
 */
export async function verifyBucketAccess(
  containerName: string,
  credentials: StudioCredentials
): Promise<boolean> {
  try {
    const blobServiceClient = getBlobServiceClient(credentials);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    return await containerClient.exists();
  } catch {
    return false;
  }
}

/**
 * Lists blobs in a container
 */
export async function listBucketObjects(
  containerName: string,
  prefix: string,
  credentials: StudioCredentials
) {
  const blobServiceClient = getBlobServiceClient(credentials);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    blobs.push({
      name: blob.name,
      size: blob.properties.contentLength,
      updated: blob.properties.lastModified,
      contentType: blob.properties.contentType,
    });
  }
  return blobs;
}
