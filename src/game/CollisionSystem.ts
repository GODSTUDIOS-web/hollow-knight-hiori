import { Rect, StagePlatform, Vec2 } from './types';

export interface CollisionResolution {
  position: Vec2;
  velocity: Vec2;
  isGrounded: boolean;
  onWallLeft: boolean;
  onWallRight: boolean;
  onCeiling: boolean;
  standingPlatformId: string | null;
}

export class CollisionSystem {
  public static intersects(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Resolves axis-separated movement against solid platforms, walls, and one-way platforms.
   * Supports dropThroughOneWay when pressing down + jump/drop if desired.
   */
  public static moveAndCollide(
    rect: Rect,
    velocity: Vec2,
    dt: number,
    platforms: StagePlatform[],
    dropThroughOneWay = false
  ): CollisionResolution {
    let x = rect.x;
    let y = rect.y;
    let vx = velocity.x;
    let vy = velocity.y;

    let isGrounded = false;
    let onWallLeft = false;
    let onWallRight = false;
    let onCeiling = false;
    let standingPlatformId: string | null = null;

    // 1. Horizontal step (ignore one-way platforms for side collisions)
    x += vx * dt;
    const hBox: Rect = { x, y, width: rect.width, height: rect.height };

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (p.oneWay) continue;
      if (!CollisionSystem.intersects(hBox, p)) continue;

      if (vx > 0) {
        x = p.x - rect.width;
        vx = 0;
        onWallRight = true;
      } else if (vx < 0) {
        x = p.x + p.width;
        vx = 0;
        onWallLeft = true;
      }
      hBox.x = x;
    }

    // 2. Vertical step
    const prevBottom = y + rect.height;
    y += vy * dt;
    const vBox: Rect = { x, y, width: rect.width, height: rect.height };

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i];
      if (!CollisionSystem.intersects(vBox, p)) continue;

      if (p.oneWay) {
        if (dropThroughOneWay) continue;
        // Land on one-way platform only when falling from above (with small tolerance)
        if (vy >= 0 && prevBottom <= p.y + 8) {
          y = p.y - rect.height;
          vy = 0;
          isGrounded = true;
          standingPlatformId = p.id;
          vBox.y = y;
        }
        continue;
      }

      if (vy > 0) {
        y = p.y - rect.height;
        vy = 0;
        isGrounded = true;
        standingPlatformId = p.id;
      } else if (vy < 0) {
        y = p.y + p.height;
        vy = 0;
        onCeiling = true;
      }
      vBox.y = y;
    }

    // 3. Micro ground probe (1px below feet) when vy === 0 so grounded state doesn't flicker
    if (!isGrounded && vy >= 0) {
      const probe: Rect = {
        x: x + 2,
        y: y + rect.height,
        width: Math.max(1, rect.width - 4),
        height: 2,
      };
      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        if (p.oneWay && dropThroughOneWay) continue;
        if (p.oneWay && y + rect.height > p.y + 4) continue;
        if (CollisionSystem.intersects(probe, p)) {
          isGrounded = true;
          standingPlatformId = p.id;
          break;
        }
      }
    }

    return {
      position: { x, y },
      velocity: { x: vx, y: vy },
      isGrounded,
      onWallLeft,
      onWallRight,
      onCeiling,
      standingPlatformId,
    };
  }
}
