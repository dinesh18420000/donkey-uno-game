const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to write RGBA buffer as valid PNG
function writePNG(filepath, width, height, rgbaBuffer) {
  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = chunk('IHDR', ihdr);

  // Raw image data with 0 filter byte per scanline
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter: None
    rgbaBuffer.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  const totalBuf = Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, totalBuf);
  console.log(`Generated: ${filepath} (${width}x${height})`);
}

// Ensure textures dir
const texturesDir = path.join(__dirname, 'Assets', '_Project', 'Textures');
fs.mkdirSync(texturesDir, { recursive: true });

// 1. Purple vignette background with subtle playing card suit watermark
function generateBackground() {
  const w = 540, h = 960;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      // Radial vignette from center (0.5, 0.45)
      const dx = (nx - 0.5) * 1.1;
      const dy = (ny - 0.45) * 1.0;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Center is rich purple #580d75 (88, 13, 117)
      // Edge is deep dark violet #1d0326 (29, 3, 38)
      const t = Math.min(1, Math.max(0, dist * 1.25));
      let r = Math.round(88 * (1 - t) + 26 * t);
      let g = Math.round(13 * (1 - t) + 4 * t);
      let b = Math.round(117 * (1 - t) + 36 * t);

      // Add subtle card suit diamond watermark pattern
      const patternX = (x % 48) - 24;
      const patternY = (y % 48) - 24;
      const pDist = Math.abs(patternX) + Math.abs(patternY);
      if (pDist < 12) {
        // slightly lighter
        const highlight = (12 - pDist) / 12 * 10;
        r = Math.min(255, r + Math.round(highlight * 0.9));
        g = Math.min(255, g + Math.round(highlight * 0.2));
        b = Math.min(255, b + Math.round(highlight * 1.1));
      }

      const idx = (y * w + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  writePNG(path.join(texturesDir, 'bg_purple_pattern.png'), w, h, buf);
}

// 2. Wood table footer
function generateWoodFooter() {
  const w = 256, h = 96;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ny = y / h; // 0 top, 1 bottom
    for (let x = 0; x < w; x++) {
      let r, g, b;
      if (y < 3) {
        // Golden highlight stripe at top
        r = 180; g = 110; b = 45;
      } else if (y < 6) {
        // Secondary bevel
        r = 135; g = 75; b = 30;
      } else {
        // Wood gradient
        const t = (y - 6) / (h - 6);
        // Subtle wood grain noise
        const grain = Math.sin(x * 0.15 + y * 0.05) * 6 + Math.sin(x * 0.05) * 4;
        r = Math.max(0, Math.min(255, Math.round((95 * (1 - t) + 48 * t) + grain)));
        g = Math.max(0, Math.min(255, Math.round((48 * (1 - t) + 22 * t) + grain * 0.5)));
        b = Math.max(0, Math.min(255, Math.round((22 * (1 - t) + 10 * t) + grain * 0.2)));
      }
      const idx = (y * w + x) * 4;
      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  writePNG(path.join(texturesDir, 'wood_table_footer.png'), w, h, buf);
}

// 3. Ninja Avatar
function generateNinjaAvatar() {
  const size = 256;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      const idx = (y * size + x) * 4;
      if (dist > r) {
        // Outside avatar circle
        buf[idx + 3] = 0;
        continue;
      }

      // Base background circle: deep navy/purple
      let cr = 45, cg = 38, cb = 70, ca = 255;

      // Ninja Cowl Head: circle centered at (cx, cy - 12) radius 80
      const headDist = Math.hypot(dx, dy + 12);
      // Ninja Shoulder bust: ellipse below
      const shoulder = (dx * dx) / (90 * 90) + ((dy - 65) * (dy - 65)) / (55 * 55);

      if (headDist < 76 || shoulder < 1.0) {
        // Dark ninja hood #221f2d
        cr = 34; cg = 31; cb = 45;

        // Headband across forehead: y between cy - 35 and cy - 20
        if (dy >= -40 && dy <= -24 && Math.abs(dx) < 68) {
          cr = 60; cg = 55; cb = 75; // headband fabric
          // Silver forehead plate in center
          if (Math.abs(dx) < 22 && dy >= -36 && dy <= -28) {
            cr = 180; cg = 185; cb = 195; // silver plate
          }
        }

        // Face opening mask cutout: y between cy - 20 and cy + 18, width ~50
        const inFaceBox = dy > -20 && dy < 16 && Math.abs(dx) < 52;
        if (inFaceBox) {
          // Face skin / dark shadow opening
          cr = 40; cg = 36; cb = 52;

          // Mask covering mouth and nose (lower half of face box): dy > -2
          if (dy >= -2) {
            cr = 26; cg = 24; cb = 36; // black mouth mask
          } else {
            // Eyes area!
            // Left eye: dx around -22, dy around -10
            // Right eye: dx around +22, dy around -10
            const leftEye = Math.hypot((dx + 22) * 1.5, (dy + 10) * 3);
            const rightEye = Math.hypot((dx - 22) * 1.5, (dy + 10) * 3);

            if (leftEye < 13 || rightEye < 13) {
              cr = 255; cg = 255; cb = 255; // White eye slit
              // Pupil
              if (Math.hypot(dx + 22, dy + 10) < 4 || Math.hypot(dx - 22, dy + 10) < 4) {
                cr = 20; cg = 20; cb = 30; // dark pupil
              }
            }
          }
        }

        // Sword handle over shoulder: diagonal rectangle around dx = -50, dy = 10
        const swordX = dx + 48;
        const swordY = dy + 15;
        // rotated 45 deg
        const rx = (swordX - swordY) * 0.707;
        const ry = (swordX + swordY) * 0.707;
        if (Math.abs(rx) < 6 && ry > -30 && ry < 20) {
          cr = 210; cg = 170; cb = 40; // Gold sword hilt
        }
      }

      // Edge antialiasing for avatar circle
      if (dist > r - 1.5) {
        ca = Math.round(255 * (r - dist) / 1.5);
      }

      buf[idx] = cr;
      buf[idx + 1] = cg;
      buf[idx + 2] = cb;
      buf[idx + 3] = ca;
    }
  }
  writePNG(path.join(texturesDir, 'ninja_avatar.png'), size, size, buf);
}

// 4. Player Avatar (Godwin silhouette)
function generatePlayerAvatar() {
  const size = 256;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      const idx = (y * size + x) * 4;
      if (dist > r) {
        buf[idx + 3] = 0;
        continue;
      }

      // Base gray circle
      let cr = 150, cg = 160, cb = 175, ca = 255;

      // Bust silhouette (white)
      // Head: circle at (cx, cy - 24) radius 42
      const headDist = Math.hypot(dx, dy + 24);
      // Shoulders: ellipse at (cx, cy + 68) rx 72, ry 48
      const shoulder = (dx * dx) / (76 * 76) + ((dy - 68) * (dy - 68)) / (48 * 48);

      if (headDist < 42 || shoulder < 1.0) {
        cr = 240; cg = 245; cb = 250; // Clean white bust
      }

      if (dist > r - 1.5) {
        ca = Math.round(255 * (r - dist) / 1.5);
      }

      buf[idx] = cr;
      buf[idx + 1] = cg;
      buf[idx + 2] = cb;
      buf[idx + 3] = ca;
    }
  }
  writePNG(path.join(texturesDir, 'player_avatar.png'), size, size, buf);
}

// 5. Suit Icons: Spades, Hearts, Clubs, Diamonds
function generateSuitIcons() {
  const size = 256;
  const cx = size / 2, cy = size / 2;

  // SPADES ♠
  {
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / 85;
        const dy = -(y - (cy - 10)) / 85; // invert so top is positive

        // Inverted heart shape for spade top
        // (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
        const r2 = dx * dx + dy * dy;
        const heartEq = Math.pow(r2 - 1, 3) - dx * dx * Math.pow(dy, 3);
        const inHead = (dy > -0.6 && heartEq <= 0.05);

        // Spade pointed tip at top
        const tipY = dy - 0.95;
        const inTip = dy >= 0.8 && dy <= 1.25 && Math.abs(dx) <= (1.25 - dy) * 0.8;

        // Base/Stem
        const stemY = (y - (cy + 45)) / 45;
        const stemX = (x - cx) / 45;
        const inStem = stemY >= 0 && stemY <= 1.0 && Math.abs(stemX) <= (0.15 + stemY * stemY * 0.7);

        const inSpade = inHead || inTip || inStem;
        const idx = (y * size + x) * 4;
        if (inSpade) {
          buf[idx] = 15; buf[idx + 1] = 23; buf[idx + 2] = 42; buf[idx + 3] = 255;
        } else {
          buf[idx + 3] = 0;
        }
      }
    }
    writePNG(path.join(texturesDir, 'suit_spades.png'), size, size, buf);
  }

  // HEARTS ♥
  {
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / 85;
        const dy = -(y - (cy + 15)) / 85; // pointing down

        const r2 = dx * dx + dy * dy;
        const heartEq = Math.pow(r2 - 1, 3) - dx * dx * Math.pow(dy, 3);
        const inHeart = (heartEq <= 0.05);

        const idx = (y * size + x) * 4;
        if (inHeart) {
          buf[idx] = 225; buf[idx + 1] = 29; buf[idx + 2] = 45; buf[idx + 3] = 255;
        } else {
          buf[idx + 3] = 0;
        }
      }
    }
    writePNG(path.join(texturesDir, 'suit_hearts.png'), size, size, buf);
  }

  // CLUBS ♣
  {
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - (cy - 12);

        // 3 circles of the club
        const topCircle = Math.hypot(dx, dy + 42) < 42;
        const leftCircle = Math.hypot(dx + 40, dy + 8) < 42;
        const rightCircle = Math.hypot(dx - 40, dy + 8) < 42;
        const centerCircle = Math.hypot(dx, dy + 10) < 32;

        // Stem
        const stemY = (y - (cy + 15)) / 65;
        const stemX = (x - cx) / 55;
        const inStem = stemY >= 0 && stemY <= 1.0 && Math.abs(stemX) <= (0.15 + stemY * stemY * 0.7);

        const inClub = topCircle || leftCircle || rightCircle || centerCircle || inStem;
        const idx = (y * size + x) * 4;
        if (inClub) {
          buf[idx] = 15; buf[idx + 1] = 23; buf[idx + 2] = 42; buf[idx + 3] = 255;
        } else {
          buf[idx + 3] = 0;
        }
      }
    }
    writePNG(path.join(texturesDir, 'suit_clubs.png'), size, size, buf);
  }

  // DIAMONDS ♦
  {
    const buf = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = Math.abs(x - cx) / 72;
        const dy = Math.abs(y - cy) / 100;
        const inDiamond = (dx + dy <= 1.0);

        const idx = (y * size + x) * 4;
        if (inDiamond) {
          buf[idx] = 225; buf[idx + 1] = 29; buf[idx + 2] = 45; buf[idx + 3] = 255;
        } else {
          buf[idx + 3] = 0;
        }
      }
    }
    writePNG(path.join(texturesDir, 'suit_diamonds.png'), size, size, buf);
  }
}

// 6. Card Backs (Yellow, Blue, Pink, Green, and Tilted Donkey Deck)
function generateCardBacks() {
  const w = 180, h = 260;

  const themes = [
    { name: 'yellow', r1: 250, g1: 204, b1: 21, r2: 202, g2: 138, b2: 4, br: 254, bg: 240, bb: 138 },
    { name: 'blue',   r1: 56,  g1: 189, b1: 248, r2: 2,   g2: 132, b2: 199, br: 186, bg: 230, bb: 253 },
    { name: 'pink',   r1: 244, g1: 114, b1: 182, r2: 219, g2: 39,  b2: 119, br: 251, bg: 207, bb: 232 },
    { name: 'green',  r1: 74,  g1: 222, b1: 128, r2: 22,  g2: 163, b2: 74,  br: 187, bg: 247, bb: 208 }
  ];

  themes.forEach(theme => {
    const buf = Buffer.alloc(w * h * 4);
    const cornerR = 18;

    for (let y = 0; y < h; y++) {
      const ny = y / h;
      for (let x = 0; x < w; x++) {
        const nx = x / w;

        // Rounded rect SDF
        const qx = Math.max(0, Math.abs(x - w / 2) - (w / 2 - cornerR));
        const qy = Math.max(0, Math.abs(y - h / 2) - (h / 2 - cornerR));
        const dist = Math.hypot(qx, qy) - cornerR;

        const idx = (y * w + x) * 4;
        if (dist > 0) {
          buf[idx + 3] = 0;
          continue;
        }

        // Card gradient
        let r = Math.round(theme.r1 * (1 - ny) + theme.r2 * ny);
        let g = Math.round(theme.g1 * (1 - ny) + theme.g2 * ny);
        let b = Math.round(theme.b1 * (1 - ny) + theme.b2 * ny);

        // 3D lip highlight on top edge
        if (y < 4) {
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 40);
        }

        // Inner border frame (inset 10px)
        const inFrameX = x >= 10 && x <= w - 10;
        const inFrameY = y >= 10 && y <= h - 10;
        const onFrameBorder = inFrameX && inFrameY && (x <= 13 || x >= w - 13 || y <= 13 || y >= h - 13);
        if (onFrameBorder) {
          r = theme.br; g = theme.bg; b = theme.bb;
        } else if (inFrameX && inFrameY) {
          // Subtle inner diamond crosshatch pattern
          const p = (x + y) % 24;
          const p2 = Math.abs(x - y) % 24;
          if (p < 2 || p2 < 2) {
            r = Math.min(255, r + 15);
            g = Math.min(255, g + 15);
            b = Math.min(255, b + 15);
          }
        }

        // Edge antialiasing
        let a = 255;
        if (dist > -1.5) {
          a = Math.round(255 * (-dist / 1.5));
        }

        buf[idx] = r;
        buf[idx + 1] = g;
        buf[idx + 2] = b;
        buf[idx + 3] = a;
      }
    }
    writePNG(path.join(texturesDir, `card_back_${theme.name}.png`), w, h, buf);
  });

  // Tilted Donkey Master Deck card back
  {
    const buf = Buffer.alloc(w * h * 4);
    const cornerR = 18;
    for (let y = 0; y < h; y++) {
      const ny = y / h;
      for (let x = 0; x < w; x++) {
        const qx = Math.max(0, Math.abs(x - w / 2) - (w / 2 - cornerR));
        const qy = Math.max(0, Math.abs(y - h / 2) - (h / 2 - cornerR));
        const dist = Math.hypot(qx, qy) - cornerR;

        const idx = (y * w + x) * 4;
        if (dist > 0) {
          buf[idx + 3] = 0;
          continue;
        }

        // Rich dark purple / brown pattern
        let r = Math.round(75 * (1 - ny) + 40 * ny);
        let g = Math.round(20 * (1 - ny) + 12 * ny);
        let b = Math.round(85 * (1 - ny) + 45 * ny);

        // Gold inner frame
        const inFrameX = x >= 10 && x <= w - 10;
        const inFrameY = y >= 10 && y <= h - 10;
        const onFrame = inFrameX && inFrameY && (x <= 13 || x >= w - 13 || y <= 13 || y >= h - 13);
        if (onFrame) {
          r = 234; g = 179; b = 8; // Gold frame
        } else if (inFrameX && inFrameY) {
          // Center oval emblem
          const ex = (x - w / 2) / 45;
          const ey = (y - h / 2) / 60;
          if (ex * ex + ey * ey < 1.0) {
            r = Math.min(255, r + 25);
            b = Math.min(255, b + 25);
          }
        }

        let a = 255;
        if (dist > -1.5) a = Math.round(255 * (-dist / 1.5));
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
      }
    }
    writePNG(path.join(texturesDir, 'deck_tilted_donkey.png'), w, h, buf);
  }
}

// 7. Turn Glow Ring
function generateTurnGlow() {
  const size = 192;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const innerR = 52, outerR = 86;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const idx = (y * size + x) * 4;

      if (dist < innerR - 8 || dist > outerR) {
        buf[idx + 3] = 0;
        continue;
      }

      // Neon lime green glow
      let alpha = 0;
      if (dist < innerR) {
        alpha = (dist - (innerR - 8)) / 8;
      } else {
        alpha = Math.pow((outerR - dist) / (outerR - innerR), 1.8);
      }

      buf[idx] = 74;      // r
      buf[idx + 1] = 222;  // g (bright green)
      buf[idx + 2] = 128;  // b
      buf[idx + 3] = Math.round(Math.min(255, alpha * 230));
    }
  }
  writePNG(path.join(texturesDir, 'turn_glow_ring.png'), size, size, buf);
}

// 8. Dealer Puck
function generateDealerPuck() {
  const size = 96;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = 42;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const idx = (y * size + x) * 4;

      if (dist > r) {
        buf[idx + 3] = 0;
        continue;
      }

      let cr, cg, cb;
      if (dist > 36) {
        // Outer dark purple rim
        cr = 60; cg = 20; cb = 90;
      } else if (dist > 28) {
        // White ring
        cr = 250; cg = 250; cb = 255;
      } else {
        // Inner purple dot
        cr = 120; cg = 40; cb = 160;
      }

      let a = 255;
      if (dist > r - 1.5) a = Math.round(255 * (r - dist) / 1.5);
      buf[idx] = cr; buf[idx + 1] = cg; buf[idx + 2] = cb; buf[idx + 3] = a;
    }
  }
  writePNG(path.join(texturesDir, 'puck_dealer.png'), size, size, buf);
}

// 9. Gift Icon
function generateGiftIcon() {
  const size = 128;
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x - cx);
      const dy = y - cy;
      const idx = (y * size + x) * 4;

      // Dark circle button background
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > 54) {
        buf[idx + 3] = 0;
        continue;
      }

      let cr = 35, cg = 25, cb = 45, ca = 255; // Dark button body

      // Gift Box Body: x in [-26, 26], y in [0, 32]
      const inBox = dx <= 26 && dy >= 0 && dy <= 32;
      // Gift Box Lid: x in [-30, 30], y in [-10, 0]
      const inLid = dx <= 30 && dy >= -10 && dy < 0;
      // Ribbon: dx <= 5
      const inRibbon = (inBox || inLid) && dx <= 5;
      // Bow: dy in [-24, -10]
      const inBow = Math.hypot(dx - 12, dy + 18) < 10 || Math.hypot(dx + 12, dy + 18) < 10;

      if (inRibbon || inBow) {
        cr = 250; cg = 204; cb = 21; // Yellow ribbon
      } else if (inBox || inLid) {
        cr = 240; cg = 245; cb = 255; // White gift box
      }

      if (dist > 52) ca = Math.round(255 * (54 - dist) / 2);

      buf[idx] = cr; buf[idx + 1] = cg; buf[idx + 2] = cb; buf[idx + 3] = ca;
    }
  }
  writePNG(path.join(texturesDir, 'icon_gift.png'), size, size, buf);
}

// 10. Golden Deal Pill Button
function generateDealButton() {
  const w = 240, h = 90;
  const buf = Buffer.alloc(w * h * 4);
  const cornerR = 38;

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const qx = Math.max(0, Math.abs(x - w / 2) - (w / 2 - cornerR));
      const qy = Math.max(0, Math.abs(y - h / 2) - (h / 2 - cornerR));
      const dist = Math.hypot(qx, qy) - cornerR;

      const idx = (y * w + x) * 4;
      if (dist > 0) {
        buf[idx + 3] = 0;
        continue;
      }

      // Golden gradient
      let r, g, b;
      if (ny < 0.65) {
        // Bright golden top
        const t = ny / 0.65;
        r = Math.round(254 * (1 - t) + 245 * t);
        g = Math.round(230 * (1 - t) + 180 * t);
        b = Math.round(100 * (1 - t) + 30 * t);
      } else {
        // 3D bottom bevel/lip
        const t = (ny - 0.65) / 0.35;
        r = Math.round(220 * (1 - t) + 185 * t);
        g = Math.round(145 * (1 - t) + 110 * t);
        b = Math.round(15 * (1 - t) + 10 * t);
      }

      // Outer border highlight
      if (dist > -2.5) {
        r = Math.round(r * 0.85);
        g = Math.round(g * 0.85);
        b = Math.round(b * 0.85);
      }

      let a = 255;
      if (dist > -1.5) a = Math.round(255 * (-dist / 1.5));
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
    }
  }
  writePNG(path.join(texturesDir, 'btn_deal_gold.png'), w, h, buf);
}

// 11. White Card Base (with soft rounded corners and subtle shadow/border)
function generateWhiteCardBase() {
  const w = 180, h = 260;
  const buf = Buffer.alloc(w * h * 4);
  const cornerR = 14;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const qx = Math.max(0, Math.abs(x - w / 2) - (w / 2 - cornerR));
      const qy = Math.max(0, Math.abs(y - h / 2) - (h / 2 - cornerR));
      const dist = Math.hypot(qx, qy) - cornerR;

      const idx = (y * w + x) * 4;
      if (dist > 0) {
        buf[idx + 3] = 0;
        continue;
      }

      // Crisp white card
      let r = 255, g = 255, b = 255;
      // Border outline (1.5px)
      if (dist > -2) {
        r = 210; g = 215; b = 225;
      }

      let a = 255;
      if (dist > -1.5) a = Math.round(255 * (-dist / 1.5));
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = a;
    }
  }
  writePNG(path.join(texturesDir, 'card_white_base.png'), w, h, buf);
}

console.log('Generating all Donkey Master textures...');
generateBackground();
generateWoodFooter();
generateNinjaAvatar();
generatePlayerAvatar();
generateSuitIcons();
generateCardBacks();
generateTurnGlow();
generateDealerPuck();
generateGiftIcon();
generateDealButton();
generateWhiteCardBase();
console.log('Done generating all Donkey Master textures!');
