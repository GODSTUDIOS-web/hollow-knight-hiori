import {
  DEFAULT_FRAME_ADJUSTMENT,
  EFFECT_SPRITE_FRAMES,
  FrameAdjustmentMap,
  HIORI_ANIMATIONS_CONFIG,
  HioriAnimationDefinition,
  loadFrameAdjustments,
  PROJECTILE_SPRITE_FRAMES,
  saveFrameAdjustments,
} from './data/hioriAnimationsConfig';
import { FrameBoundsAdjustment, HioriAnimKey, Rect } from './types';

export interface AnimationExecutionState {
  name: HioriAnimKey;
  displayName: string;
  frameIndex: number;
  frameCount: number;
  fps: number;
  duration: number;
  loop: boolean;
  finished: boolean;
  priority: number;
}

export class AnimationController {
  private imageCache = new Map<string, HTMLImageElement>();
  private adjustments: FrameAdjustmentMap;
  private currentAnim: HioriAnimKey = 'idle';
  private frameIndex = 0;
  private frameTimer = 0;
  private finished = false;
  private transitionBlendTimer = 0;
  private lastClipInstanceId = 0;
  public scaleX = 1;
  public scaleY = 1;

  constructor(initialAdjustments?: FrameAdjustmentMap) {
    this.adjustments = initialAdjustments ? { ...initialAdjustments } : loadFrameAdjustments();
    this.preloadAllHioriSprites();
  }

  private preloadAllHioriSprites(): void {
    if (typeof Image === 'undefined') return;
    const urls = new Set<string>();
    for (const def of Object.values(HIORI_ANIMATIONS_CONFIG)) {
      for (const u of def.frames) urls.add(u);
    }
    for (const u of PROJECTILE_SPRITE_FRAMES) urls.add(u);
    for (const u of Object.values(EFFECT_SPRITE_FRAMES)) urls.add(u);

    for (const url of urls) {
      if (!this.imageCache.has(url)) {
        const img = new Image();
        img.src = url;
        this.imageCache.set(url, img);
      }
    }
  }

  public getAdjustments(): FrameAdjustmentMap {
    return structuredClone(this.adjustments);
  }

  public setAdjustment(key: string, adjustment: FrameBoundsAdjustment): void {
    this.adjustments[key] = { ...adjustment };
    saveFrameAdjustments(this.adjustments);
  }

  public resetAdjustments(): void {
    this.adjustments = {};
    saveFrameAdjustments(this.adjustments);
  }

  public getEffectiveAdjustment(animKey: HioriAnimKey, frameIdx: number): FrameBoundsAdjustment {
    const animAdj = this.adjustments[animKey];
    const frameAdj = this.adjustments[`${animKey}:${frameIdx}`];
    if (!animAdj && !frameAdj) return DEFAULT_FRAME_ADJUSTMENT;
    return {
      offsetX: (animAdj?.offsetX ?? 0) + (frameAdj?.offsetX ?? 0),
      offsetY: (animAdj?.offsetY ?? 0) + (frameAdj?.offsetY ?? 0),
      cropLeft: (animAdj?.cropLeft ?? 0) + (frameAdj?.cropLeft ?? 0),
      cropRight: (animAdj?.cropRight ?? 0) + (frameAdj?.cropRight ?? 0),
      cropTop: (animAdj?.cropTop ?? 0) + (frameAdj?.cropTop ?? 0),
      cropBottom: (animAdj?.cropBottom ?? 0) + (frameAdj?.cropBottom ?? 0),
    };
  }

  public triggerSquash(sx: number, sy: number): void {
    this.scaleX = sx;
    this.scaleY = sy;
  }

  public reset(): void {
    this.currentAnim = 'idle';
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.finished = false;
    this.transitionBlendTimer = 0;
    this.lastClipInstanceId = 0;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  public getCurrentDef(): HioriAnimationDefinition {
    return HIORI_ANIMATIONS_CONFIG[this.currentAnim];
  }

  public getExecutionState(): AnimationExecutionState {
    const def = this.getCurrentDef();
    return {
      name: def.name,
      displayName: def.displayName,
      frameIndex: this.frameIndex,
      frameCount: def.frames.length,
      fps: def.fps,
      duration: def.duration,
      loop: def.loop,
      finished: this.finished,
      priority: def.priority,
    };
  }

  public getAnimKey(): HioriAnimKey {
    return this.currentAnim;
  }

  public getFrameIndex(): number {
    return this.frameIndex;
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public update(
    targetAnim: HioriAnimKey,
    dt: number,
    clipInstanceId = 0
  ): void {
    const instanceRestart =
      clipInstanceId !== 0 && clipInstanceId !== this.lastClipInstanceId;

    if (targetAnim !== this.currentAnim || instanceRestart) {
      this.currentAnim = targetAnim;
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.finished = false;
      this.transitionBlendTimer = 0.065;
      this.lastClipInstanceId = clipInstanceId;
    }

    const def = HIORI_ANIMATIONS_CONFIG[this.currentAnim];
    const frameCount = Math.max(1, def.frames.length);
    const frameDuration = 1 / Math.max(1, def.fps);

    if (this.transitionBlendTimer > 0) {
      this.transitionBlendTimer = Math.max(0, this.transitionBlendTimer - dt);
    }

    this.frameTimer += dt;
    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      if (this.frameIndex + 1 < frameCount) {
        this.frameIndex++;
      } else if (def.loop) {
        this.frameIndex = 0;
      } else {
        this.frameIndex = frameCount - 1;
        this.finished = true;
      }
    }

    // Smooth exponential recovery on squash-and-stretch
    const damp = 1 - Math.exp(-16 * dt);
    this.scaleX += (1 - this.scaleX) * damp;
    this.scaleY += (1 - this.scaleY) * damp;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    rect: Rect,
    facing: 1 | -1,
    invulnerable: boolean,
    elapsedTime: number,
    shadowFormRemaining = 0
  ): void {
    const blinkDim =
      invulnerable &&
      Math.floor(elapsedTime * 18) % 2 === 0 &&
      this.currentAnim !== 'hurt' &&
      this.currentAnim !== 'death';

    const footX = rect.x + rect.width * 0.5;
    const footY = rect.y + rect.height;

    ctx.save();
    if (blinkDim) {
      ctx.globalAlpha = 0.38;
    } else if (this.transitionBlendTimer > 0) {
      // Subtle smooth entrance fade-in over 65ms on state transition
      ctx.globalAlpha = 0.84 + 0.16 * (1 - this.transitionBlendTimer / 0.065);
    }

    // Dark Transformation lingering violet aura behind Hiori
    if (shadowFormRemaining > 0 && this.currentAnim !== 'death') {
      const pulse = 0.85 + Math.sin(elapsedTime * 10) * 0.15;
      const auraGrad = ctx.createRadialGradient(
        footX,
        footY - rect.height * 0.52,
        6,
        footX,
        footY - rect.height * 0.52,
        46 * pulse
      );
      auraGrad.addColorStop(0, 'rgba(147, 51, 234, 0.42)');
      auraGrad.addColorStop(0.6, 'rgba(88, 28, 135, 0.2)');
      auraGrad.addColorStop(1, 'rgba(15, 10, 24, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(footX, footY - rect.height * 0.52, 46 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(footX, footY);
    ctx.scale(facing * this.scaleX, this.scaleY);

    const def = HIORI_ANIMATIONS_CONFIG[this.currentAnim];
    const safeIdx = Math.min(this.frameIndex, Math.max(0, def.frames.length - 1));
    const frameUrl = def.frames[safeIdx];
    const img = frameUrl ? this.imageCache.get(frameUrl) : undefined;

    if (img && img.complete && img.naturalWidth > 0) {
      const adj = this.getEffectiveAdjustment(this.currentAnim, safeIdx);
      const sx = Math.max(0, adj.cropLeft);
      const sy = Math.max(0, adj.cropTop);
      const sw = Math.max(4, img.naturalWidth - sx - Math.max(0, adj.cropRight));
      const sh = Math.max(4, img.naturalHeight - sy - Math.max(0, adj.cropBottom));

      const dw = sw * def.renderScale;
      const dh = sh * def.renderScale;
      const dx = -dw * 0.5 + def.anchorOffsetX + adj.offsetX;
      const dy = -dh + def.anchorOffsetY + adj.offsetY;

      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
      return;
    }

    // Transient loading fallback while image decodes on first frame
    ctx.fillStyle = '#1f232d';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-rect.width * 0.45, -rect.height, rect.width * 0.9, rect.height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
