import { Jimp } from 'jimp';
import toIco from 'to-ico';
import fs from 'node:fs';
import path from 'node:path';

const SIZE = 1024;
const BG = { r: 22, g: 24, b: 35, a: 255 }; // --color-accent
const PINK = { r: 254, g: 44, b: 85, a: 255 }; // --color-primary
const CYAN = { r: 37, g: 244, b: 238, a: 255 }; // --color-secondary
const WHITE = { r: 255, g: 255, b: 255, a: 255 };

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function mix(c1, c2, t) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
    a: 255,
  };
}

async function build() {
  const masterPath = path.resolve('build', 'icon-1024.png');
  if (fs.existsSync(masterPath)) {
    const image = await Jimp.read(masterPath);
    const buildDir = path.resolve('build');
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = [];
    for (const size of sizes) pngBuffers.push(await image.clone().resize({ w: size, h: size }).getBuffer('image/png'));
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), await toIco(pngBuffers));
    fs.writeFileSync(path.join(buildDir, 'icon.png'), await image.clone().resize({ w: 256, h: 256 }).getBuffer('image/png'));
    console.log('Icône générée depuis build/icon-1024.png');
    return;
  }
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x000000ff });
  const cornerRadius = SIZE * 0.22;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Rounded-square background tile
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let inside = true;
      const cornerCheck = [
        [cornerRadius, cornerRadius],
        [SIZE - cornerRadius, cornerRadius],
        [cornerRadius, SIZE - cornerRadius],
        [SIZE - cornerRadius, SIZE - cornerRadius],
      ];
      if (x < cornerRadius && y < cornerRadius) inside = dist(x, y, cornerRadius, cornerRadius) <= cornerRadius;
      else if (x > SIZE - cornerRadius && y < cornerRadius)
        inside = dist(x, y, SIZE - cornerRadius, cornerRadius) <= cornerRadius;
      else if (x < cornerRadius && y > SIZE - cornerRadius)
        inside = dist(x, y, cornerRadius, SIZE - cornerRadius) <= cornerRadius;
      else if (x > SIZE - cornerRadius && y > SIZE - cornerRadius)
        inside = dist(x, y, SIZE - cornerRadius, SIZE - cornerRadius) <= cornerRadius;

      const color = inside ? BG : { r: 0, g: 0, b: 0, a: 0 };
      image.setPixelColor(rgbaToInt(color), x, y);
      void cornerCheck;
    }
  }

  // TikTok-style duotone note: cyan circle offset back-left, pink circle offset back-right, white note in front
  const noteRadius = SIZE * 0.15;
  const cyanCenter = { x: cx - SIZE * 0.09, y: cy + SIZE * 0.02 };
  const pinkCenter = { x: cx + SIZE * 0.03, y: cy + SIZE * 0.02 };
  const whiteCenter = { x: cx - SIZE * 0.03, y: cy - SIZE * 0.02 };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let color = null;
      if (dist(x, y, cyanCenter.x, cyanCenter.y) <= noteRadius) color = CYAN;
      if (dist(x, y, pinkCenter.x, pinkCenter.y) <= noteRadius) color = PINK;
      if (dist(x, y, whiteCenter.x, whiteCenter.y) <= noteRadius * 0.92) color = WHITE;
      if (color) {
        image.setPixelColor(rgbaToInt(color), x, y);
      }
    }
  }

  void mix;

  const buildDir = path.resolve('build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const basePngPath = path.join(buildDir, 'icon-1024.png');
  await image.write(basePngPath);

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  for (const size of sizes) {
    const resized = image.clone().resize({ w: size, h: size });
    const buf = await resized.getBuffer('image/png');
    pngBuffers.push(buf);
  }

  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

  const png256 = await image.clone().resize({ w: 256, h: 256 }).getBuffer('image/png');
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png256);

  console.log('Icône générée : build/icon.ico');
}

function rgbaToInt(c) {
  return ((c.r << 24) | (c.g << 16) | (c.b << 8) | c.a) >>> 0;
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
