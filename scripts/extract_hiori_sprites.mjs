import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_IMAGE = 'public/assets/aistudio/image_22a1a94b.png';
const OUTPUT_ROOT = 'public/assets/characters/hiori';
const MANIFEST_PATH = 'src/game/data/hioriFramesManifest.json';
const VERIFY_SHEET_PATH = '.playwright-cli/hiori_verify_sheet.png';

const W = 1536;
const H = 1024;

// Panel definitions calibrated from pixel inspection of image_22a1a94b.png
const PANELS = [
  {
    key: 'idle',
    dir: 'idle',
    x0: 402,
    y0: 44,
    x1: 902,
    y1: 168,
    count: 6,
    baselineAnchored: true,
  },
  {
    key: 'walk',
    dir: 'walk',
    x0: 922,
    y0: 44,
    x1: 1522,
    y1: 168,
    count: 7,
    baselineAnchored: true,
  },
  {
    key: 'run',
    dir: 'run',
    x0: 12,
    y0: 282,
    x1: 682,
    y1: 371,
    count: 6,
    baselineAnchored: true,
  },
  {
    key: 'jump',
    dir: 'jump',
    x0: 706,
    y0: 254,
    x1: 1172,
    y1: 371,
    count: 5,
    baselineAnchored: false,
  },
  {
    key: 'fall',
    dir: 'fall',
    x0: 1193,
    y0: 254,
    x1: 1520,
    y1: 371,
    count: 4,
    baselineAnchored: false,
    explicitSplits: [1193, 1272, 1356, 1437, 1520],
  },
  {
    key: 'land',
    dir: 'land',
    x0: 12,
    y0: 428,
    x1: 404,
    y1: 517,
    count: 4,
    baselineAnchored: true,
  },
  {
    key: 'attack1',
    dir: 'attacks/attack1',
    x0: 424,
    y0: 428,
    x1: 1520,
    y1: 518,
    count: 6,
    baselineAnchored: true,
  },
  {
    key: 'attack2',
    dir: 'attacks/attack2',
    x0: 12,
    y0: 578,
    x1: 468,
    y1: 680,
    count: 3,
    baselineAnchored: true,
    explicitSplits: [12, 152, 305, 469],
  },
  {
    key: 'attack3',
    dir: 'attacks/attack3',
    x0: 488,
    y0: 578,
    x1: 1018,
    y1: 680,
    count: 4,
    baselineAnchored: true,
  },
  {
    key: 'attack4',
    dir: 'attacks/attack4',
    x0: 1038,
    y0: 578,
    x1: 1520,
    y1: 680,
    count: 4,
    baselineAnchored: true,
  },
  {
    key: 'transformation',
    dir: 'special/transformation',
    x0: 14,
    y0: 740,
    x1: 562,
    y1: 853,
    count: 5,
    baselineAnchored: true,
    explicitSplits: [14, 86, 174, 286, 418, 562],
    bgTolerance: 42,
  },
  {
    key: 'shadow_dash',
    dir: 'special/shadow_dash',
    x0: 583,
    y0: 740,
    x1: 1055,
    y1: 853,
    count: 4,
    baselineAnchored: true,
  },
  {
    key: 'shadow_projectile',
    dir: 'special/shadow_projectile',
    x0: 1075,
    y0: 740,
    x1: 1520,
    y1: 853,
    count: 4,
    baselineAnchored: false,
    explicitSplits: [1075, 1164, 1284, 1426, 1520],
  },
  {
    key: 'hurt',
    dir: 'hurt',
    x0: 12,
    y0: 912,
    x1: 328,
    y1: 995,
    count: 4,
    baselineAnchored: true,
  },
  {
    key: 'death',
    dir: 'death',
    x0: 350,
    y0: 912,
    x1: 812,
    y1: 995,
    count: 5,
    baselineAnchored: true,
  },
  {
    key: 'effects',
    dir: 'effects',
    x0: 836,
    y0: 912,
    x1: 1520,
    y1: 995,
    count: 7,
    baselineAnchored: false,
    explicitSplits: [836, 944, 1028, 1156, 1286, 1360, 1436, 1520],
  },
];

const raw = execSync(`convert ${SOURCE_IMAGE} -depth 8 rgba:-`, {
  maxBuffer: 20 * 1024 * 1024,
});

function getPx(x, y) {
  const i = (y * W + x) * 4;
  return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
}

function computeRowBackground(panel) {
  const rowBg = {};
  for (let y = panel.y0; y <= panel.y1; y++) {
    const rs = [];
    const gs = [];
    const bs = [];
    for (let x = panel.x0; x <= panel.x1; x += 2) {
      const [r, g, b, a] = getPx(x, y);
      if (a < 180) continue;
      const maxC = Math.max(r, g, b);
      if (maxC > 75 || b - g > 20) continue;
      rs.push(r);
      gs.push(g);
      bs.push(b);
    }
    if (rs.length === 0) {
      rowBg[y] = [24, 23, 30];
    } else {
      rs.sort((a, b) => a - b);
      gs.sort((a, b) => a - b);
      bs.sort((a, b) => a - b);
      const mid = rs.length >> 1;
      rowBg[y] = [rs[mid], gs[mid], bs[mid]];
    }
  }
  return rowBg;
}

function findFrameSplits(panel, rowBg) {
  if (panel.explicitSplits) return panel.explicitSplits;

  const colScore = [];
  for (let x = panel.x0; x <= panel.x1; x++) {
    let score = 0;
    for (let y = panel.y0; y <= panel.y1; y++) {
      const [r, g, b] = getPx(x, y);
      const bg = rowBg[y];
      const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
      if (dist > 26 || Math.max(r, g, b) < 12) score++;
    }
    colScore.push(score);
  }

  const w = panel.x1 - panel.x0 + 1;
  const splits = [panel.x0];
  for (let k = 1; k < panel.count; k++) {
    const ideal = Math.round((w * k) / panel.count);
    const searchR = Math.round((w / panel.count) * 0.34);
    let bestIdx = ideal;
    let bestVal = 1e9;
    for (let idx = Math.max(4, ideal - searchR); idx <= Math.min(w - 5, ideal + searchR); idx++) {
      const val = colScore[idx] * 100 + Math.abs(idx - ideal) * 0.6;
      if (val < bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    }
    splits.push(panel.x0 + bestIdx);
  }
  splits.push(panel.x1 + 1);
  return splits;
}

function extractFrameCell(fx0, fy0, fx1, fy1, rowBg, panel) {
  // Trim inward when adjacent to panel/divider lines so 1px divider seams don't leak into cells
  const seamMargin = panel.key === 'transformation' || panel.key === 'fall' ? 4 : 2;
  const padCellLeft = fx0 > panel.x0 ? seamMargin : 0;
  const padCellRight = fx1 < panel.x1 ? seamMargin : 0;
  const xStart = fx0 + padCellLeft;
  const xEnd = fx1 - padCellRight;
  const cw = Math.max(1, xEnd - xStart);
  const ch = fy1 - fy0 + 1;

  const isBg = new Uint8Array(cw * ch);
  const visited = new Uint8Array(cw * ch);
  const tolMain = panel.bgTolerance ?? 34;

  const isBgCandidate = (lx, ly, tol) => {
    const x = xStart + lx;
    const y = fy0 + ly;
    const [r, g, b, a] = getPx(x, y);
    if (a < 60) return true;
    const bg = rowBg[y];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const purpleScore = r + b - 2 * g;

    // Preserve pure black ink outlines, bright horns/mask/slashes, and vivid purple aura
    if (maxC <= 13) return false;
    if (maxC > 68) return false;
    if (panel.key === 'transformation') {
      if (b - g > 28 || purpleScore > 48 || sat > 36) return false;
    } else {
      if (b - g > 18 || purpleScore > 26 || sat > 22) return false;
    }

    const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
    return dist <= tol;
  };

  // Perimeter flood-fill removes outer background while keeping interior cloak/dark areas intact
  const queue = [];
  const pushSeed = (lx, ly) => {
    const idx = ly * cw + lx;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isBgCandidate(lx, ly, tolMain + 4)) {
      isBg[idx] = 1;
      queue.push(idx);
    }
  };

  for (let lx = 0; lx < cw; lx++) {
    pushSeed(lx, 0);
    pushSeed(lx, 1);
    pushSeed(lx, ch - 1);
  }
  for (let ly = 0; ly < ch; ly++) {
    pushSeed(0, ly);
    pushSeed(cw - 1, ly);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const lx = idx % cw;
    const ly = (idx / cw) | 0;
    const neighbors = [
      [lx - 1, ly],
      [lx + 1, ly],
      [lx, ly - 1],
      [lx, ly + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
      const nIdx = ny * cw + nx;
      if (visited[nIdx]) continue;
      visited[nIdx] = 1;
      if (isBgCandidate(nx, ny, tolMain)) {
        isBg[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Clear isolated enclosed background pockets between legs/arms/flames
  for (let ly = 2; ly < ch - 2; ly++) {
    for (let lx = 2; lx < cw - 2; lx++) {
      const idx = ly * cw + lx;
      if (isBg[idx]) continue;
      const [r, g, b] = getPx(xStart + lx, fy0 + ly);
      const bg = rowBg[fy0 + ly];
      const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
      const maxC = Math.max(r, g, b);
      if (dist <= 13 && maxC >= 18 && b - g <= 11) {
        isBg[idx] = 1;
      }
    }
  }

  // Remove isolated 1-2px specks disconnected from main body
  const compVisited = new Uint8Array(cw * ch);
  for (let ly = 0; ly < ch; ly++) {
    for (let lx = 0; lx < cw; lx++) {
      const startIdx = ly * cw + lx;
      if (isBg[startIdx] || compVisited[startIdx]) continue;
      const comp = [startIdx];
      compVisited[startIdx] = 1;
      let cHead = 0;
      while (cHead < comp.length) {
        const cur = comp[cHead++];
        const cx = cur % cw;
        const cy = (cur / cw) | 0;
        const nbs = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
          const nIdx = ny * cw + nx;
          if (!isBg[nIdx] && !compVisited[nIdx]) {
            compVisited[nIdx] = 1;
            comp.push(nIdx);
          }
        }
      }
      // Drop tiny stray dust specs (< 4 pixels)
      if (comp.length < 4) {
        for (const idx of comp) isBg[idx] = 1;
      }
    }
  }

  const out = Buffer.alloc(cw * ch * 4);
  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;

  for (let ly = 0; ly < ch; ly++) {
    for (let lx = 0; lx < cw; lx++) {
      const idx = ly * cw + lx;
      const oi = idx * 4;
      if (isBg[idx]) {
        out[oi] = 0;
        out[oi + 1] = 0;
        out[oi + 2] = 0;
        out[oi + 3] = 0;
        continue;
      }

      const [r, g, b, a] = getPx(xStart + lx, fy0 + ly);
      const bg = rowBg[fy0 + ly];
      const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);

      let touchesBg = false;
      if (lx > 0 && isBg[idx - 1]) touchesBg = true;
      else if (lx < cw - 1 && isBg[idx + 1]) touchesBg = true;
      else if (ly > 0 && isBg[idx - cw]) touchesBg = true;
      else if (ly < ch - 1 && isBg[idx + cw]) touchesBg = true;

      let finalA = a;
      if (touchesBg && dist < 48 && Math.max(r, g, b) > 16) {
        finalA = Math.min(a, Math.max(50, Math.round((dist / 48) * 255)));
      }

      out[oi] = r;
      out[oi + 1] = g;
      out[oi + 2] = b;
      out[oi + 3] = finalA;

      if (finalA > 24) {
        if (lx < minX) minX = lx;
        if (lx > maxX) maxX = lx;
        if (ly < minY) minY = ly;
        if (ly > maxY) maxY = ly;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    minX = 0;
    minY = 0;
    maxX = cw - 1;
    maxY = ch - 1;
  }

  return {
    cw,
    ch,
    rgba: out,
    bbox: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
  };
}

function writeRgbaPng(rgba, width, height, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  execFileSync(
    'convert',
    ['-size', `${width}x${height}`, '-depth', '8', 'rgba:-', `png32:${outPath}`],
    { input: rgba }
  );
}

// Clear old generated PNGs before writing refined frames
fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });

const manifest = {
  character: 'hiori',
  sourceImage: SOURCE_IMAGE,
  animations: {},
};

const verifyRows = [];

for (const panel of PANELS) {
  const rowBg = computeRowBackground(panel);
  const splits = findFrameSplits(panel, rowBg);
  const extracted = [];

  for (let i = 0; i < splits.length - 1; i++) {
    const fx0 = splits[i];
    const fx1 = splits[i + 1];
    const cell = extractFrameCell(fx0, panel.y0, fx1, panel.y1, rowBg, panel);
    extracted.push({ ...cell, fx0, fx1 });
  }

  const maxTightW = Math.max(...extracted.map((e) => e.bbox.width));
  const maxTightH = Math.max(...extracted.map((e) => e.bbox.height));
  const padX = 8;
  const padY = 6;
  const frameWidth = maxTightW + padX * 2;
  const frameHeight = panel.baselineAnchored
    ? Math.max(...extracted.map((e) => e.ch - e.bbox.minY)) + padY
    : maxTightH + padY * 2;

  const frameUrls = [];
  const frameFiles = [];
  const rowFramesForVerify = [];

  for (let i = 0; i < extracted.length; i++) {
    const item = extracted[i];
    const canvas = Buffer.alloc(frameWidth * frameHeight * 4);
    const tightW = item.bbox.width;
    const tightH = item.bbox.height;

    const destX = Math.floor((frameWidth - tightW) / 2);
    const destY = panel.baselineAnchored
      ? frameHeight - padY - (item.ch - item.bbox.minY)
      : Math.floor((frameHeight - tightH) / 2);

    for (let sy = item.bbox.minY; sy <= item.bbox.maxY; sy++) {
      for (let sx = item.bbox.minX; sx <= item.bbox.maxX; sx++) {
        const dx = destX + (sx - item.bbox.minX);
        const dy = destY + (sy - item.bbox.minY);
        if (dx < 0 || dx >= frameWidth || dy < 0 || dy >= frameHeight) continue;
        const si = (sy * item.cw + sx) * 4;
        const di = (dy * frameWidth + dx) * 4;
        canvas[di] = item.rgba[si];
        canvas[di + 1] = item.rgba[si + 1];
        canvas[di + 2] = item.rgba[si + 2];
        canvas[di + 3] = item.rgba[si + 3];
      }
    }

    const idxStr = String(i + 1).padStart(2, '0');
    const fileName = `${panel.key}_${idxStr}.png`;
    const relPath = path.join(panel.dir, fileName);
    const outPath = path.join(OUTPUT_ROOT, relPath);
    writeRgbaPng(canvas, frameWidth, frameHeight, outPath);

    const publicUrl = `/assets/characters/hiori/${relPath.replaceAll('\\', '/')}`;
    frameUrls.push(publicUrl);
    frameFiles.push({
      url: publicUrl,
      sourceBounds: { x: item.fx0, y: panel.y0, width: item.fx1 - item.fx0, height: panel.y1 - panel.y0 + 1 },
    });
    rowFramesForVerify.push({ rgba: canvas, w: frameWidth, h: frameHeight });
  }

  manifest.animations[panel.key] = {
    frameWidth,
    frameHeight,
    frameCount: frameUrls.length,
    baselineAnchored: panel.baselineAnchored,
    frames: frameUrls,
    sourcePanel: { x0: panel.x0, y0: panel.y0, x1: panel.x1, y1: panel.y1 },
    frameMeta: frameFiles,
  };

  verifyRows.push({ key: panel.key, frames: rowFramesForVerify, frameWidth, frameHeight });
  console.log(
    `Extracted ${panel.key.padEnd(18)} -> ${frameUrls.length} frames (${frameWidth}x${frameHeight})`
  );
}

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

const sheetW = 1480;
const rowGap = 14;
const totalSheetH = verifyRows.reduce((acc, r) => acc + r.frameHeight + rowGap, 24);
const sheetBuf = Buffer.alloc(sheetW * totalSheetH * 4);

for (let y = 0; y < totalSheetH; y++) {
  for (let x = 0; x < sheetW; x++) {
    const checker = ((x >> 3) + (y >> 3)) % 2 === 0 ? 115 : 95;
    const i = (y * sheetW + x) * 4;
    sheetBuf[i] = checker;
    sheetBuf[i + 1] = checker + 2;
    sheetBuf[i + 2] = checker + 6;
    sheetBuf[i + 3] = 255;
  }
}

let curY = 12;
for (const row of verifyRows) {
  let curX = 12;
  for (const fr of row.frames) {
    for (let y = 0; y < fr.h; y++) {
      for (let x = 0; x < fr.w; x++) {
        const dx = curX + x;
        const dy = curY + y;
        if (dx >= sheetW || dy >= totalSheetH) continue;
        const si = (y * fr.w + x) * 4;
        const a = fr.rgba[si + 3] / 255;
        if (a <= 0) continue;
        const di = (dy * sheetW + dx) * 4;
        sheetBuf[di] = Math.round(fr.rgba[si] * a + sheetBuf[di] * (1 - a));
        sheetBuf[di + 1] = Math.round(fr.rgba[si + 1] * a + sheetBuf[di + 1] * (1 - a));
        sheetBuf[di + 2] = Math.round(fr.rgba[si + 2] * a + sheetBuf[di + 2] * (1 - a));
      }
    }
    curX += fr.w + 8;
  }
  curY += row.frameHeight + rowGap;
}

writeRgbaPng(sheetBuf, sheetW, totalSheetH, VERIFY_SHEET_PATH);
console.log('Done! Verify sheet updated at', VERIFY_SHEET_PATH);
