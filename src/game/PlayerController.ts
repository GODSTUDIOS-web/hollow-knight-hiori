import { AnimationController } from './AnimationController';
import { AudioSynth } from './AudioSynth';
import { CooldownSystem } from './CooldownSystem';
import { DEFAULT_PLAYER_CONFIG, PlayerConfig } from './data/playerConfig';
import { EnergySystem } from './EnergySystem';
import { HitboxSystem } from './HitboxSystem';
import { InputManager } from './InputManager';
import { ParticlePool } from './ParticlePool';
import { PlayerCombat } from './PlayerCombat';
import { PlayerHealth } from './PlayerHealth';
import { PlayerMovement } from './PlayerMovement';
import { ProjectileSystem } from './ProjectileSystem';
import { PlayerSkinId } from './SettingsStore';
import { HioriAnimKey, PlayerActionState, Rect, StagePlatform, Vec2 } from './types';

export class PlayerController {
  public readonly config: PlayerConfig;
  public readonly cooldowns: CooldownSystem;
  public readonly energy: EnergySystem;
  public readonly movement: PlayerMovement;
  public readonly combat: PlayerCombat;
  public readonly health: PlayerHealth;
  public readonly animation: AnimationController;

  private spawnPoint: Vec2;
  private currentState: PlayerActionState = 'IDLE';
  private doubleJumpVisualTimer = 0;
  public skin: PlayerSkinId = 'classic';

  constructor(spawn: Vec2, config: PlayerConfig = DEFAULT_PLAYER_CONFIG) {
    this.config = config;
    this.spawnPoint = { ...spawn };
    this.cooldowns = new CooldownSystem();
    this.energy = new EnergySystem();
    this.movement = new PlayerMovement(spawn, config, this.cooldowns);
    this.combat = new PlayerCombat(this.cooldowns, this.energy);
    this.health = new PlayerHealth(config);
    this.animation = new AnimationController();
  }

  public getRect(): Rect {
    return this.movement.getRect();
  }

  public getCenter(): Vec2 {
    return this.movement.getCenter();
  }

  public getState(): PlayerActionState {
    return this.currentState;
  }

  public reset(): void {
    this.movement.reset(this.spawnPoint);
    this.combat.reset();
    this.health.reset();
    this.cooldowns.resetAll();
    this.energy.reset();
    this.animation.reset();
    this.currentState = 'IDLE';
    this.doubleJumpVisualTimer = 0;
  }

  public applyHit(
    damage: number,
    knockbackVx: number,
    knockbackVy: number,
    particles: ParticlePool,
    audio: AudioSynth
  ): boolean {
    const result = this.health.takeDamage(damage);
    if (!result.applied) return false;

    this.combat.interrupt();
    this.movement.applyKnockback(
      knockbackVx !== 0 ? knockbackVx : -this.movement.facing * this.config.hurtKnockbackX,
      knockbackVy !== 0 ? knockbackVy : this.config.hurtKnockbackY
    );
    this.animation.triggerSquash(1.22, 0.8);
    const c = this.getCenter();
    particles.spawnBurst(c.x, c.y, 14, '#f87171', 90, 260, 480);
    audio.playPlayerHurt();
    return true;
  }

  public update(
    input: InputManager,
    dt: number,
    platforms: StagePlatform[],
    gravityEnabled: boolean,
    hitboxSystem: HitboxSystem,
    particles: ParticlePool,
    audio: AudioSynth,
    allowControl = true,
    projectiles?: ProjectileSystem
  ): void {
    // 1. Tick shared cooldowns & energy visual timers once per frame
    this.cooldowns.update(dt);
    this.energy.update(dt);

    // 2. Update Health & Respawn
    const healthEvents = this.health.update(dt);
    if (healthEvents.shouldRespawn) {
      this.reset();
      const c = this.getCenter();
      particles.spawnBurst(c.x, c.y, 16, '#cbd5e1', 70, 200, 240);
      audio.playRespawn();
      return;
    }

    if (this.doubleJumpVisualTimer > 0) {
      this.doubleJumpVisualTimer = Math.max(0, this.doubleJumpVisualTimer - dt);
    }

    const canControl = allowControl && !this.health.isDead && !this.health.isHurtStaggered();

    const moveLeft = canControl && input.isHeld('moveLeft');
    const moveRight = canControl && input.isHeld('moveRight');
    const moveX: -1 | 0 | 1 = moveLeft === moveRight ? 0 : moveRight ? 1 : -1;

    // 3. Movement step
    const isAttackLocked =
      this.combat.isAttacking() &&
      this.combat.currentAttack !== null &&
      !this.combat.currentAttack.canInterruptOnMove;

    const moveEvents = this.movement.update(
      {
        moveX,
        runHeld: input.isHeld('run'),
        jumpJustPressed: input.justPressed('jump'),
        jumpHeld: input.isHeld('jump'),
        jumpJustReleased: input.justReleased('jump'),
        dashJustPressed: input.justPressed('dash'),
        downHeld: input.isHeld('down'),
      },
      dt,
      platforms,
      gravityEnabled,
      canControl,
      isAttackLocked
    );

    const center = this.getCenter();
    const footY = this.movement.position.y + this.config.height;

    if (moveEvents.jumped) {
      this.animation.triggerSquash(0.86, 1.15);
      particles.spawnBurst(center.x, footY, 6, '#94a3b8', 40, 120, 260);
      audio.playJump(false);
    }
    if (moveEvents.doubleJumped) {
      this.doubleJumpVisualTimer = 0.24;
      this.animation.triggerSquash(0.88, 1.14);
      particles.spawnBurst(center.x, footY, 10, '#c084fc', 60, 160, 180);
      audio.playJump(true);
    }
    if (moveEvents.dashed) {
      this.combat.interrupt();
      this.animation.triggerSquash(1.22, 0.84);
      particles.spawnBurst(
        center.x,
        center.y,
        14,
        '#a855f7',
        70,
        220,
        80,
        -this.movement.facing * 150
      );
      projectiles?.spawnEffectSprite(
        'shadowAura',
        center.x - this.movement.facing * 14,
        center.y,
        this.movement.facing,
        0.58,
        0.22
      );
      audio.playDash();
    }
    if (moveEvents.landed) {
      this.animation.triggerSquash(1.16, 0.86);
      particles.spawnBurst(center.x, footY, 5, '#64748b', 35, 110, 320);
      projectiles?.spawnEffectSprite('dust', center.x, footY - 8, this.movement.facing, 0.52, 0.18);
    }

    // 4. Combat step (cannot attack while dashing or hurt/dead)
    const canAttack = canControl && !this.movement.isDashing;
    const combatEvents = this.combat.update(
      {
        attackJustPressed: input.justPressed('attack'),
        specialJustPressed: input.justPressed('special'),
        transformationJustPressed: input.justPressed('transformation'),
        projectileJustPressed: input.justPressed('shadowProjectile'),
        upHeld: input.isHeld('up'),
        downHeld: input.isHeld('down'),
        moveX,
        isGrounded: this.movement.isGrounded,
      },
      dt,
      canAttack
    );

    if (combatEvents.startedAttack) {
      const atk = combatEvents.startedAttack;
      if (atk.lungeSpeedX) {
        this.movement.applyLunge(atk.lungeSpeedX, atk.windup + atk.active);
      }

      if (combatEvents.startedTransformation) {
        audio.playShadowCast(true);
        particles.spawnBurst(center.x, center.y, 24, '#a855f7', 90, 310, 120);
        projectiles?.spawnEffectSprite('darkFlame', center.x, center.y - 6, this.movement.facing, 0.78, 0.36);
        projectiles?.spawnEffectSprite('voidSpike', center.x, footY - 22, this.movement.facing, 0.65, 0.28);
      } else {
        const isHeavy = atk.id === 'attack3' || atk.id === 'attack4';
        audio.playSlash(isHeavy);
        const sparkColor =
          this.combat.shadowFormTimer > 0 || isHeavy ? '#c084fc' : '#e2e8f0';
        particles.spawnBurst(
          center.x + this.movement.facing * 24,
          center.y,
          isHeavy ? 10 : 5,
          sparkColor,
          60,
          190,
          160,
          this.movement.facing * 80
        );
      }
    }

    if (combatEvents.spawnedProjectile) {
      audio.playShadowCast(false);
      particles.spawnBurst(
        center.x + this.movement.facing * 18,
        center.y - 2,
        10,
        '#c084fc',
        60,
        180,
        80,
        this.movement.facing * 90
      );
      projectiles?.spawnShadowProjectile(
        center.x + this.movement.facing * 24,
        center.y - 2,
        this.movement.facing,
        this.combat.getDamageMultiplier()
      );
    }

    // 5. Register hurtbox & active attack hitbox
    if (!this.health.isDead) {
      hitboxSystem.registerHurtbox({
        id: 'player',
        owner: 'player',
        rect: this.getRect(),
        invulnerable: this.health.isInvulnerable(),
        defense: 0,
        knockbackResistance: 0,
      });
    }

    this.combat.registerActiveHitbox(hitboxSystem, this.getRect(), this.movement.facing);

    // 6. Resolve action state + Hiori animation key
    const runHeld = input.isHeld('run');
    this.currentState = this.resolveState(moveX, runHeld);
    const animKey = this.resolveAnimKey(this.currentState);
    const clipInstanceId = this.combat.isAttacking() ? this.combat.swingSequence : 0;
    this.animation.update(animKey, dt, clipInstanceId);
  }

  private resolveState(moveX: -1 | 0 | 1, runHeld: boolean): PlayerActionState {
    if (this.health.isDead) return 'DEAD';
    if (this.health.isHurtStaggered()) return 'HURT';
    if (this.movement.isDashing) return 'SHADOW_DASH';
    if (this.combat.isCastingProjectile()) return 'SHADOW_PROJECTILE';
    if (this.combat.isAttacking() && this.combat.currentAttack) {
      if (this.combat.currentAttack.id === 'transformation_burst') return 'TRANSFORMATION';
      if (this.combat.currentAttack.id === 'attack3' || this.combat.currentAttack.id === 'attack4') {
        return 'SPECIAL_ATTACK';
      }
      return 'ATTACK';
    }
    if (!this.movement.isGrounded) {
      if (this.doubleJumpVisualTimer > 0 && this.movement.velocity.y < 0) {
        return 'DOUBLE_JUMP';
      }
      return this.movement.velocity.y < 0 ? 'JUMP' : 'FALL';
    }
    if (moveX !== 0 && Math.abs(this.movement.velocity.x) > 12) {
      return runHeld ? 'RUN' : 'WALK';
    }
    if (this.movement.landTimer > 0) {
      return 'LAND';
    }
    return 'IDLE';
  }

  private resolveAnimKey(state: PlayerActionState): HioriAnimKey {
    switch (state) {
      case 'DEAD':
        return 'death';
      case 'HURT':
        return 'hurt';
      case 'SHADOW_DASH':
      case 'DASH':
        return 'shadow_dash';
      case 'TRANSFORMATION':
        return 'transformation';
      case 'SHADOW_PROJECTILE':
        return 'shadow_projectile';
      case 'ATTACK':
      case 'SPECIAL_ATTACK':
        return this.combat.currentAttack?.animKey ?? 'attack1';
      case 'JUMP':
      case 'DOUBLE_JUMP':
        return 'jump';
      case 'FALL':
        return 'fall';
      case 'LAND':
        return 'land';
      case 'RUN':
        return 'run';
      case 'WALK':
        return 'walk';
      case 'IDLE':
      default:
        return 'idle';
    }
  }

  public render(ctx: CanvasRenderingContext2D, elapsedTime: number): void {
    if (this.skin !== 'classic') {
      const c = this.getCenter();
      const pulse = 0.78 + Math.sin(elapsedTime * 3.4) * 0.16;
      ctx.save();
      const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 42 * pulse);
      if (this.skin === 'shadow_violet') {
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.34)');
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      } else {
        grad.addColorStop(0, 'rgba(248, 250, 252, 0.30)');
        grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 42 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.animation.render(
      ctx,
      this.getRect(),
      this.movement.facing,
      this.health.isInvulnerable(),
      elapsedTime,
      this.combat.shadowFormTimer
    );
  }
}
