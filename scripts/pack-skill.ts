import fs from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillName = "prompt-optimize";
const skillDir = path.join(rootDir, "skill", skillName);
const distDir = path.join(rootDir, "dist");
const outputPath = path.join(distDir, `${skillName}.zip`);

const crcTable: Uint32Array = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

async function collectSkillFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSkillFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => toPosix(path.relative(skillDir, a)).localeCompare(toPosix(path.relative(skillDir, b))));
}

function createLocalHeader(fileName: string, crc: number, compressedSize: number, uncompressedSize: number): Buffer {
  const name = Buffer.from(fileName, "utf8");
  const header = Buffer.alloc(30);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);

  return Buffer.concat([header, name]);
}

function createCentralDirectoryHeader(
  fileName: string,
  crc: number,
  compressedSize: number,
  uncompressedSize: number,
  localHeaderOffset: number
): Buffer {
  const name = Buffer.from(fileName, "utf8");
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(uncompressedSize, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localHeaderOffset, 42);

  return Buffer.concat([header, name]);
}

function createEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Buffer {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

async function buildZip(): Promise<Buffer> {
  const files = await collectSkillFiles(skillDir);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const filePath of files) {
    const relativePath = toPosix(path.relative(skillDir, filePath));
    const zipPath = `${skillName}/${relativePath}`;
    const data = await fs.readFile(filePath);
    const compressed = deflateRawSync(data, { level: 9 });
    const checksum = crc32(data);
    const localHeader = createLocalHeader(zipPath, checksum, compressed.length, data.length);
    const centralHeader = createCentralDirectoryHeader(zipPath, checksum, compressed.length, data.length, offset);

    localParts.push(localHeader, compressed);
    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = createEndOfCentralDirectory(files.length, centralDirectory.length, centralDirectoryOffset);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

await fs.mkdir(distDir, { recursive: true });
const archive = await buildZip();
await fs.writeFile(outputPath, archive);

console.log(`Packed ${skillName} -> ${path.relative(rootDir, outputPath)} (${archive.length} bytes).`);
