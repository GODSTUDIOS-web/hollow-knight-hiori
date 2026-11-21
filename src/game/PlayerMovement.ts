import { CollisionSystem } from './CollisionSystem';
import { CooldownSystem } from './CooldownSystem';
import { PlayerConfig } from './data/playerConfig';
import { Rect, StagePlatform, Vec2 } from './types';

export interface MovementInputIntent {
  moveX: -1 | 0 | 1;
  runHeld: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  jumpJustReleased: boolean;
  dashJustPressed: boolean;
  downHeld: boolean;
}

export interface MovementStepEvents {
  jumped: boolean;
  doubleJumped: boolean;
  dashed: boolean;
  landed: boolean;
}

export class PlayerMovement {
  public position: Vec2;
  public velocity: Vec2 = { x: 0, y: 0 };
  public facing: 1 | -1 = 1;
  public isGrounded = false;
  public onWallLeft = false;
  public onWallRight = false;
  public isDashing = false;
  public doubleJumpAvailable = true;
  public landTimer = 0;

  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private dashTimer = 0;
  private dashDirection: 1 | -1 = 1;
  private lungeTimer = 0;
  private lungeVelocityX = 0;
  private config: PlayerConfig;
  private cooldowns: CooldownSystem;
  private ownsCooldowns: boolean;

  constructor(spawn: Vec2, config: PlayerConfig, cooldowns?: CooldownSystem) {
    this.position = { x: spawn.x, y: spawn.y };
    this.config = config;
    this.ownsCooldowns = !cooldowns;
    this.cooldowns = cooldowns ?? new CooldownSystem();
  }

  public getRect(): Rect {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.config.width,
      height: this.config.height,
    };
  }

  public getCenter(): Vec2 {
    return {
      x: this.position.x + this.config.width * 0.5,
      y: this.position.y + this.config.height * 0.5,
    };
  }

  public reset(spawn: Vec2): void {
    this.position.x = spawn.x;
    this.position.y = spawn.y;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.facing = 1;
    this.isGrounded = false;
    this.onWallLeft = false;
    this.onWallRight = false;
    this.isDashing = false;
    this.doubleJumpAvailable = true;
    this.landTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dashTimer = 0;
    this.lungeTimer = 0;
    this.lungeVelocityX = 0;
  }

  public applyKnockback(vx: number, vy: number): void {
    this.isDashing = false;
    this.dashTimer = 0;
    this.lungeTimer = 0;
    this.velocity.x = vx;
    this.velocity.y = vy;
  }

  public applyLunge(speedX: number, duration = 0.16): void {
    this.lungeVelocityX = this.facing * Math.abs(speedX);
    this.lungeTimer = duration;
    this.velocity.x = this.lungeVelocityX;
    this.landTimer = 0;
  }

  public applyPogoBounce(pogoForce: number): void {
    if (pogoForce < 0) {
      this.velocity.y = pogoForce;
      this.doubleJumpAvailable = true;
      this.isGrounded = false;
      this.landTimer = 0;
    }
  }

  public update(
    intent: MovementInputIntent,
    dt: number,
    platforms: StagePlatform[],
    gravityEnabled: boolean,
    canControl: boolean,
    isAttackLocked: boolean
  ): MovementStepEvents {
    const events: MovementStepEvents = {
      jumped: false,
      doubleJumped: false,
      dashed: false,
      landed: false,
    };

    if (this.ownsCooldowns) {
      this.cooldowns.update(dt);
    }

    const wasGrounded = this.isGrounded;

    if (this.landTimer > 0) {
      this.landTimer = Math.max(0, this.landTimer - dt);
    }
    if (this.lungeTimer > 0) {
      this.lungeTimer = Math.max(0, this.lungeTimer - dt);
    }

    if (this.isGrounded) {
      this.coyoteTimer = this.config.coyoteTime;
      this.doubleJumpAvailable = true;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (canControl && intent.jumpJustPressed) {
      this.jumpBufferTimer = this.config.jumpBufferTime;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Update facing when player provides horizontal input and is not dashing or mid-swing
    if (canControl && !this.isDashing && !isAttackLocked && intent.moveX !== 0) {
      this.facing = intent.moveX;
    }

    // Trigger Dash das Sombras (independent 1.5s cooldown)
    if (
      canControl &&
      intent.dashJustPressed &&
      !this.isDashing &&
      this.cooldowns.isReady('shadow_dash')
    ) {
      this.isDashing = true;
      this.landTimer = 0;
      this.lungeTimer = 0;
      this.dashTimer = Math.max(this.config.dashDuration, 0.2);
      this.cooldowns.trigger('shadow_dash');
      this.dashDirection = intent.moveX !== 0 ? intent.moveX : this.facing;
      this.facing = this.dashDirection;
      this.velocity.x = this.dashDirection * this.config.dashSpeed;
      this.velocity.y = 0;
      events.dashed = true;
    }

    // Dash motion vs standard movement (cooldowns NEVER block normal movement)
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.velocity.x = this.dashDirection * this.config.dashSpeed;
      this.velocity.y = 0;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.velocity.x = this.dashDirection * this.config.walkSpeed * 0.72;
      }
    } else {
      if (this.lungeTimer > 0) {
        this.velocity.x = this.lungeVelocityX;
      } else {
        // Horizontal acceleration & deceleration
        const targetSpeed =
          canControl && intent.moveX !== 0
            ? intent.moveX * (intent.runHeld ? this.config.runSpeed : this.config.walkSpeed)
            : 0;

        const accel = this.isGrounded
          ? targetSpeed !== 0
            ? this.config.groundAcceleration
            : this.config.groundDeceleration
          : targetSpeed !== 0
            ? this.config.airAcceleration
            : this.config.airDeceleration;

        if (this.velocity.x < targetSpeed) {
          this.velocity.x = Math.min(targetSpeed, this.velocity.x + accel * dt);
        } else if (this.velocity.x > targetSpeed) {
          this.velocity.x = Math.max(targetSpeed, this.velocity.x - accel * dt);
        }
      }

      // Jump & Double Jump (Double Jump enforces 0.2s cooldown)
      if (canControl && this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.velocity.y = this.config.jumpVelocity;
          this.isGrounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.landTimer = 0;
          events.jumped = true;
        } else if (this.doubleJumpAvailable && this.cooldowns.isReady('double_jump')) {
          this.velocity.y = this.config.doubleJumpVelocity;
          this.doubleJumpAvailable = false;
          this.jumpBufferTimer = 0;
          this.landTimer = 0;
          this.cooldowns.trigger('double_jump');
          events.doubleJumped = true;
        }
      }

      // Variable jump height cut when jump key released early
      if (canControl && intent.jumpJustReleased && this.velocity.y < 0) {
        this.velocity.y *= this.config.jumpCutMultiplier;
      }

      // Gravity
      if (gravityEnabled) {
        const gravMult = this.velocity.y > 0 ? this.config.fallGravityMultiplier : 1;
        this.velocity.y = Math.min(
          this.config.maxFallSpeed,
          this.velocity.y + this.config.gravity * gravMult * dt
        );
      } else {
        if (canControl && intent.jumpHeld) {
          this.velocity.y = -240;
        } else if (canControl && intent.downHeld) {
          this.velocity.y = 240;
        } else {
          this.velocity.y *= Math.exp(-10 * dt);
        }
      }
    }

    // Collision resolution
    const dropThrough = canControl && intent.downHeld && intent.jumpJustPressed;
    const resolution = CollisionSystem.moveAndCollide(
      this.getRect(),
      this.velocity,
      dt,
      platforms,
      dropThrough
    );

    this.position.x = resolution.position.x;
    this.position.y = resolution.position.y;
    this.velocity.x = resolution.velocity.x;
    this.velocity.y = resolution.velocity.y;
    this.isGrounded = resolution.isGrounded;
    this.onWallLeft = resolution.onWallLeft;
    this.onWallRight = resolution.onWallRight;

    if (!wasGrounded && this.isGrounded) {
      events.landed = true;
      this.landTimer = 0.2;
    }

    return events;
  }
}
