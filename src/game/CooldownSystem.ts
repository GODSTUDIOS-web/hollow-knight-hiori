import { AbilityCooldownId, AbilityCooldownInfo } from './types';

export interface CooldownConfigEntry {
  id: AbilityCooldownId;
  label: string;
  keyHint: string;
  duration: number;
}

export const DEFAULT_ABILITY_COOLDOWNS: Record<AbilityCooldownId, CooldownConfigEntry> = {
  attack1: { id: 'attack1', label: 'Ataque 1', keyHint: 'J', duration: 0.35 },
  attack2: { id: 'attack2', label: 'Ataque 2', keyHint: 'W+J', duration: 0.65 },
  attack3: { id: 'attack3', label: 'Ataque 3', keyHint: 'K', duration: 1.2 },
  attack4: { id: 'attack4', label: 'Ataque 4', keyHint: 'D+K', duration: 1.5 },
  transformation: {
    id: 'transformation',
    label: 'Transf. Sombria',
    keyHint: 'I',
    duration: 5.0,
  },
  shadow_dash: {
    id: 'shadow_dash',
    label: 'Dash Sombras',
    keyHint: 'L',
    duration: 1.5,
  },
  shadow_projectile: {
    id: 'shadow_projectile',
    label: 'Projétil Sombrio',
    keyHint: 'O',
    duration: 2.0,
  },
  double_jump: {
    id: 'double_jump',
    label: 'Double Jump',
    keyHint: '2x Espaço',
    duration: 0.2,
  },
};

export const COOLDOWN_DISPLAY_ORDER: AbilityCooldownId[] = [
  'attack1',
  'attack2',
  'attack3',
  'attack4',
  'shadow_dash',
  'shadow_projectile',
  'transformation',
  'double_jump',
];

export class CooldownSystem {
  private configs: Record<AbilityCooldownId, CooldownConfigEntry>;
  private remainingTimers: Record<AbilityCooldownId, number>;

  constructor(overrides?: Partial<Record<AbilityCooldownId, number>>) {
    this.configs = structuredClone(DEFAULT_ABILITY_COOLDOWNS);
    this.remainingTimers = {
      attack1: 0,
      attack2: 0,
      attack3: 0,
      attack4: 0,
      transformation: 0,
      shadow_dash: 0,
      shadow_projectile: 0,
      double_jump: 0,
    };

    if (overrides) {
      for (const id of Object.keys(overrides) as AbilityCooldownId[]) {
        const val = overrides[id];
        if (typeof val === 'number' && val >= 0) {
          this.configs[id].duration = val;
        }
      }
    }
  }

  public isReady(id: AbilityCooldownId): boolean {
    return this.remainingTimers[id] <= 0;
  }

  public getRemaining(id: AbilityCooldownId): number {
    return this.remainingTimers[id];
  }

  public getDuration(id: AbilityCooldownId): number {
    return this.configs[id].duration;
  }

  public setDuration(id: AbilityCooldownId, duration: number): void {
    this.configs[id].duration = Math.max(0, duration);
    if (this.remainingTimers[id] > this.configs[id].duration) {
      this.remainingTimers[id] = this.configs[id].duration;
    }
  }

  public trigger(id: AbilityCooldownId): void {
    this.remainingTimers[id] = this.configs[id].duration;
  }

  public resetAll(): void {
    for (const id of COOLDOWN_DISPLAY_ORDER) {
      this.remainingTimers[id] = 0;
    }
  }

  public update(dt: number): void {
    for (const id of COOLDOWN_DISPLAY_ORDER) {
      if (this.remainingTimers[id] > 0) {
        this.remainingTimers[id] = Math.max(0, this.remainingTimers[id] - dt);
      }
    }
  }

  public getSnapshot(): AbilityCooldownInfo[] {
    return COOLDOWN_DISPLAY_ORDER.map((id) => {
      const cfg = this.configs[id];
      const rem = this.remainingTimers[id];
      return {
        id,
        label: cfg.label,
        keyHint: cfg.keyHint,
        total: cfg.duration,
        remaining: Number(rem.toFixed(2)),
        ready: rem <= 0,
      };
    });
  }
}
