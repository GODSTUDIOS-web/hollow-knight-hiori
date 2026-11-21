import { CollisionSystem } from './CollisionSystem';
import { EFFECT_SPRITE_FRAMES, PROJECTILE_SPRITE_FRAMES } from './data/hioriAnimationsConfig';
import { HitboxSystem } from './HitboxSystem';
import { ParticlePool } from './ParticlePool';
import { Rect, StagePlatform } from './types';

export interface ShadowProjectile {
  id: string;
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  facing: 1 | -1;
  damage: number;
  life: number;
  maxLife: number;
  animTimer: number;
  hitTargetIds: Set<string>;
}

export interface WorldEffectSprite {
  active: boolean;
  spriteUrl: string;
  x: number;
  y: number;
  facing: 1 | -1;
  scale: number;
  life: number;
  maxLife: number;
}

const MAX_PROJECTILES = 12;
const MAX_EFFECT_SPRITES = 24;

export class ProjectileSystem {
  private projectiles: ShadowProjectile[] = [];
  private effectSprites: WorldEffectSprite[] = [];
  private sequence = 0;
  private effectCursor = 0;
  private imageCache = new Map<string, HTMLImageElement>();

  constructor() {
    for (let i = 0; i < MAX_EFFECT_SPRITES; i++) {
      this.effectSprites.push({
        active: false,
        spriteUrl: '',
        x: 0,
        y: 0,
        facing: 1,
        scale: 0.65,
        life: 0,
        maxLife: 0.25,
      });
    }

    if (typeof Image !== 'undefined') {
      for (const url of PROJECTILE_SPRITE_FRAMES) {
        this.preloadImage(url);
      }
      for (const url of Object.values(EFFECT_SPRITE_FRAMES)) {
        this.preloadImage(url);
      }
    }
  }

  private preloadImage(url: string): void {
    if (this.imageCache.has(url)) return;
    const img = new Image();
    img.src = url;
    this.imageCache.set(url, img);
  }

  public clear(): void {
    this.projectiles.length = 0;
    for (let i = 0; i < this.effectSprites.length; i++) {
      this.effectSprites[i].active = false;
    }
  }

  public spawnShadowProjectile(
    x: number,
    y: number,
    facing: 1 | -1,
    damageMultiplier = 1
  ): ShadowProjectile {
    this.sequence++;
    const proj: ShadowProjectile = {
      id: `shadow-proj-${this.sequence}`,
      active: true,
      x: x - 24,
      y: y - 16,
      width: 48,
      height: 32,
      vx: facing * 560,
      facing,
      damage: Math.round(22 * damageMultiplier),
      life: 1.75,
      maxLife: 1.75,
      animTimer: 0,
      hitTargetIds: new Set<string>(),
    };
    if (this.projectiles.length >= MAX_PROJECTILES) {
      this.projectiles.shift();
    }
    this.projectiles.push(proj);
    return proj;
  }

  public spawnEffectSprite(
    key: keyof typeof EFFECT_SPRITE_FRAMES,
    x: number,
    y: number,
    facing: 1 | -1 = 1,
    scale = 0.64,
    duration = 0.24
  ): void {
    const spriteUrl = EFFECT_SPRITE_FRAMES[key];
    if (!spriteUrl) return;
    const eff = this.effectSprites[this.effectCursor];
    this.effectCursor = (this.effectCursor + 1) % MAX_EFFECT_SPRITES;
    eff.active = true;
    eff.spriteUrl = spriteUrl;
    eff.x = x;
    eff.y = y;
    eff.facing = facing;
    eff.scale = scale;
    eff.life = duration;
    eff.maxLife = duration;
  }

  public getActiveProjectiles(): readonly ShadowProjectile[] {
    return this.projectiles;
  }

  public update(
    dt: number,
    platforms: StagePlatform[],
    hitboxSystem: HitboxSystem,
    particles: ParticlePool
  ): void {
    for (let i = this.effectSprites.length - 1; i >= 0; i--) {
      const eff = this.effectSprites[i];
      if (!eff.active) continue;
      eff.life -= dt;
      if (eff.life <= 0) {
        eff.active = false;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.life -= dt;
      p.animTimer += dt;
      p.x += p.vx * dt;

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const rect: Rect = { x: p.x, y: p.y, width: p.width, height: p.height };
      let hitWall = false;
      for (let j = 0; j < platforms.length; j++) {
        const plat = platforms[j];
        if (plat.oneWay) continue;
        if (CollisionSystem.intersects(rect, plat)) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        const cx = p.x + p.width * 0.5;
        const cy = p.y + p.height * 0.5;
        particles.spawnBurst(cx, cy, 12, '#a855f7', 60, 220, 120, -p.facing * 80);
        this.spawnEffectSprite('soulOrb', cx, cy, p.facing, 0.55, 0.2);
        this.projectiles.splice(i, 1);
        continue;
      }

      hitboxSystem.registerHitbox({
        id: p.id,
        owner: 'player',
        ownerId: 'player',
        rect,
        damage: p.damage,
        knockbackX: 280,
        knockbackY: -120,
        facing: p.facing,
        hitstop: 0.04,
        shakeTrauma: 0.3,
        pogoForce: 0,
        hitTargetIds: p.hitTargetIds,
      });
    }
  }

  /**
   * Burst and retire any projectile that connected with an enemy target this frame.
   */
  public resolveImpacts(hitBoxIds: string[], particles: ParticlePool): void {
    if (hitBoxIds.length === 0) return;
    const hitSet = new Set(hitBoxIds);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!hitSet.has(p.id)) continue;
      const cx = p.x + p.width * 0.5;
      const cy = p.y + p.height * 0.5;
      particles.spawnBurst(cx, cy, 16, '#c084fc', 80, 260, 140, -p.facing * 60);
      this.spawnEffectSprite('darkFlame', cx, cy, p.facing, 0.62, 0.24);
      this.projectiles.splice(i, 1);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Render active effect sprites
    for (let i = 0; i < this.effectSprites.length; i++) {
      const eff = this.effectSprites[i];
      if (!eff.active) continue;
      const img = this.imageCache.get(eff.spriteUrl);
      if (!img || !img.complete || img.naturalWidth <= 0) continue;

      const t = 1 - eff.life / eff.maxLife;
      const alpha = Math.max(0, 1 - t * t);
      const scale = eff.scale * (0.92 + t * 0.22);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(eff.x, eff.y);
      ctx.scale(eff.facing, 1);
      ctx.drawImage(img, -dw * 0.5, -dh * 0.5, dw, dh);
      ctx.restore();
    }

    // Render flying shadow projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (!p.active) continue;

      const frameIndex = Math.floor(p.animTimer * 14) % PROJECTILE_SPRITE_FRAMES.length;
      const url = PROJECTILE_SPRITE_FRAMES[frameIndex];
      const img = this.imageCache.get(url);

      const cx = p.x + p.width * 0.5;
      const cy = p.y + p.height * 0.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(p.facing, 1);

      if (img && img.complete && img.naturalWidth > 0) {
        const scale = 0.66;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, -dw * 0.5, -dh * 0.5, dw, dh);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
