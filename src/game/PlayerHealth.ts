import { PlayerConfig } from './data/playerConfig';

export class PlayerHealth {
  public currentHp: number;
  public maxHp: number;
  public invulnerabilityTimer = 0;
  public hurtTimer = 0;
  public deathTimer = 0;
  public healFlashTimer = 0;
  public damageFlashTimer = 0;
  public isDead = false;

  private config: PlayerConfig;

  constructor(config: PlayerConfig) {
    this.config = config;
    this.maxHp = config.maxHealth;
    this.currentHp = config.maxHealth;
  }

  public isInvulnerable(): boolean {
    return this.invulnerabilityTimer > 0 || this.isDead;
  }

  public isHurtStaggered(): boolean {
    return this.hurtTimer > 0;
  }

  public reset(): void {
    this.maxHp = this.config.maxHealth;
    this.currentHp = this.maxHp;
    this.invulnerabilityTimer = 0;
    this.hurtTimer = 0;
    this.deathTimer = 0;
    this.healFlashTimer = 0;
    this.damageFlashTimer = 0;
    this.isDead = false;
  }

  public triggerTestInvulnerability(duration = 2.0): void {
    this.invulnerabilityTimer = Math.max(this.invulnerabilityTimer, duration);
  }

  public heal(amount = 1): number {
    if (this.isDead || amount <= 0) return 0;
    const prev = this.currentHp;
    this.currentHp = Math.min(this.maxHp, this.currentHp + Math.round(amount));
    const healed = this.currentHp - prev;
    if (healed > 0) {
      this.healFlashTimer = 0.42;
    }
    return healed;
  }

  public setMaxHp(newMax: number, fillNew = true): void {
    const clamped = Math.max(1, Math.min(12, Math.round(newMax)));
    const diff = clamped - this.maxHp;
    this.maxHp = clamped;
    if (fillNew && diff > 0) {
      this.currentHp = Math.min(this.maxHp, this.currentHp + diff);
      this.healFlashTimer = 0.42;
    } else {
      this.currentHp = Math.min(this.currentHp, this.maxHp);
    }
  }

  public takeDamage(amount: number): { applied: boolean; died: boolean } {
    if (this.isInvulnerable() || amount <= 0) {
      return { applied: false, died: false };
    }

    this.currentHp = Math.max(0, this.currentHp - amount);
    this.invulnerabilityTimer = this.config.invulnerabilityDuration;
    this.hurtTimer = this.config.hurtDuration;
    this.damageFlashTimer = 0.35;

    if (this.currentHp <= 0) {
      this.isDead = true;
      this.deathTimer = this.config.deathRespawnDelay;
      return { applied: true, died: true };
    }

    return { applied: true, died: false };
  }

  /**
   * Updates timers and returns true on the frame the player completes death animation and respawns.
   */
  public update(dt: number): { shouldRespawn: boolean } {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
    }
    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    }
    if (this.healFlashTimer > 0) {
      this.healFlashTimer = Math.max(0, this.healFlashTimer - dt);
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    }

    if (this.isDead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        return { shouldRespawn: true };
      }
    }

    return { shouldRespawn: false };
  }
}
