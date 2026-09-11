#!/usr/bin/env node
/**
 * Generate Ideas desktop/PWA icons from the product mark (three nodes).
 * Writes resources/app.{png,icns,ico}, app_dev.png, icon.png, and public/pwa icons.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resources = path.join(root, 'resources');
const pwaDir = path.join(root, 'public', 'pwa');

/** Ideas mark: three nodes + edges on Ideus-dark tile. */
function ideasMarkSvg(size, { pad = 0.18, bg = '#0B1220', fg = '#3DDC97' } = {}) {
  const inset = size * pad;
  const view = 32;
  const scale = (size - inset * 2) / view;
  const tx = inset;
  const ty = inset;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <circle cx="16" cy="7" r="3.1" fill="${fg}"/>
    <circle cx="7.5" cy="23" r="3.1" fill="${fg}"/>
    <circle cx="24.5" cy="23" r="3.1" fill="${fg}"/>
    <path d="M14.2 9.4 9.4 20.6M17.8 9.4l4.8 11.2M10.8 23h10.4"
      stroke="${fg}" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
}

async function writePng(file, size, opts) {
  const buf = await sharp(Buffer.from(ideasMarkSvg(size, opts))).png().toBuffer();
  fs.writeFileSync(file, buf);
  console.log(`wrote ${path.relative(root, file)} (${size}x${size})`);
}

function buildIcns(sourcePng) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideas-iconset-'));
  const iconset = path.join(tmp, 'app.iconset');
  fs.mkdirSync(iconset);
  const sizes = [
    [16, 'icon_16x16.png'],
    [32, 'diana.k@example.org'],
    [32, 'icon_32x32.png'],
    [64, 'ivan.p@example.net'],
    [128, 'icon_128x128.png'],
    [256, 'wendy.h@example.net'],
    [256, 'icon_256x256.png'],
    [512, 'wendy.h@example.net'],
    [512, 'icon_512x512.png'],
    [1024, 'walt.e@example.net'],
  ];
  for (const [px, name] of sizes) {
    execFileSync('sips', ['-z', String(px), String(px), sourcePng, '--out', path.join(iconset, name)], {
      stdio: 'pipe',
    });
  }
  const outIcns = path.join(resources, 'app.icns');
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', outIcns], { stdio: 'pipe' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${path.relative(root, outIcns)}`);
}

/** Minimal ICO with embedded PNG (Vista+). */
function writeIcoFromPng(pngPath, icoPath) {
  const png = fs.readFileSync(pngPath);
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width 0 => 256
  entry.writeUInt8(0, 1); // height 0 => 256
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  fs.writeFileSync(icoPath, Buffer.concat([header, entry, png]));
  console.log(`wrote ${path.relative(root, icoPath)}`);
}

async function main() {
  fs.mkdirSync(resources, { recursive: true });
  fs.mkdirSync(pwaDir, { recursive: true });

  const master = path.join(resources, 'app.png');
  await writePng(master, 1024);
  await writePng(path.join(resources, 'icon.png'), 800);
  await writePng(path.join(resources, 'app_dev.png'), 1024, { bg: '#122033', fg: '#5BE4AD' });

  for (const size of [180, 192, 512]) {
    await writePng(path.join(pwaDir, `icon-${size}.png`), size);
  }

  const icoSource = path.join(resources, 'app-256.png');
  await writePng(icoSource, 256);
  writeIcoFromPng(icoSource, path.join(resources, 'app.ico'));
  fs.unlinkSync(icoSource);

  buildIcns(master);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
