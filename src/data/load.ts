// Downloads the data file and decompresses it in the browser.
//
// The file is stored gzipped. If a server also compresses it on the way, the
// browser undoes that automatically, so the bytes may arrive compressed or
// not; checking gzip's two-byte signature handles both.

export const DATA_URL = `${import.meta.env.BASE_URL}data/transactions.bin`;

/** Fetches the file, reporting progress from 0 to 1 when the size is known. */
export async function download(url: string, onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok || response.body === null) {
    throw new Error(`Couldn't load the data (HTTP ${response.status})`);
  }
  const total = Number(response.headers.get('Content-Length')) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress(Math.min(1, received / total));
    }
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzip(bytes) : bytes.buffer;
}

function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
