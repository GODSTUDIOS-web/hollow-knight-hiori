import hioriManifest from './hioriFramesManifest.json';
import { FrameBoundsAdjustment, HioriAnimKey } from '../types';

export interface HioriAnimationDefinition {
  name: HioriAnimKey;
  displayName: string;
  frames: string[];
  frameWidth: number;
  frameHeight: number;
  fps: number;
  duration: number;
  loop: boolean;
  priority: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  renderScale: number;
}

type ManifestAnimEntry = {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  baselineAnchored: boolean;
  frames: string[];
};

const manifestAnims = hioriManifest.animations as Record<HioriAnimKey, ManifestAnimEntry>;

function makeAnim(
  name: HioriAnimKey,
  displayName: string,
  fps: number,
  loop: boolean,
  priority: number,
  options?: {
    frameIndices?: number[];
    anchorOffsetX?: number;
    anchorOffsetY?: number;
    renderScale?: number;
  }
): HioriAnimationDefinition {
  const entry = manifestAnims[name];
  const frames = options?.frameIndices
    ? options.frameIndices.map((idx) => entry.frames[idx]).filter(Boolean)
    : [...entry.frames];
  const duration = Number((frames.length / Math.max(1, fps)).toFixed(3));
  return {
    name,
    displayName,
    frames,
    frameWidth: entry.frameWidth,
    frameHeight: entry.frameHeight,
    fps,
    duration,
    loop,
    priority,
    anchorOffsetX: options?.anchorOffsetX ?? 0,
    anchorOffsetY: options?.anchorOffsetY ?? 4,
    renderScale: options?.renderScale ?? 0.66,
  };
}

export const HIORI_ANIMATIONS_CONFIG: Record<HioriAnimKey, HioriAnimationDefinition> = {
  idle: makeAnim('idle', 'Idle (Parado)', 7, true, 1),
  walk: makeAnim('walk', 'Walk (Caminhar)', 11, true, 2),
  run: makeAnim('run', 'Run (Correr)', 14, true, 3),
  jump: makeAnim('jump', 'Jump (Salto)', 14, false, 4, { anchorOffsetY: 6 }),
  fall: makeAnim('fall', 'Fall (Queda)', 10, true, 4, { anchorOffsetY: 6 }),
  land: makeAnim('land', 'Land (Aterrissagem)', 16, false, 5),
  attack1: makeAnim('attack1', 'Attack 1 — Corte Duplo', 18, false, 10, { anchorOffsetX: 20 }),
  attack2: makeAnim('attack2', 'Attack 2 — Corte Vertical', 14, false, 10, { anchorOffsetX: 12 }),
  attack3: makeAnim('attack3', 'Attack 3 — Giro 360°', 14, false, 10, { anchorOffsetX: 4 }),
  attack4: makeAnim('attack4', 'Attack 4 — Investida', 16, false, 10, { anchorOffsetX: 14 }),
  transformation: makeAnim('transformation', 'Transformação Sombria', 10, false, 12),
  shadow_dash: makeAnim('shadow_dash', 'Dash das Sombras', 18, false, 11, { anchorOffsetX: -4 }),
  // Cast uses first 2 frames on Hiori; frames 3-4 are used by the independent flying projectile
  shadow_projectile: makeAnim('shadow_projectile', 'Projétil Sombrio', 12, false, 11, {
    frameIndices: [0, 1],
    anchorOffsetX: 6,
  }),
  hurt: makeAnim('hurt', 'Hurt (Dano)', 14, false, 20),
  death: makeAnim('death', 'Death (Morte)', 8, false, 30),
  effects: makeAnim('effects', 'Efeitos Visuais', 12, false, 0),
};

export const PROJECTILE_SPRITE_FRAMES: string[] = [
  manifestAnims.shadow_projectile.frames[2],
  manifestAnims.shadow_projectile.frames[3],
];

export const EFFECT_SPRITE_FRAMES: Record<
  'dust' | 'slash1' | 'slash2' | 'darkFlame' | 'voidSpike' | 'shadowAura' | 'soulOrb',
  string
> = {
  dust: manifestAnims.effects.frames[0],
  slash1: manifestAnims.effects.frames[1],
  slash2: manifestAnims.effects.frames[2],
  darkFlame: manifestAnims.effects.frames[3],
  voidSpike: manifestAnims.effects.frames[4],
  shadowAura: manifestAnims.effects.frames[5],
  soulOrb: manifestAnims.effects.frames[6],
};

export const DEFAULT_FRAME_ADJUSTMENT: FrameBoundsAdjustment = {
  offsetX: 0,
  offsetY: 0,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  cropBottom: 0,
};

const ADJUSTMENTS_STORAGE_KEY = 'hiori_frame_adjustments_v1';

export type FrameAdjustmentMap = Record<string, FrameBoundsAdjustment>;

export function loadFrameAdjustments(): FrameAdjustmentMap {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(ADJUSTMENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FrameAdjustmentMap) : {};
  } catch {
    return {};
  }
}

export function saveFrameAdjustments(map: FrameAdjustmentMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(ADJUSTMENTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}
