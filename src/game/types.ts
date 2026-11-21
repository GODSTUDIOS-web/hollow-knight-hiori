import { AreaId, PlayerSkinId } from './SettingsStore';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type GameModeState = 'title' | 'playing' | 'paused' | 'gameover';

export type PlayerActionState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'JUMP'
  | 'DOUBLE_JUMP'
  | 'FALL'
  | 'LAND'
  | 'DASH'
  | 'SHADOW_DASH'
  | 'ATTACK'
  | 'SPECIAL_ATTACK'
  | 'TRANSFORMATION'
  | 'SHADOW_PROJECTILE'
  | 'HURT'
  | 'DEAD';

export type HioriAnimKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'attack4'
  | 'transformation'
  | 'shadow_dash'
  | 'shadow_projectile'
  | 'hurt'
  | 'death'
  | 'effects';

export type DummyActionState = 'IDLE' | 'HIT' | 'DEAD' | 'RESPAWNING';

export type InputAction =
  | 'moveLeft'
  | 'moveRight'
  | 'up'
  | 'down'
  | 'run'
  | 'jump'
  | 'attack'
  | 'special'
  | 'dash'
  | 'transformation'
  | 'shadowProjectile'
  | 'pause'
  | 'mute'
  | 'reset'
  | 'toggleDebug';

export type ActionBindings = Record<InputAction, string[]>;

export type AttackId =
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'attack4'
  | 'down_slash'
  | 'transformation_burst';

export type AbilityCooldownId =
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'attack4'
  | 'transformation'
  | 'shadow_dash'
  | 'shadow_projectile'
  | 'double_jump';

export type AttackPhase = 'NONE' | 'WINDUP' | 'ACTIVE' | 'RECOVERY';

export interface AttackDefinition {
  id: AttackId;
  animKey: HioriAnimKey;
  label: string;
  windup: number;
  active: number;
  recovery: number;
  cooldown: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  lungeSpeedX?: number;
  hitstop: number;
  shakeTrauma: number;
  pogoForce: number;
  canInterruptOnMove: boolean;
  centeredHitbox?: boolean;
  hitbox: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };
  arcDirection: 'horizontal' | 'horizontal_rev' | 'up' | 'down' | 'special';
}

export interface FrameBoundsAdjustment {
  offsetX: number;
  offsetY: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
}

export interface AbilityCooldownInfo {
  id: AbilityCooldownId;
  label: string;
  keyHint: string;
  total: number;
  remaining: number;
  ready: boolean;
}

export interface StagePlatform extends Rect {
  id: string;
  kind: 'ground' | 'platform' | 'wall';
  oneWay?: boolean;
}

export interface StageHazard extends Rect {
  id: string;
  damage: number;
  knockbackY: number;
}

export interface StageBackgroundLayer {
  id: string;
  parallaxX: number;
  parallaxY: number;
  imageSrc?: string;
  tint?: string;
}

export interface StageConfig {
  id: string;
  name: string;
  worldWidth: number;
  worldHeight: number;
  neutralColor: string;
  gridColor: string;
  playerSpawn: Vec2;
  dummySpawn: Vec2;
  benchZone?: Rect;
  portalZone?: Rect;
  platforms: StagePlatform[];
  hazards: StageHazard[];
  backgroundLayers: StageBackgroundLayer[];
}

export interface DummyConfig {
  maxHealth: number;
  defense: number;
  knockbackResistance: number;
  respawnTime: number;
}

export interface DebugSettings {
  showHitboxes: boolean;
  showHurtboxes: boolean;
  gravityEnabled: boolean;
}

export interface HudSnapshot {
  mode: GameModeState;
  fps: number;
  playerHp: number;
  playerMaxHp: number;
  playerInvulnerable: boolean;
  playerHealFlash: boolean;
  playerHurtFlash: boolean;
  playerShadowFormRemaining: number;
  playerState: PlayerActionState;
  playerAnimName: string;
  playerFacing: 1 | -1;
  playerAttackLabel: string;
  comboStep: number;
  energy: number;
  maxEnergy: number;
  energyRatio: number;
  energyFull: boolean;
  energyGainFlash: boolean;
  energySpendFlash: boolean;
  abilityEnergyCosts: Record<AbilityCooldownId, number>;
  coins: number;
  coinFlash: boolean;
  nearBench: boolean;
  nearAreaPortal: boolean;
  currentAreaId: AreaId;
  currentAreaName: string;
  selectedSkin: PlayerSkinId;
  dummyHp: number;
  dummyMaxHp: number;
  dummyState: DummyActionState;
  dummyRespawnRemaining: number;
  lastDamage: number;
  totalDamage: number;
  dummyKills: number;
  hitComboCount: number;
  hitComboDamage: number;
  hitComboRatio: number;
  cooldowns: AbilityCooldownInfo[];
  muted: boolean;
  debug: DebugSettings;
  dummyConfig: DummyConfig;
}
