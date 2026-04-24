import { deflateRawSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputPath = path.resolve('public/bundle-starter.zip');
const manifest = {
  schemaVersion: 1,
  title: 'My interactive post',
  summary: 'A short plain-text description shown as the meta description and on search/listing pages.',
  entry: 'index.html',
  layout: {
    mode: 'inline-auto',
    minHeight: 320,
    maxHeight: 1600,
    allowFullscreenToggle: false,
  },
  capabilities: {
    scripts: true,
    popups: false,
    pointerLock: false,
  },
  authoredAt: '2026-04-21T12:00:00Z',
};

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My interactive post</title>
  <style>
    html, body { margin: 0; padding: 0; font-family: system-ui, sans-serif; color: #f4f4f5; background: #0b0b0f; }
    main { padding: 2rem; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; }
  </style>
</head>
<body>
  <main id="app">
    <h1>Hello from a bundle.</h1>
    <p>Edit this file, ship a zip, upload it.</p>
  </main>
  <script>
    // inline-auto resize reporter — emits to parent whenever body height changes.
    (function reportHeight() {
      if (window.top === window.self) return;
      var last = -1;
      function send() {
        var h = document.documentElement.scrollHeight;
        if (h === last) return;
        last = h;
        window.parent.postMessage({ type: 'banodoco:resize', v: 1, height: h }, '*');
      }
      new ResizeObserver(send).observe(document.documentElement);
      window.addEventListener('load', send);
    })();
  </script>
</body>
</html>
`;

const readme = `# Bundle starter

1. Edit \`post.json\` to describe your bundle.
2. Replace \`index.html\` with your static entrypoint or your build output.
3. Add any images, fonts, audio, or scripts alongside these files.
4. Zip the bundle contents so \`post.json\` and \`index.html\` stay at the archive root.
5. Upload the resulting ZIP from the Bundle tab in Submit Post.

Keep paths relative inside the bundle and avoid absolute URLs for bundled assets.
`;

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toDosTime = (date) =>
  ((date.getHours() & 0x1f) << 11)
  | ((date.getMinutes() & 0x3f) << 5)
  | Math.floor(date.getSeconds() / 2);

const toDosDate = (date) =>
  (((date.getFullYear() - 1980) & 0x7f) << 9)
  | (((date.getMonth() + 1) & 0x0f) << 5)
  | (date.getDate() & 0x1f);

function buildZip(entries) {
  const now = new Date('2026-04-21T12:00:00Z');
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const compressed = deflateRawSync(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(toDosTime(now), 10);
    header.writeUInt16LE(toDosDate(now), 12);
    header.writeUInt32LE(crc32(content), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(nameBuffer.length, 26);
    header.writeUInt16LE(0, 28);
    const localRecord = Buffer.concat([header, nameBuffer, compressed]);
    localParts.push(localRecord);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(toDosTime(now), 12);
    central.writeUInt16LE(toDosDate(now), 14);
    central.writeUInt32LE(crc32(content), 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    const centralRecord = Buffer.concat([central, nameBuffer]);
    centralParts.push(centralRecord);

    offset += localRecord.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const archive = buildZip([
  { name: 'post.json', content: `${JSON.stringify(manifest, null, 2)}\n` },
  { name: 'index.html', content: indexHtml },
  { name: 'README.md', content: readme },
]);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, archive);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
