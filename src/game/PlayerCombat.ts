import { CooldownSystem } from './CooldownSystem';
import { ATTACKS_CONFIG, COMBO_WINDOW_DURATION } from './data/attacksConfig';
import { EnergySystem } from './EnergySystem';
import { ActiveHitbox, HitboxSystem } from './HitboxSystem';
import { AbilityCooldownId, AttackDefinition, AttackId, AttackPhase, Rect } from './types';

export interface CombatIntent {
  attackJustPressed: boolean;
  specialJustPressed: boolean;
  transformationJustPressed?: boolean;
  projectileJustPressed?: boolean;
  upHeld: boolean;
  downHeld: boolean;
  moveX?: -1 | 0 | 1;
  isGrounded: boolean;
}

export interface CombatStepEvents {
  startedAttack: AttackDefinition | null;
  startedTransformation: boolean;
  spawnedProjectile: boolean;
  comboFollowup: boolean;
}

type BufferedAction =
  | { kind: 'attack' }
  | { kind: 'special'; moveX: -1 | 0 | 1 }
  | { kind: 'transformation' }
  | { kind: 'projectile' };

export const SHADOW_FORM_DURATION = 6.0;
export const SHADOW_FORM_DAMAGE_MULT = 1.35;

export class PlayerCombat {
  public phase: AttackPhase = 'NONE';
  public currentAttack: AttackDefinition | null = null;
  public comboStep = 0;
  public shadowFormTimer = 0;
  public projectileCastTimer = 0;
  public swingSequence = 0;
  public currentAttackLabel = '—';

  private phaseTimer = 0;
  private comboResetTimer = 0;
  private bufferedAction: BufferedAction | null = null;
  private bufferTimer = 0;
  private currentSwingHitIds = new Set<string>();
  private currentDamageBonus = 1;
  private cooldowns: CooldownSystem;
  private ownsCooldowns: boolean;
  private energy: EnergySystem | null;

  constructor(cooldowns?: CooldownSystem, energy?: EnergySystem) {
    this.ownsCooldowns = !cooldowns;
    this.cooldowns = cooldowns ?? new CooldownSystem();
    this.energy = energy ?? null;
  }

  public reset(): void {
    this.phase = 'NONE';
    this.currentAttack = null;
    this.comboStep = 0;
    this.shadowFormTimer = 0;
    this.projectileCastTimer = 0;
    this.phaseTimer = 0;
    this.comboResetTimer = 0;
    this.bufferedAction = null;
    this.bufferTimer = 0;
    this.currentDamageBonus = 1;
    this.currentAttackLabel = '—';
    this.currentSwingHitIds.clear();
  }

  public interrupt(): void {
    this.phase = 'NONE';
    this.currentAttack = null;
    this.projectileCastTimer = 0;
    this.phaseTimer = 0;
    this.bufferedAction = null;
    this.currentAttackLabel = '—';
    this.currentSwingHitIds.clear();
  }

  public isAttacking(): boolean {
    return this.phase !== 'NONE' || this.projectileCastTimer > 0;
  }

  public isCastingProjectile(): boolean {
    return this.projectileCastTimer > 0;
  }

  public getDamageMultiplier(): number {
    return this.shadowFormTimer > 0 ? SHADOW_FORM_DAMAGE_MULT : 1;
  }

  public getPhaseProgress(): number {
    if (!this.currentAttack || this.phase === 'NONE') return 0;
    const total =
      this.currentAttack.windup + this.currentAttack.active + this.currentAttack.recovery;
    let elapsed = 0;
    if (this.phase === 'WINDUP') {
      elapsed = this.currentAttack.windup - this.phaseTimer;
    } else if (this.phase === 'ACTIVE') {
      elapsed = this.currentAttack.windup + (this.currentAttack.active - this.phaseTimer);
    } else {
      elapsed =
        this.currentAttack.windup +
        this.currentAttack.active +
        (this.currentAttack.recovery - this.phaseTimer);
    }
    return Math.max(0, Math.min(1, elapsed / Math.max(0.001, total)));
  }

  public update(
    intent: CombatIntent,
    dt: number,
    canAttack: boolean
  ): CombatStepEvents {
    const events: CombatStepEvents = {
      startedAttack: null,
      startedTransformation: false,
      spawnedProjectile: false,
      comboFollowup: false,
    };

    if (this.ownsCooldowns) {
      this.cooldowns.update(dt);
    }

    if (this.shadowFormTimer > 0) {
      this.shadowFormTimer = Math.max(0, this.shadowFormTimer - dt);
    }
    if (this.projectileCastTimer > 0) {
      this.projectileCastTimer = Math.max(0, this.projectileCastTimer - dt);
      if (this.projectileCastTimer === 0 && this.phase === 'NONE') {
        this.currentAttackLabel = '—';
      }
    }
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer === 0 && this.phase === 'NONE') {
        this.comboStep = 0;
      }
    }
    if (this.bufferTimer > 0) {
      this.bufferTimer = Math.max(0, this.bufferTimer - dt);
      if (this.bufferTimer === 0) {
        this.bufferedAction = null;
      }
    }

    // Buffer attack/ability inputs pressed slightly before recovery/cooldown completes
    if (canAttack) {
      if (intent.transformationJustPressed) {
        this.bufferedAction = { kind: 'transformation' };
        this.bufferTimer = 0.14;
      } else if (intent.projectileJustPressed) {
        this.bufferedAction = { kind: 'projectile' };
        this.bufferTimer = 0.14;
      } else if (intent.specialJustPressed) {
        this.bufferedAction = { kind: 'special', moveX: intent.moveX ?? 0 };
        this.bufferTimer = 0.14;
      } else if (intent.attackJustPressed) {
        this.bufferedAction = { kind: 'attack' };
        this.bufferTimer = 0.16;
      }
    }

    // Advance current melee attack state machine
    if (this.phase !== 'NONE' && this.currentAttack) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        if (this.phase === 'WINDUP') {
          this.phase = 'ACTIVE';
          this.phaseTimer = this.currentAttack.active;
          this.currentSwingHitIds.clear();
        } else if (this.phase === 'ACTIVE') {
          this.phase = 'RECOVERY';
          this.phaseTimer = this.currentAttack.recovery;
        } else {
          this.phase = 'NONE';
          this.currentAttack = null;
          this.currentAttackLabel = '—';
          this.comboResetTimer = COMBO_WINDOW_DURATION;
        }
      }
    }

    // Prevent simultaneous attacks; allow valid J+J combo transition during recovery
    const canChainCombo =
      this.phase === 'RECOVERY' &&
      this.currentAttack?.id === 'attack1' &&
      this.bufferedAction?.kind === 'attack' &&
      !intent.upHeld &&
      !(intent.downHeld && !intent.isGrounded);

    if (
      canAttack &&
      this.projectileCastTimer <= 0 &&
      (this.phase === 'NONE' || canChainCombo) &&
      this.bufferedAction
    ) {
      const req = this.bufferedAction;

      if (req.kind === 'transformation') {
        if (
          this.cooldowns.isReady('transformation') &&
          (!this.energy || this.energy.canAffordAbility('transformation'))
        ) {
          this.energy?.consumeForAbility('transformation');
          this.cooldowns.trigger('transformation');
          this.shadowFormTimer = SHADOW_FORM_DURATION;
          this.comboStep = 0;
          events.startedAttack = this.startAttack('transformation_burst', 1);
          events.startedTransformation = true;
          this.bufferedAction = null;
        }
      } else if (req.kind === 'projectile') {
        if (
          this.cooldowns.isReady('shadow_projectile') &&
          (!this.energy || this.energy.canAffordAbility('shadow_projectile'))
        ) {
          this.energy?.consumeForAbility('shadow_projectile');
          this.cooldowns.trigger('shadow_projectile');
          this.projectileCastTimer = 0.16;
          this.swingSequence++;
          this.currentAttackLabel = 'Projétil Sombrio';
          events.spawnedProjectile = true;
          this.bufferedAction = null;
        }
      } else if (req.kind === 'special') {
        const useAttack4 = req.moveX !== 0;
        const chosenId: AttackId = useAttack4 ? 'attack4' : 'attack3';
        const cdId: AbilityCooldownId = useAttack4 ? 'attack4' : 'attack3';
        if (
          this.cooldowns.isReady(cdId) &&
          (!this.energy || this.energy.canAffordAbility(cdId))
        ) {
          this.energy?.consumeForAbility(cdId);
          this.cooldowns.trigger(cdId);
          this.comboStep = 0;
          events.startedAttack = this.startAttack(chosenId, 1);
          this.bufferedAction = null;
        }
      } else if (req.kind === 'attack') {
        const { attackId, cooldownId } = this.selectAttackFromIntent(intent);
        if (this.cooldowns.isReady(cooldownId)) {
          this.cooldowns.trigger(cooldownId);
          let comboBonus = 1;
          if (attackId === 'attack1') {
            if (this.comboResetTimer > 0 && this.comboStep >= 1) {
              this.comboStep = 2;
              comboBonus = 1.25;
              events.comboFollowup = true;
            } else {
              this.comboStep = 1;
            }
          } else {
            this.comboStep = 0;
          }
          events.startedAttack = this.startAttack(
            attackId,
            comboBonus,
            events.comboFollowup ? 'Combo · Corte Duplo II' : undefined
          );
          this.bufferedAction = null;
        }
      }
    }

    return events;
  }

  private selectAttackFromIntent(intent: CombatIntent): {
    attackId: AttackId;
    cooldownId: AbilityCooldownId;
  } {
    if (intent.upHeld) {
      return { attackId: 'attack2', cooldownId: 'attack2' };
    }
    if (intent.downHeld && !intent.isGrounded) {
      return { attackId: 'down_slash', cooldownId: 'attack1' };
    }
    return { attackId: 'attack1', cooldownId: 'attack1' };
  }

  private startAttack(
    id: AttackId,
    comboBonus = 1,
    overrideLabel?: string
  ): AttackDefinition {
    const def = ATTACKS_CONFIG[id];
    this.currentAttack = def;
    this.currentDamageBonus = comboBonus;
    this.currentAttackLabel = overrideLabel ?? def.label;
    this.phase = 'WINDUP';
    this.phaseTimer = def.windup;
    this.comboResetTimer = COMBO_WINDOW_DURATION;
    this.swingSequence++;
    this.currentSwingHitIds.clear();
    return def;
  }

  public registerActiveHitbox(
    hitboxSystem: HitboxSystem,
    playerRect: Rect,
    facing: 1 | -1
  ): void {
    if (this.phase !== 'ACTIVE' || !this.currentAttack) return;

    const hbRect = HitboxSystem.createAttackHitboxRect(playerRect, facing, this.currentAttack);
    const totalMult = this.getDamageMultiplier() * this.currentDamageBonus;
    const active: ActiveHitbox = {
      id: `${this.currentAttack.id}-${this.swingSequence}`,
      owner: 'player',
      ownerId: 'player',
      rect: hbRect,
      damage: Math.round(this.currentAttack.damage * totalMult),
      knockbackX: this.currentAttack.knockbackX,
      knockbackY: this.currentAttack.knockbackY,
      facing,
      hitstop: this.currentAttack.hitstop,
      shakeTrauma: this.currentAttack.shakeTrauma,
      pogoForce: this.currentAttack.pogoForce,
      hitTargetIds: this.currentSwingHitIds,
    };
    hitboxSystem.registerHitbox(active);
  }
}
