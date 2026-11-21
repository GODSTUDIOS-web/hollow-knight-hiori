import { CollisionSystem } from './CollisionSystem';
import { AttackDefinition, Rect } from './types';

export type HitboxOwner = 'player' | 'enemy' | 'hazard';

export interface ActiveHitbox {
  id: string;
  owner: HitboxOwner;
  ownerId: string;
  rect: Rect;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  facing: 1 | -1;
  hitstop: number;
  shakeTrauma: number;
  pogoForce: number;
  hitTargetIds: Set<string>;
}

export interface Hurtbox {
  id: string;
  owner: HitboxOwner;
  rect: Rect;
  invulnerable: boolean;
  defense: number;
  knockbackResistance: number;
}

export interface HitResolution {
  hitboxId: string;
  targetId: string;
  finalDamage: number;
  knockbackVx: number;
  knockbackVy: number;
  hitPointX: number;
  hitPointY: number;
  hitstop: number;
  shakeTrauma: number;
  pogoForce: number;
}

export class HitboxSystem {
  private activeHitboxes: ActiveHitbox[] = [];
  private hurtboxes: Hurtbox[] = [];

  public clearFrame(): void {
    this.activeHitboxes.length = 0;
    this.hurtboxes.length = 0;
  }

  public registerHitbox(hitbox: ActiveHitbox): void {
    this.activeHitboxes.push(hitbox);
  }

  public registerHurtbox(hurtbox: Hurtbox): void {
    this.hurtboxes.push(hurtbox);
  }

  public getActiveHitboxes(): readonly ActiveHitbox[] {
    return this.activeHitboxes;
  }

  public getHurtboxes(): readonly Hurtbox[] {
    return this.hurtboxes;
  }

  public static createAttackHitboxRect(
    actorRect: Rect,
    facing: 1 | -1,
    attack: AttackDefinition
  ): Rect {
    const hb = attack.hitbox;
    const centerX = actorRect.x + actorRect.width * 0.5;
    const x = attack.centeredHitbox
      ? centerX - hb.width * 0.5 + hb.offsetX * facing
      : facing === 1
        ? centerX + hb.offsetX
        : centerX - hb.offsetX - hb.width;

    return {
      x,
      y: actorRect.y + hb.offsetY,
      width: hb.width,
      height: hb.height,
    };
  }

  public static computeDamage(rawDamage: number, defense: number): number {
    return Math.max(1, Math.round(rawDamage - Math.max(0, defense)));
  }

  public static computeKnockback(
    rawVx: number,
    rawVy: number,
    knockbackResistance: number
  ): { vx: number; vy: number } {
    const factor = Math.max(0, Math.min(1, 1 - knockbackResistance));
    return {
      vx: rawVx * factor,
      vy: rawVy * factor,
    };
  }

  /**
   * Resolves all active hitboxes against opposing hurtboxes.
   * Respects invulnerability and prevents hitting the same target twice per swing instance.
   */
  public resolveHits(): HitResolution[] {
    const results: HitResolution[] = [];

    for (let i = 0; i < this.activeHitboxes.length; i++) {
      const hb = this.activeHitboxes[i];

      for (let j = 0; j < this.hurtboxes.length; j++) {
        const target = this.hurtboxes[j];
        if (hb.owner === target.owner) continue;
        if (target.invulnerable) continue;
        if (hb.hitTargetIds.has(target.id)) continue;

        if (!CollisionSystem.intersects(hb.rect, target.rect)) continue;

        hb.hitTargetIds.add(target.id);

        const finalDamage = HitboxSystem.computeDamage(hb.damage, target.defense);
        const dir =
          hb.owner === 'hazard'
            ? target.rect.x + target.rect.width * 0.5 >= hb.rect.x + hb.rect.width * 0.5
              ? 1
              : -1
            : hb.facing;

        const kb = HitboxSystem.computeKnockback(
          hb.knockbackX * dir,
          hb.knockbackY,
          target.knockbackResistance
        );

        const overlapLeft = Math.max(hb.rect.x, target.rect.x);
        const overlapRight = Math.min(hb.rect.x + hb.rect.width, target.rect.x + target.rect.width);
        const overlapTop = Math.max(hb.rect.y, target.rect.y);
        const overlapBottom = Math.min(hb.rect.y + hb.rect.height, target.rect.y + target.rect.height);

        results.push({
          hitboxId: hb.id,
          targetId: target.id,
          finalDamage,
          knockbackVx: kb.vx,
          knockbackVy: kb.vy,
          hitPointX: (overlapLeft + overlapRight) * 0.5,
          hitPointY: (overlapTop + overlapBottom) * 0.5,
          hitstop: hb.hitstop,
          shakeTrauma: hb.shakeTrauma,
          pogoForce: hb.pogoForce,
        });
      }
    }

    return results;
  }
}
