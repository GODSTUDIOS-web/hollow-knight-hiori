import { HitboxSystem, HitResolution } from './HitboxSystem';
import { ParticlePool } from './ParticlePool';
import { Rect, StagePlatform, Vec2 } from './types';

export interface EnemyEntity {
  readonly id: string;
  getRect(): Rect;
  getStateLabel(): string;
  isAlive(): boolean;
  reset(): void;
  update(dt: number, platforms: StagePlatform[], gravityEnabled: boolean, hitboxSystem: HitboxSystem): void;
  onHit(hit: HitResolution, particles: ParticlePool): void;
  render(ctx: CanvasRenderingContext2D, elapsedTime: number, showHudBars?: boolean): void;
}

export class EnemyController {
  private enemies: EnemyEntity[] = [];

  public register(enemy: EnemyEntity): void {
    this.enemies.push(enemy);
  }

  public getEnemies(): readonly EnemyEntity[] {
    return this.enemies;
  }

  public getById(id: string): EnemyEntity | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  public resetAll(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].reset();
    }
  }

  public updateAll(
    dt: number,
    platforms: StagePlatform[],
    gravityEnabled: boolean,
    hitboxSystem: HitboxSystem
  ): void {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, platforms, gravityEnabled, hitboxSystem);
    }
  }

  public renderAll(ctx: CanvasRenderingContext2D, elapsedTime: number, showHudBars = true): void {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].render(ctx, elapsedTime, showHudBars);
    }
  }
}
