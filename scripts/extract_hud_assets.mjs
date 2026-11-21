import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_IMAGE = 'public/assets/aistudio/image_c0746e61.png';
const OUTPUT_ROOT = 'public/assets/ui/hud';
const VERIFY_SHEET = '.playwright-cli/hud_verify_sheet.png';

const W = 1672;
const H = 941;

const raw = execSync(`convert ${SOURCE_IMAGE} -depth 8 rgba:-`, {
  maxBuffer: 25 * 1024 * 1024,
});

function getPx(x, y) {
  const i = (y * W + x) * 4;
  return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
}

function writeRgbaPng(buf, w, h, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  execFileSync('convert', ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', `png32:${outPath}`], {
    input: buf,
  });
}

/**
 * Flood-fills black background from perimeter with smooth alpha feathering
 * so silver/bone ornaments have zero black halo over any game scene.
 */
function removeBlackBackground(buf, w, h, bgThreshold = 20) {
  const isBg = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);
  const queue = [];

  const isBlackCandidate = (idx) => {
    const o = idx * 4;
    const maxC = Math.max(buf[o], buf[o + 1], buf[o + 2]);
    return buf[o + 3] < 40 || maxC <= bgThreshold;
  };

  const pushSeed = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBlackCandidate(idx)) {
      isBg[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < w; x++) {
    pushSeed(x, 0);
    pushSeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushSeed(0, y);
    pushSeed(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx / w) | 0;
    const nbs = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of nbs) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (visited[nIdx]) continue;
      visited[nIdx] = 1;
      if (isBlackCandidate(nIdx)) {
        isBg[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (isBg[i]) {
      buf[o] = 0;
      buf[o + 1] = 0;
      buf[o + 2] = 0;
      buf[o + 3] = 0;
      continue;
    }

    const x = i % w;
    const y = (i / w) | 0;
    let touchesBg = false;
    if (x > 0 && isBg[i - 1]) touchesBg = true;
    else if (x < w - 1 && isBg[i + 1]) touchesBg = true;
    else if (y > 0 && isBg[i - w]) touchesBg = true;
    else if (y < h - 1 && isBg[i + w]) touchesBg = true;

    if (touchesBg) {
      const lum = Math.max(buf[o], buf[o + 1], buf[o + 2]);
      if (lum < 72) {
        buf[o + 3] = Math.min(buf[o + 3], Math.max(24, Math.round((lum / 72) * 255)));
      }
    }
  }
}

function cropRegion(x0, y0, x1, y1) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPx(x0 + x, y0 + y);
      const o = (y * w + x) * 4;
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = a;
    }
  }
  return { buf, w, h };
}

// 1. Extract Skull Mask (using Skull 3 [444..500, 54..122] which is completely isolated)
{
  const { buf, w, h } = cropRegion(444, 54, 500, 122);
  // Clear horizontal thread stubs on left/right edges before flood-fill
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x <= 2 || x >= w - 3) {
        const o = (y * w + x) * 4;
        buf[o] = 0;
        buf[o + 1] = 0;
        buf[o + 2] = 0;
        buf[o + 3] = 0;
      }
    }
  }
  removeBlackBackground(buf, w, h, 24);
  writeRgbaPng(buf, w, h, path.join(OUTPUT_ROOT, 'health/mask_full.png'));

  // Create darkened/empty mask variant preserving exact skull silhouette and opaque dark sockets
  const emptyBuf = Buffer.from(buf);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (emptyBuf[o + 3] === 0) continue;
    const lum = (emptyBuf[o] + emptyBuf[o + 1] + emptyBuf[o + 2]) / 3;
    if (lum > 100) {
      // Opaque dark charcoal skull shell with subtle slate rim
      emptyBuf[o] = Math.round(emptyBuf[o] * 0.16 + 10);
      emptyBuf[o + 1] = Math.round(emptyBuf[o + 1] * 0.17 + 11);
      emptyBuf[o + 2] = Math.round(emptyBuf[o + 2] * 0.21 + 14);
    } else {
      emptyBuf[o] = 10;
      emptyBuf[o + 1] = 11;
      emptyBuf[o + 2] = 15;
    }
  }
  writeRgbaPng(emptyBuf, w, h, path.join(OUTPUT_ROOT, 'health/mask_empty.png'));
}

// 2. Extract Ornamental Orb Frame & Horizontal Bar Frame + Combined Top-Left Frame
// Combined frame box: x=[44..771], y=[28..240] (728 x 213)
{
  const fx0 = 44;
  const fy0 = 28;
  const fx1 = 771;
  const fy1 = 240;
  const { buf, w, h } = cropRegion(fx0, fy0, fx1, fy1);

  // Sample the subtle horizontal thread between skull 2 & 3 (global x=362, y=85..92)
  const threadCol = [];
  for (let y = 85; y <= 92; y++) {
    threadCol.push(getPx(362, y));
  }

  // Clear the 5 static skull positions (global x=298..645, y=54..122) and restore the thin bone thread
  for (let gy = 54; gy <= 122; gy++) {
    for (let gx = 298; gx <= 645; gx++) {
      const lx = gx - fx0;
      const ly = gy - fy0;
      const o = (ly * w + lx) * 4;
      if (gy >= 85 && gy <= 92) {
        const [tr, tg, tb, ta] = threadCol[gy - 85];
        buf[o] = tr;
        buf[o + 1] = tg;
        buf[o + 2] = tb;
        buf[o + 3] = ta;
      } else {
        buf[o] = 0;
        buf[o + 1] = 0;
        buf[o + 2] = 0;
        buf[o + 3] = 0;
      }
    }
  }

  removeBlackBackground(buf, w, h, 20);

  // Clear interior of Orb circle (global cx=188, cy=134, r=61.5) with soft 2px anti-aliased edge
  const orbCx = 188 - fx0;
  const orbCy = 134 - fy0;
  const orbR = 62.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - orbCx, y - orbCy);
      if (dist <= orbR) {
        const o = (y * w + x) * 4;
        if (dist <= orbR - 2) {
          buf[o] = 0;
          buf[o + 1] = 0;
          buf[o + 2] = 0;
          buf[o + 3] = 0;
        } else {
          const factor = (dist - (orbR - 2)) / 2;
          buf[o + 3] = Math.round(buf[o + 3] * factor);
        }
      }
    }
  }

  // Clear interior of Horizontal Energy Bar slot (global x=284..692, y=143..157)
  const barX0 = 284 - fx0;
  const barX1 = 692 - fx0;
  const barY0 = 143 - fy0;
  const barY1 = 157 - fy0;
  for (let y = barY0; y <= barY1; y++) {
    for (let x = barX0; x <= barX1; x++) {
      const o = (y * w + x) * 4;
      buf[o] = 0;
      buf[o + 1] = 0;
      buf[o + 2] = 0;
      buf[o + 3] = 0;
    }
  }

  writeRgbaPng(buf, w, h, path.join(OUTPUT_ROOT, 'energy/hud_frame.png'));

  // Also export separate orb_frame.png (x=0..236) and bar_frame.png (x=220..727, y=94..160)
  const orbW = 238;
  const orbBuf = Buffer.alloc(orbW * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < orbW; x++) {
      const src = (y * w + x) * 4;
      const dst = (y * orbW + x) * 4;
      orbBuf[dst] = buf[src];
      orbBuf[dst + 1] = buf[src + 1];
      orbBuf[dst + 2] = buf[src + 2];
      orbBuf[dst + 3] = buf[src + 3];
    }
  }
  writeRgbaPng(orbBuf, orbW, h, path.join(OUTPUT_ROOT, 'energy/orb_frame.png'));

  const bfX0 = 216;
  const bfY0 = 84;
  const bfW = w - bfX0;
  const bfH = 88;
  const barBuf = Buffer.alloc(bfW * bfH * 4);
  for (let y = 0; y < bfH; y++) {
    for (let x = 0; x < bfW; x++) {
      const src = ((bfY0 + y) * w + (bfX0 + x)) * 4;
      const dst = (y * bfW + x) * 4;
      barBuf[dst] = buf[src];
      barBuf[dst + 1] = buf[src + 1];
      barBuf[dst + 2] = buf[src + 2];
      barBuf[dst + 3] = buf[src + 3];
    }
  }
  writeRgbaPng(barBuf, bfW, bfH, path.join(OUTPUT_ROOT, 'energy/bar_frame.png'));
}

// 3. Extract Crystal Currency Icon (global x=[1483..1541], y=[52..126])
{
  const { buf, w, h } = cropRegion(1483, 52, 1541, 126);
  removeBlackBackground(buf, w, h, 20);
  writeRgbaPng(buf, w, h, path.join(OUTPUT_ROOT, 'currency/crystal_icon.png'));
}

// 4. Generate subtle radial glow & impact burst PNGs under effects/
{
  const size = 160;
  const glowBuf = Buffer.alloc(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - half, y - half) / half;
      const a = d >= 1 ? 0 : Math.round(Math.pow(1 - d, 2.2) * 210);
      const o = (y * size + x) * 4;
      glowBuf[o] = 240;
      glowBuf[o + 1] = 244;
      glowBuf[o + 2] = 255;
      glowBuf[o + 3] = a;
    }
  }
  writeRgbaPng(glowBuf, size, size, path.join(OUTPUT_ROOT, 'effects/soul_glow.png'));
}

// 5. Generate verification contact sheet
execSync(
  `convert -background "#1f2430" -size 900x420 xc:"#1f2430" ` +
    `\\( ${OUTPUT_ROOT}/energy/hud_frame.png -geometry +20+20 \\) -composite ` +
    `\\( ${OUTPUT_ROOT}/health/mask_full.png -geometry +276+48 \\) -composite ` +
    `\\( ${OUTPUT_ROOT}/health/mask_empty.png -geometry +349+48 \\) -composite ` +
    `\\( ${OUTPUT_ROOT}/currency/crystal_icon.png -geometry +790+46 \\) -composite ` +
    `\\( ${OUTPUT_ROOT}/energy/orb_frame.png -geometry +20+250 \\) -composite ` +
    `\\( ${OUTPUT_ROOT}/energy/bar_frame.png -geometry +290+270 \\) -composite ` +
    `${VERIFY_SHEET}`
);
console.log('HUD assets extracted successfully! Verify sheet:', VERIFY_SHEET);
