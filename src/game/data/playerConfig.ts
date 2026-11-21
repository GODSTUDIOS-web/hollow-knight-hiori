export interface PlayerConfig {
  width: number;
  height: number;
  walkSpeed: number;
  runSpeed: number;
  groundAcceleration: number;
  groundDeceleration: number;
  airAcceleration: number;
  airDeceleration: number;
  gravity: number;
  fallGravityMultiplier: number;
  maxFallSpeed: number;
  jumpVelocity: number;
  doubleJumpVelocity: number;
  jumpCutMultiplier: number;
  coyoteTime: number;
  jumpBufferTime: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
  maxHealth: number;
  invulnerabilityDuration: number;
  hurtDuration: number;
  hurtKnockbackX: number;
  hurtKnockbackY: number;
  deathRespawnDelay: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  width: 30,
  height: 52,
  walkSpeed: 245,
  runSpeed: 375,
  groundAcceleration: 2400,
  groundDeceleration: 2800,
  airAcceleration: 1650,
  airDeceleration: 1100,
  gravity: 1680,
  fallGravityMultiplier: 1.32,
  maxFallSpeed: 880,
  jumpVelocity: -610,
  doubleJumpVelocity: -545,
  jumpCutMultiplier: 0.46,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
  dashSpeed: 740,
  dashDuration: 0.17,
  dashCooldown: 0.42,
  maxHealth: 5,
  invulnerabilityDuration: 1.05,
  hurtDuration: 0.24,
  hurtKnockbackX: 280,
  hurtKnockbackY: -320,
  deathRespawnDelay: 0.9,
};
