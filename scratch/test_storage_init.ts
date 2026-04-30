import { getCloudStorageClient } from '../src/lib/CloudService';

async function test() {
  console.log('--- Test 1: CamelCase ---');
  try {
    const creds1 = {
      projectId: 'p1',
      clientEmail: 'e1',
      privateKey: 'k1\\nline2',
    };
    const storage1 = getCloudStorageClient(creds1);
    console.log('✅ Success CamelCase');
    // @ts-ignore
    console.log('Mapped private_key:', storage1.authClient.credentials.private_key.includes('\n') ? 'HAS NEWLINE' : 'MISSING NEWLINE');
  } catch (e: any) {
    console.error('❌ Fail CamelCase:', e.message);
  }

  console.log('\n--- Test 2: SnakeCase ---');
  try {
    const creds2 = {
      project_id: 'p2',
      client_email: 'e2',
      private_key: 'k2\\nline2',
    };
    const storage2 = getCloudStorageClient(creds2);
    console.log('✅ Success SnakeCase');
     // @ts-ignore
    console.log('Mapped private_key:', storage2.authClient.credentials.private_key.includes('\n') ? 'HAS NEWLINE' : 'MISSING NEWLINE');
  } catch (e: any) {
    console.error('❌ Fail SnakeCase:', e.message);
  }

  console.log('\n--- Test 3: Missing Fields ---');
  try {
    const creds3 = { projectId: 'p3' };
    // @ts-ignore
    getCloudStorageClient(creds3);
  } catch (e: any) {
    console.log('✅ Caught expected error:', e.message);
  }
}

test();
