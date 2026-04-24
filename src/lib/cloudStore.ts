import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CloudProviderType = 'GCP' | 'AWS' | 'Azure' | null;

export interface CloudStorageState {
  // Connection status
  connectedProvider: CloudProviderType;
  isConnecting: boolean;
  connectionError: string | null;

  // Storage quota (values come from the DB / API)
  storageUsedBytes: number;
  storageLimitBytes: number;

  // GCP credentials (kept in memory only – NOT persisted to localStorage)
  gcpProjectId: string;
  gcpClientEmail: string;
  gcpPrivateKey: string;
  gcpBucketName: string;

  // AWS credentials (kept in memory only)
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsBucketName: string;

  // Azure credentials (kept in memory only)
  azureAccountName: string;
  azureAccountKey: string;
  azureContainerName: string;
  azureSasToken: string;

  // Studio info
  studioId: string | null;

  // Actions
  setStudioId: (id: string) => void;
  connectGCP: (creds: { projectId: string; clientEmail: string; privateKey: string; bucketName: string }) => Promise<void>;
  connectAWS: (creds: { accessKeyId: string; secretAccessKey: string; region: string; bucketName: string }) => Promise<void>;
  connectAzure: (creds: { accountName: string; accountKey: string; containerName: string; sasToken?: string }) => Promise<void>;
  disconnect: () => void;
  refreshStorageUsage: (studioId: string) => Promise<void>;
  setConnectionError: (error: string | null) => void;
}

export const useCloudStore = create<CloudStorageState>()(
  persist(
    (set, get) => ({
      connectedProvider: null,
      isConnecting: false,
      connectionError: null,
      storageUsedBytes: 0,
      storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB default
      gcpProjectId: '',
      gcpClientEmail: '',
      gcpPrivateKey: '',
      gcpBucketName: '',
      awsAccessKeyId: '',
      awsSecretAccessKey: '',
      awsRegion: 'us-east-1',
      awsBucketName: '',
      azureAccountName: '',
      azureAccountKey: '',
      azureContainerName: '',
      azureSasToken: '',
      studioId: null,

      setStudioId: (id: string) => set({ studioId: id }),

      connectGCP: async (creds) => {
        set({ isConnecting: true, connectionError: null });
        try {
          const { studioId } = get();
          if (!studioId) throw new Error('No studio ID set.');

          const response = await fetch('/api/storage/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studioId,
              provider: 'GCP',
              credentials: creds,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to provision GCS bucket.');
          }

          const data = await response.json();

          set({
            connectedProvider: 'GCP',
            gcpProjectId: creds.projectId,
            gcpClientEmail: creds.clientEmail,
            gcpPrivateKey: creds.privateKey,
            gcpBucketName: data.bucketName || creds.bucketName,
            isConnecting: false,
          });
        } catch (error) {
          set({
            isConnecting: false,
            connectionError: (error as Error).message,
          });
          throw error;
        }
      },

      connectAWS: async (creds) => {
        set({ isConnecting: true, connectionError: null });
        try {
          // AWS S3 integration placeholder — same pattern as GCP but for S3
          await new Promise((r) => setTimeout(r, 1200)); // Simulated latency
          set({
            connectedProvider: 'AWS',
            awsAccessKeyId: creds.accessKeyId,
            awsSecretAccessKey: creds.secretAccessKey,
            awsRegion: creds.region,
            awsBucketName: creds.bucketName,
            isConnecting: false,
          });
        } catch (error) {
          set({
            isConnecting: false,
            connectionError: (error as Error).message,
          });
          throw error;
        }
      },

      connectAzure: async (creds) => {
        set({ isConnecting: true, connectionError: null });
        try {
          const { studioId } = get();
          if (!studioId) throw new Error('No studio ID set.');

          const response = await fetch('/api/storage/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studioId,
              provider: 'AZURE',
              credentials: {
                accountName: creds.accountName,
                accountKey: creds.accountKey
              },
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to provision Azure container.');
          }

          const data = await response.json();

          set({
            connectedProvider: 'Azure',
            azureAccountName: creds.accountName,
            azureAccountKey: creds.accountKey,
            azureContainerName: data.bucketName || creds.containerName,
            isConnecting: false,
          });
        } catch (error) {
          set({
            isConnecting: false,
            connectionError: (error as Error).message,
          });
          throw error;
        }
      },

      disconnect: () => {
        set({
          connectedProvider: null,
          gcpProjectId: '',
          gcpClientEmail: '',
          gcpPrivateKey: '',
          gcpBucketName: '',
          awsAccessKeyId: '',
          awsSecretAccessKey: '',
          awsRegion: 'us-east-1',
          awsBucketName: '',
          azureAccountName: '',
          azureAccountKey: '',
          azureContainerName: '',
          azureSasToken: '',
          connectionError: null,
        });
      },

      refreshStorageUsage: async (studioId: string) => {
        try {
          const res = await fetch(`/api/storage/usage?studioId=${studioId}`);
          if (res.ok) {
            const data = await res.json();
            set({
              storageUsedBytes: Number(data.storageUsed),
              storageLimitBytes: Number(data.storageLimit),
            });
          }
        } catch (err) {
          console.warn('[CloudStore] Failed to refresh storage usage:', err);
        }
      },

      setConnectionError: (error) => set({ connectionError: error }),
    }),
    {
      name: 'antigravity-cloud-storage',
      storage: createJSONStorage(() => localStorage),
      // Do NOT persist raw credentials to localStorage
      partialize: (state) => ({
        connectedProvider: state.connectedProvider,
        studioId: state.studioId,
        gcpBucketName: state.gcpBucketName,
        awsBucketName: state.awsBucketName,
        awsRegion: state.awsRegion,
        azureContainerName: state.azureContainerName,
      }),
    }
  )
);
