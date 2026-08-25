/**
 * Script to generate API keys for mini-apps.
 * Run with: npx tsx hub-central/supabase/scripts/generate-api-keys.ts
 *
 * Outputs:
 * 1. Raw API keys to put in each mini-app's .env
 * 2. SQL INSERT statements to run in Supabase SQL Editor
 */

const MINI_APPS = [
  { id: 'stareduca-junior', name: 'StarEduca Junior', target: 'ceo_junior' },
  { id: 'stareduca-senior', name: 'StarEduca Senior', target: 'padres_3_0' },
  { id: 'starvoices', name: 'StarVoices', target: 'padres_3_0' },
  { id: 'starreads', name: 'StarReads', target: 'ceo_junior' },
  { id: 'stargenius', name: 'StarGenius', target: 'ceo_junior' },
  { id: 'starempire', name: 'StarEmpire', target: 'ceo_junior' },
];

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function main() {
  console.log('=== API Keys for Mini-Apps ===\n');
  console.log('--- Environment Variables (for admin .env.local) ---\n');
  console.log('NEXT_PUBLIC_MAIN_SUPABASE_URL=https://vmfdqkasrcrmcszmctmp.supabase.co\n');

  const sqlStatements: string[] = [];

  for (const app of MINI_APPS) {
    const rawKey = generateKey();
    const keyHash = await hashKey(rawKey);

    const envName = `NEXT_PUBLIC_PUSH_KEY_${app.id.replace(/-/g, '_').toUpperCase()}`;
    console.log(`${envName}=${rawKey}`);

    sqlStatements.push(
      `INSERT INTO api_keys (key_hash, mini_app_id, target_app_id, name) VALUES ('${keyHash}', '${app.id}', '${app.target}', '${app.name} Push Key');`
    );
  }

  console.log('\n--- SQL Statements (run in Supabase SQL Editor) ---\n');
  for (const sql of sqlStatements) {
    console.log(sql);
  }

  console.log('\n--- Mini-app .env vars (for each mini-app backend) ---\n');
  for (const app of MINI_APPS) {
    const rawKey = generateKey();
    const keyHash = await hashKey(rawKey);
    console.log(`# ${app.name}`);
    console.log(`NOTIFICATION_API_KEY=${rawKey}`);
    console.log(`# Hash: ${keyHash}`);
    console.log('');
  }
}

main().catch(console.error);
