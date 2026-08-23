#!/usr/bin/env node
/**
 * Sinh `.env` (backend) va `apps/web/.env.local` (frontend) tu thong tin cua stack
 * Supabase dang chay.
 *
 * Ly do co script nay: key cua Supabase local doi moi khi `supabase start` chay lai tren
 * mot cau hinh khac, va sao chep tay bon chuoi JWT dai la cach chac chan de mat nua gio
 * di tim mot loi 401. Cac gia tri nguoi dung tu dat (Google OAuth, PORT...) duoc giu lai.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_ENV = join(ROOT, '.env');
const WEB_ENV = join(ROOT, 'apps', 'web', '.env.local');

/** Bien duoc giu nguyen neu file .env hien tai da co - script khong ghi de. */
const PRESERVED = [
  'GOOGLE_OAUTH_ENABLED',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_SECRET',
  'PORT',
  'WEB_ORIGIN',
];

function readSupabaseStatus() {
  const isWindows = process.platform === 'win32';
  const bin = join(ROOT, 'node_modules', '.bin', isWindows ? 'supabase.CMD' : 'supabase');

  let output;
  try {
    // Node khong con tu chay file .CMD qua shell nua (vi ly do bao mat), nen tren
    // Windows phai goi qua shell bang mot chuoi lenh hoan chinh.
    output = isWindows
      ? execSync(`"${bin}" status -o env`, {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : execFileSync(bin, ['status', '-o', 'env'], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
  } catch (error) {
    console.error('Khong doc duoc trang thai Supabase. Da chay `pnpm supabase:start` chua?');
    if (error.stderr) console.error(String(error.stderr).trim());
    process.exit(1);
  }

  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function readExisting(path) {
  if (!existsSync(path)) return {};

  const values = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function pick(existing, key, fallback) {
  const current = existing[key];
  return current !== undefined && current !== '' ? current : fallback;
}

const status = readSupabaseStatus();
const previousRoot = readExisting(ROOT_ENV);

const apiUrl = status.API_URL ?? 'http://127.0.0.1:54321';
// DB_URL cua Supabase khong kem tham so schema; Prisma can no de biet lam viec o dau.
const dbUrl = `${status.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'}?schema=public`;

const rootEnv = `# File nay do \`pnpm env:sync\` sinh ra. Sua tay duoc, nhung cac gia tri lay tu
# Supabase se bi ghi de o lan chay tiep theo.

# --- Postgres (Prisma) ---
DATABASE_URL="${dbUrl}"
DIRECT_URL="${dbUrl}"

# --- Supabase ---
SUPABASE_URL="${apiUrl}"
SUPABASE_ANON_KEY="${status.ANON_KEY ?? ''}"
SUPABASE_SERVICE_ROLE_KEY="${status.SERVICE_ROLE_KEY ?? ''}"
SUPABASE_JWT_SECRET="${status.JWT_SECRET ?? ''}"

# --- apps/api ---
PORT=${pick(previousRoot, 'PORT', '4000')}
WEB_ORIGIN="${pick(previousRoot, 'WEB_ORIGIN', 'http://localhost:3000')}"

# --- Google OAuth (tuy chon) ---
# GOOGLE_OAUTH_ENABLED phai luon la "true" hoac "false": supabase/config.toml doc thang
# bien nay, de trong se lam \`supabase start\` bao ProjectConfigParseError.
GOOGLE_OAUTH_ENABLED=${pick(previousRoot, 'GOOGLE_OAUTH_ENABLED', 'false')}
GOOGLE_CLIENT_ID="${pick(previousRoot, 'GOOGLE_CLIENT_ID', '')}"
GOOGLE_SECRET="${pick(previousRoot, 'GOOGLE_SECRET', '')}"
`;

const previousWeb = readExisting(WEB_ENV);

const webEnv = `# File nay do \`pnpm env:sync\` sinh ra.
# Chi dat bien NEXT_PUBLIC_* o day - tat ca deu duoc gui xuong trinh duyet.

NEXT_PUBLIC_SUPABASE_URL="${apiUrl}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${status.ANON_KEY ?? ''}"
NEXT_PUBLIC_API_URL="${pick(previousWeb, 'NEXT_PUBLIC_API_URL', 'http://localhost:4000')}"
NEXT_PUBLIC_SITE_URL="${pick(previousWeb, 'NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')}"
`;

writeFileSync(ROOT_ENV, rootEnv, 'utf8');
writeFileSync(WEB_ENV, webEnv, 'utf8');

console.log('Da ghi:');
console.log('  .env');
console.log('  apps/web/.env.local');

if (!status.JWT_SECRET) {
  console.warn(
    '\nCanh bao: Supabase khong tra ve JWT_SECRET. Neu stack dang ky JWT bang khoa bat\n' +
      'doi xung, hay de SUPABASE_JWT_SECRET trong - API se tu chuyen sang xac thuc qua JWKS.',
  );
}

for (const key of PRESERVED) {
  if (previousRoot[key]) {
    console.log(`  (giu nguyen ${key} tu file cu)`);
  }
}
