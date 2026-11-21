import { CollisionSystem } from './CollisionSystem';
import { DEFAULT_DUMMY_CONFIG } from './data/stageConfig';
import { EnemyEntity } from './EnemyController';
import { HitboxSystem, HitResolution } from './HitboxSystem';
import { ParticlePool } from './ParticlePool';
import { DummyActionState, DummyConfig, Rect, StagePlatform, Vec2 } from './types';

export const DUMMY_HIT_COMBO_WINDOW = 2.2;

export class DummyTraining implements EnemyEntity {
  public readonly id = 'training-dummy';
  public readonly width = 38;
  public readonly height = 68;

  public config: DummyConfig;
  public position: Vec2;
  public velocity: Vec2 = { x: 0, y: 0 };
  public currentHp: number;
  public state: DummyActionState = 'IDLE';
  public respawnTimer = 0;
  public kills = 0;
  public lastDamageTaken = 0;
  public totalDamageTaken = 0;
  public hitComboCount = 0;
  public hitComboDamage = 0;
  public hitComboTimer = 0;

  private spawnPoint: Vec2;
  private hitFlashTimer = 0;
  private blinkTimer = 0;
  private hitReactionTimer = 0;
  private deathTimer = 0;
  private tiltAngle = 0;
  private tiltVelocity = 0;
  private squashX = 1;
  private squashY = 1;
  private ghostHp: number;

  constructor(spawn: Vec2, config: DummyConfig = DEFAULT_DUMMY_CONFIG) {
    this.spawnPoint = { ...spawn };
    this.config = { ...config };
    this.position = { ...spawn };
    this.currentHp = this.config.maxHealth;
    this.ghostHp = this.config.maxHealth;
  }

  public getRect(): Rect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height,
    };
  }

  public getStateLabel(): DummyActionState {
    return this.state;
  }

  public isAlive(): boolean {
    return this.state !== 'DEAD' && this.state !== 'RESPAWNING';
  }

  public getHitComboRatio(): number {
    if (this.hitComboCount < 2 || this.hitComboTimer <= 0) return 0;
    return Math.max(0, Math.min(1, this.hitComboTimer / DUMMY_HIT_COMBO_WINDOW));
  }

  public setConfig(partial: Partial<DummyConfig>): void {
    const prevMax = this.config.maxHealth;
    this.config = { ...this.config, ...partial };
    if (partial.maxHealth !== undefined && partial.maxHealth !== prevMax) {
      if (this.isAlive()) {
        const ratio = prevMax > 0 ? this.currentHp / prevMax : 1;
        this.currentHp = Math.max(1, Math.round(this.config.maxHealth * ratio));
        this.ghostHp = Math.max(this.currentHp, this.ghostHp);
      }
    }
  }

  public reset(clearTotals = false): void {
    this.position.x = this.spawnPoint.x;
    this.position.y = this.spawnPoint.y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.currentHp = this.config.maxHealth;
    this.ghostHp = this.config.maxHealth;
    this.state = 'IDLE';
    this.hitFlashTimer = 0;
    this.blinkTimer = 0;
    this.hitReactionTimer = 0;
    this.deathTimer = 0;
    this.respawnTimer = 0;
    this.tiltAngle = 0;
    this.tiltVelocity = 0;
    this.squashX = 1;
    this.squashY = 1;
    if (clearTotals) {
      this.lastDamageTaken = 0;
      this.totalDamageTaken = 0;
      this.kills = 0;
      this.hitComboCount = 0;
      this.hitComboDamage = 0;
      this.hitComboTimer = 0;
    }
  }

  public onHit(hit: HitResolution, particles: ParticlePool): void {
    if (!this.isAlive()) return;

    this.currentHp = Math.max(0, this.currentHp - hit.finalDamage);
    this.lastDamageTaken = hit.finalDamage;
    this.totalDamageTaken += hit.finalDamage;

    if (this.hitComboTimer > 0) {
      this.hitComboCount += 1;
      this.hitComboDamage += hit.finalDamage;
    } else {
      this.hitComboCount = 1;
      this.hitComboDamage = hit.finalDamage;
    }
    this.hitComboTimer = DUMMY_HIT_COMBO_WINDOW;

    this.velocity.x = hit.knockbackVx;
    this.velocity.y = hit.knockbackVy;

    this.hitFlashTimer = 0.08;
    this.blinkTimer = 0.36;
    this.hitReactionTimer = 0.24;
    this.squashX = 1.24;
    this.squashY = 0.8;
    this.tiltVelocity = (hit.knockbackVx >= 0 ? 1 : -1) * 9.5;

    const isHeavy = hit.finalDamage >= 20;
    particles.spawnDamageNumber(
      this.position.x + this.width * 0.5,
      this.position.y - 6,
      hit.finalDamage,
      isHeavy
    );
    particles.spawnBurst(
      hit.hitPointX,
      hit.hitPointY,
      isHeavy ? 18 : 10,
      isHeavy ? '#fde68a' : '#e2e8f0',
      80,
      250,
      400,
      hit.knockbackVx * 0.35
    );

    if (this.currentHp <= 0) {
      this.state = 'DEAD';
      this.deathTimer = 0.45;
      this.respawnTimer = this.config.respawnTime;
      this.kills++;
      particles.spawnBurst(
        this.position.x + this.width * 0.5,
        this.position.y + this.height * 0.5,
        24,
        '#94a3b8',
        90,
        280,
        360
      );
    } else {
      this.state = 'HIT';
    }
  }

  public update(
    dt: number,
    platforms: StagePlatform[],
    gravityEnabled: boolean,
    hitboxSystem: HitboxSystem
  ): void {
    if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    if (this.blinkTimer > 0) this.blinkTimer = Math.max(0, this.blinkTimer - dt);
    if (this.hitComboTimer > 0) {
      this.hitComboTimer = Math.max(0, this.hitComboTimer - dt);
      if (this.hitComboTimer === 0) {
        this.hitComboCount = 0;
        this.hitComboDamage = 0;
      }
    }
    if (this.hitReactionTimer > 0) {
      this.hitReactionTimer = Math.max(0, this.hitReactionTimer - dt);
      if (this.hitReactionTimer === 0 && this.state === 'HIT') {
        this.state = 'IDLE';
      }
    }

    // Delayed trailing ghost HP bar
    if (this.ghostHp > this.currentHp) {
      this.ghostHp = Math.max(this.currentHp, this.ghostHp - Math.max(18, this.config.maxHealth * 0.45) * dt);
    }

    // Spring-damp tilt and squash back to upright
    const springK = 140;
    const damping = 12;
    this.tiltVelocity += (-springK * this.tiltAngle - damping * this.tiltVelocity) * dt;
    this.tiltAngle += this.tiltVelocity * dt;
    const scaleDamp = 1 - Math.exp(-15 * dt);
    this.squashX += (1 - this.squashX) * scaleDamp;
    this.squashY += (1 - this.squashY) * scaleDamp;

    if (this.state === 'DEAD') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.state = 'RESPAWNING';
      }
    } else if (this.state === 'RESPAWNING') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.reset(false);
        this.squashX = 0.78;
        this.squashY = 1.24;
      }
      return;
    }

    // Physics step (gravity + friction so knockback slides smoothly and settles)
    if (gravityEnabled) {
      this.velocity.y = Math.min(860, this.velocity.y + 1650 * dt);
    }
    this.velocity.x *= Math.exp(-10 * dt);
    if (Math.abs(this.velocity.x) < 4) this.velocity.x = 0;

    const resolved = CollisionSystem.moveAndCollide(
      this.getRect(),
      this.velocity,
      dt,
      platforms,
      false
    );
    this.position = resolved.position;
    this.velocity = resolved.velocity;

    // Register hurtbox while alive
    if (this.isAlive()) {
      hitboxSystem.registerHurtbox({
        id: this.id,
        owner: 'enemy',
        rect: this.getRect(),
        invulnerable: false,
        defense: this.config.defense,
        knockbackResistance: this.config.knockbackResistance,
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, elapsedTime: number, showHudBars = true): void {
    const cx = this.position.x + this.width * 0.5;
    const bottomY = this.position.y + this.height;

    // Respawn ground marker while waiting to reappear
    if (this.state === 'RESPAWNING') {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(this.spawnPoint.x, this.spawnPoint.y, this.width, this.height);
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `RESPAWN ${this.respawnTimer.toFixed(1)}s`,
        this.spawnPoint.x + this.width * 0.5,
        this.spawnPoint.y - 10
      );
      ctx.restore();
      return;
    }

    // Blink after hit
    const isBlinkingOff = this.blinkTimer > 0 && Math.floor(elapsedTime * 22) % 2 === 0;

    ctx.save();
    ctx.translate(cx, bottomY);

    if (this.state === 'DEAD') {
      const collapse = 1 - Math.max(0, this.deathTimer / 0.45);
      ctx.rotate(collapse * Math.PI * 0.48);
      ctx.globalAlpha = Math.max(0.15, 1 - collapse * 0.85);
    } else {
      ctx.rotate(this.tiltAngle);
      ctx.scale(this.squashX, this.squashY);
      if (isBlinkingOff && this.hitFlashTimer <= 0) {
        ctx.globalAlpha = 0.42;
      }
    }

    const flash = this.hitFlashTimer > 0;
    const baseFill = flash ? '#ffffff' : '#525866';
    const torsoFill = flash ? '#ffffff' : '#717888';
    const headFill = flash ? '#ffffff' : '#a1a8b8';
    const strokeCol = '#20242c';

    // Weighted training post base
    ctx.fillStyle = baseFill;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-15, -10, 30, 10, 3);
    ctx.fill();
    ctx.stroke();

    // Central support stem
    ctx.fillStyle = '#3b404c';
    ctx.fillRect(-3.5, -24, 7, 14);

    // Dummy padded torso
    ctx.fillStyle = torsoFill;
    ctx.beginPath();
    ctx.roundRect(-14, -49, 28, 28, 6);
    ctx.fill();
    ctx.stroke();

    // Target cross-strap on chest
    ctx.strokeStyle = flash ? '#cbd5e1' : '#3d4350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -43);
    ctx.lineTo(9, -27);
    ctx.moveTo(9, -43);
    ctx.lineTo(-9, -27);
    ctx.stroke();

    // Separate Dummy head
    ctx.fillStyle = headFill;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-10, -68, 20, 17, 6);
    ctx.fill();
    ctx.stroke();

    // Simple stitched dummy expression
    ctx.fillStyle = '#1e222b';
    ctx.fillRect(-5, -62, 3, 3);
    ctx.fillRect(2, -62, 3, 3);

    ctx.restore();

    // Overhead Health Bar (rendered cleanly upright above the dummy during gameplay)
    if (showHudBars && this.state !== 'DEAD') {
      const barW = 54;
      const barH = 6;
      const barX = Math.round(cx - barW * 0.5);
      const barY = Math.round(this.position.y - 18);

      const hpRatio = Math.max(0, Math.min(1, this.currentHp / Math.max(1, this.config.maxHealth)));
      const ghostRatio = Math.max(
        hpRatio,
        Math.min(1, this.ghostHp / Math.max(1, this.config.maxHealth))
      );

      ctx.fillStyle = 'rgba(17, 19, 23, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // Trailing ghost drain
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(barX, barY, barW * ghostRatio, barH);

      // Current HP fill
      ctx.fillStyle = hpRatio > 0.3 ? '#e2e8f0' : '#f87171';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }
}
