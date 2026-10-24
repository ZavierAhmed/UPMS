import {deflateRawSync,crc32} from "node:zlib";
export function deterministicZip(files) {
const local = [],
  central = [];
let offset = 0;
for (const [name, raw] of [...files].sort(([a], [b]) =>
  a.localeCompare(b, "en"),
)) {
  const filename = Buffer.from(name);
  const data = deflateRawSync(raw, { level: 9 });
  if (raw.length > 0xffffffff || offset + data.length > 0xffffffff)
    throw new Error("ZIP64 would be required.");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(33, 12); // fixed 1980-01-01
  header.writeUInt32LE(crc32(raw), 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(raw.length, 22);
  header.writeUInt16LE(filename.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50);
  directory.writeUInt16LE(20, 4);
  header.copy(directory, 6, 4, 30);
  directory.writeUInt32LE(offset, 42);
  local.push(header, filename, data);
  central.push(directory, filename);
  offset += header.length + filename.length + data.length;
}
if (files.size > 65535) throw new Error("ZIP64 would be required.");
const directoryBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.size, 8);
end.writeUInt16LE(files.size, 10);
end.writeUInt32LE(directoryBytes.length, 12);
end.writeUInt32LE(offset, 16);
return Buffer.concat([...local, directoryBytes, end]);
}
