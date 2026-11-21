import { Vec2 } from './types';

export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class CameraController {
  public x = 0;
  public y = 0;
  public viewportWidth = 1280;
  public viewportHeight = 720;

  private bounds: CameraBounds;
  private lookaheadX = 0;
  private trauma = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private shakeTime = 0;

  constructor(worldWidth: number, worldHeight: number) {
    this.bounds = {
      minX: 0,
      minY: 0,
      maxX: worldWidth,
      maxY: worldHeight,
    };
  }

  public setViewport(width: number, height: number): void {
    this.viewportWidth = Math.max(320, width);
    this.viewportHeight = Math.max(240, height);
  }

  public setBounds(bounds: CameraBounds): void {
    this.bounds = bounds;
  }

  public snapTo(targetCenter: Vec2): void {
    this.lookaheadX = 0;
    this.x = targetCenter.x - this.viewportWidth * 0.5;
    this.y = targetCenter.y - this.viewportHeight * 0.55;
    this.clampToBounds();
  }

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  public update(targetCenter: Vec2, facing: 1 | -1, dt: number, isTitleMode = false): void {
    // Smooth horizontal lookahead
    const desiredLookahead = isTitleMode ? 40 : facing * 85;
    const lookLerp = 1 - Math.exp(-5.5 * dt);
    this.lookaheadX += (desiredLookahead - this.lookaheadX) * lookLerp;

    const targetX = targetCenter.x + this.lookaheadX - this.viewportWidth * 0.5;
    const targetY = targetCenter.y - this.viewportHeight * 0.58;

    const smoothRate = isTitleMode ? 2.4 : 8.5;
    const damp = 1 - Math.exp(-smoothRate * dt);
    this.x += (targetX - this.x) * damp;
    this.y += (targetY - this.y) * damp;

    this.clampToBounds();

    // Decaying trauma^2 camera shake
    if (this.trauma > 0.001) {
      this.shakeTime += dt * 55;
      const shake = this.trauma * this.trauma * 15;
      this.shakeOffsetX = Math.sin(this.shakeTime * 1.13) * shake;
      this.shakeOffsetY = Math.cos(this.shakeTime * 1.47) * shake * 0.8;
      this.trauma = Math.max(0, this.trauma - dt * 2.6);
    } else {
      this.trauma = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  private clampToBounds(): void {
    const maxCamX = Math.max(this.bounds.minX, this.bounds.maxX - this.viewportWidth);
    const maxCamY = Math.max(this.bounds.minY, this.bounds.maxY - this.viewportHeight);
    this.x = Math.max(this.bounds.minX, Math.min(maxCamX, this.x));
    this.y = Math.max(this.bounds.minY, Math.min(maxCamY, this.y));
  }

  public getRenderX(): number {
    return Math.round(this.x + this.shakeOffsetX);
  }

  public getRenderY(): number {
    return Math.round(this.y + this.shakeOffsetY);
  }
}
