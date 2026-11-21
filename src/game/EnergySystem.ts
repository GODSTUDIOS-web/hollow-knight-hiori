import { AbilityCooldownId } from './types';

export interface EnergySystemConfig {
  maxEnergy: number;
  startingEnergy: number;
  gainOnHit: number;
  abilityCosts: Record<AbilityCooldownId, number>;
}

export const DEFAULT_ENERGY_CONFIG: EnergySystemConfig = {
  maxEnergy: 100,
  startingEnergy: 45,
  gainOnHit: 15,
  abilityCosts: {
    attack1: 0,
    attack2: 0,
    attack3: 15,
    attack4: 15,
    shadow_dash: 0,
    shadow_projectile: 20,
    transformation: 40,
    double_jump: 0,
  },
};

export class EnergySystem {
  public maxEnergy: number;
  public currentEnergy: number;
  public gainOnHit: number;
  public gainFlashTimer = 0;
  public spendFlashTimer = 0;
  private startingEnergy: number;
  private abilityCosts: Record<AbilityCooldownId, number>;

  constructor(overrides?: Partial<EnergySystemConfig>) {
    this.maxEnergy = Math.max(1, overrides?.maxEnergy ?? DEFAULT_ENERGY_CONFIG.maxEnergy);
    this.startingEnergy = Math.max(
      0,
      Math.min(this.maxEnergy, overrides?.startingEnergy ?? DEFAULT_ENERGY_CONFIG.startingEnergy)
    );
    this.currentEnergy = this.startingEnergy;
    this.gainOnHit = overrides?.gainOnHit ?? DEFAULT_ENERGY_CONFIG.gainOnHit;
    this.abilityCosts = {
      ...DEFAULT_ENERGY_CONFIG.abilityCosts,
      ...(overrides?.abilityCosts ?? {}),
    };
  }

  public reset(): void {
    this.currentEnergy = Math.min(this.maxEnergy, this.startingEnergy);
    this.gainFlashTimer = 0;
    this.spendFlashTimer = 0;
  }

  public getEnergy(): number {
    return this.currentEnergy;
  }

  public getMaxEnergy(): number {
    return this.maxEnergy;
  }

  public getRatio(): number {
    return Math.max(0, Math.min(1, this.currentEnergy / Math.max(1, this.maxEnergy)));
  }

  public isFull(): boolean {
    return this.currentEnergy >= this.maxEnergy;
  }

  public getCost(id: AbilityCooldownId): number {
    return Math.max(0, this.abilityCosts[id] ?? 0);
  }

  public getAllCosts(): Record<AbilityCooldownId, number> {
    return { ...this.abilityCosts };
  }

  public setAbilityCost(id: AbilityCooldownId, cost: number): void {
    this.abilityCosts[id] = Math.max(0, Math.round(cost));
  }

  public setMaxEnergy(max: number, refill = false): void {
    this.maxEnergy = Math.max(10, Math.round(max));
    if (refill) {
      this.currentEnergy = this.maxEnergy;
    } else {
      this.currentEnergy = Math.min(this.currentEnergy, this.maxEnergy);
    }
  }

  public canAfford(amount: number): boolean {
    return this.currentEnergy >= Math.max(0, amount);
  }

  public canAffordAbility(id: AbilityCooldownId): boolean {
    return this.canAfford(this.getCost(id));
  }

  public gain(amount: number): number {
    if (amount <= 0) return 0;
    const prev = this.currentEnergy;
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + amount);
    const gained = this.currentEnergy - prev;
    if (gained > 0) {
      this.gainFlashTimer = 0.36;
    }
    return gained;
  }

  public fill(): void {
    const missing = this.maxEnergy - this.currentEnergy;
    if (missing > 0) {
      this.gain(missing);
    }
  }

  public consume(amount: number): boolean {
    const cost = Math.max(0, amount);
    if (cost === 0) return true;
    if (this.currentEnergy < cost) return false;
    this.currentEnergy = Math.max(0, this.currentEnergy - cost);
    this.spendFlashTimer = 0.32;
    return true;
  }

  public consumeForAbility(id: AbilityCooldownId): boolean {
    return this.consume(this.getCost(id));
  }

  public update(dt: number): void {
    if (this.gainFlashTimer > 0) {
      this.gainFlashTimer = Math.max(0, this.gainFlashTimer - dt);
    }
    if (this.spendFlashTimer > 0) {
      this.spendFlashTimer = Math.max(0, this.spendFlashTimer - dt);
    }
  }
}
