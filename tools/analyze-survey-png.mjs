#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1];
};
const expectedWidth = Number(option('--expected-width') || 1400);
const expectedHeight = Number(option('--expected-height') || 900);
const background = (option('--background') || '168,189,210').split(',').map(Number);
const tolerance = Number(option('--background-tolerance') || 8);
const outputPath = option('--output');
const inputs = args.filter((value, index) => !value.startsWith('--') && args[index - 1] !== '--expected-width' && args[index - 1] !== '--expected-height' && args[index - 1] !== '--background' && args[index - 1] !== '--background-tolerance' && args[index - 1] !== '--output');

if (!inputs.length) throw new Error('Usage: node tools/analyze-survey-png.mjs [options] <png-or-directory>...');
if (![expectedWidth, expectedHeight, tolerance, ...background].every(Number.isFinite) || background.length !== 3) throw new Error('Invalid image analysis options');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
};
const collect = input => {
  const path = resolve(input);
  if (!existsSync(path)) throw new Error(`Missing input: ${input}`);
  if (statSync(path).isDirectory()) return readdirSync(path, { withFileTypes: true }).flatMap(entry => collect(join(path, entry.name)));
  return path.toLowerCase().endsWith('.png') ? [path] : [];
};
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
const decode = (filePath, bytes) => {
  if (bytes.length < PNG_SIGNATURE.length || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('invalid PNG signature');
  let offset = 8, width, height, bitDepth, colorType, interlace, idat = [], sawIend = false;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) throw new Error('truncated PNG chunk header');
    const length = bytes.readUInt32BE(offset); offset += 4;
    const type = bytes.toString('ascii', offset, offset + 4); offset += 4;
    if (offset + length + 4 > bytes.length) throw new Error(`truncated PNG ${type} chunk`);
    const data = bytes.subarray(offset, offset + length); offset += length;
    const storedCrc = bytes.readUInt32BE(offset); offset += 4;
    if (crc32(Buffer.concat([Buffer.from(type), data])) !== storedCrc) throw new Error(`PNG ${type} CRC mismatch`);
    if (type === 'IHDR') {
      if (length !== 13 || width !== undefined) throw new Error('invalid PNG IHDR');
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') { if (length !== 0) throw new Error('invalid PNG IEND'); sawIend = true; break; }
  }
  if (!sawIend || offset !== bytes.length) throw new Error('incomplete PNG');
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) throw new Error('unsupported PNG format');
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const expectedRawBytes = height * (stride + 1);
  if (raw.length !== expectedRawBytes) throw new Error(`incomplete PNG scan data (${raw.length}/${expectedRawBytes})`);
  const rgba = new Uint8Array(width * height * 4), previous = new Uint8Array(stride);
  let cursor = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++];
    if (filter > 4) throw new Error(`unsupported PNG filter ${filter}`);
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const value = raw[cursor++];
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x];
      const upperLeft = x >= channels ? previous[x - channels] : 0;
      row[x] = (value + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0)) & 255;
    }
    for (let x = 0; x < width; x++) {
      const source = x * channels, target = (y * width + x) * 4;
      rgba[target] = row[source]; rgba[target + 1] = row[source + 1]; rgba[target + 2] = row[source + 2]; rgba[target + 3] = channels === 4 ? row[source + 3] : 255;
    }
    previous.set(row);
  }
  return { width, height, rgba };
};

const analyze = filePath => {
  const bytes = readFileSync(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const result = { path: filePath, bytes: bytes.length, sha256, status: 'FAIL' };
  try {
    const image = decode(filePath, bytes);
    let opaque = 0, transparent = 0, black = 0, backgroundPixels = 0, nonBackground = 0;
    let min = [255, 255, 255, 255], max = [0, 0, 0, 0];
    const pixelCount = image.width * image.height;
    for (let index = 0; index < image.rgba.length; index += 4) {
      const r = image.rgba[index], g = image.rgba[index + 1], b = image.rgba[index + 2], a = image.rgba[index + 3];
      const channels = [r, g, b, a];
      for (let channel = 0; channel < 4; channel++) { min[channel] = Math.min(min[channel], channels[channel]); max[channel] = Math.max(max[channel], channels[channel]); }
      if (a === 255) opaque++; else transparent++;
      if (r <= 2 && g <= 2 && b <= 2) black++;
      const distance = Math.max(Math.abs(r - background[0]), Math.abs(g - background[1]), Math.abs(b - background[2]));
      if (distance <= tolerance) backgroundPixels++; else nonBackground++;
    }
    const nonBackgroundRatio = nonBackground / pixelCount;
    const blackRatio = black / pixelCount;
    result.image = {
      width: image.width, height: image.height, pixels: pixelCount,
      channels: { min, max, opaque, transparent },
      background: { rgb: background, tolerance, matchingPixels: backgroundPixels, ratio: +(backgroundPixels / pixelCount).toFixed(6) },
      nonBackground: { pixels: nonBackground, ratio: +nonBackgroundRatio.toFixed(6) },
      black: { pixels: black, ratio: +blackRatio.toFixed(6) },
    };
    const failures = [];
    if (image.width !== expectedWidth || image.height !== expectedHeight) failures.push(`dimensions ${image.width}x${image.height} != ${expectedWidth}x${expectedHeight}`);
    if (transparent) failures.push(`transparent pixels ${transparent}`);
    if (nonBackgroundRatio < 0.01) failures.push(`non-background ratio ${nonBackgroundRatio.toFixed(6)} < 0.01`);
    if (blackRatio > 0.98) failures.push(`black ratio ${blackRatio.toFixed(6)} > 0.98`);
    result.status = failures.length ? 'FAIL' : 'PASS';
    result.failures = failures;
  } catch (error) {
    result.failures = [error.message];
  }
  return result;
};

const files = [...new Set(inputs.flatMap(collect))].sort();
if (!files.length) throw new Error('No PNG inputs found');
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  expected: { width: expectedWidth, height: expectedHeight, background, backgroundTolerance: tolerance },
  status: 'PASS',
  images: files.map(analyze),
};
if (report.images.some(image => image.status !== 'PASS')) report.status = 'FAIL';
const serialized = JSON.stringify(report, null, 2) + '\n';
if (outputPath) writeFileSync(resolve(outputPath), serialized);
process.stdout.write(serialized);
if (report.status !== 'PASS') process.exitCode = 1;
