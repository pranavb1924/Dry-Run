// Downloads the files listed in sources.ts into data/raw/ and checks each one
// against its checksum. Files already there and intact are skipped, so it's
// safe to run again.
//
//   npm run data:download

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SOURCES } from './sources.ts';

const DIR = join(import.meta.dirname, '..', 'data', 'raw');

function checksum(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

await mkdir(DIR, { recursive: true });

for (const source of SOURCES) {
  const path = join(DIR, `${source.month}.csv`);
  if (existsSync(path) && checksum(await readFile(path)) === source.sha256) {
    console.log(`${source.month}  already downloaded`);
    continue;
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`${source.month}: download failed with HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (checksum(bytes) !== source.sha256) {
    throw new Error(`${source.month}: the file doesn't match its checksum. The state may have replaced it.`);
  }

  await writeFile(path, bytes);
  console.log(`${source.month}  ${(bytes.length / 1e6).toFixed(1)} MB`);
}
