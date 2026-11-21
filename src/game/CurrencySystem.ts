export class CurrencySystem {
  public balance = 0;
  public totalEarned = 0;
  public totalSpent = 0;
  public collectFlashTimer = 0;

  public reset(initialBalance = 0): void {
    this.balance = Math.max(0, Math.round(initialBalance));
    this.totalEarned = 0;
    this.totalSpent = 0;
    this.collectFlashTimer = 0;
  }

  public getBalance(): number {
    return this.balance;
  }

  public add(amount: number): number {
    const value = Math.max(0, Math.round(amount));
    if (value <= 0) return 0;
    this.balance += value;
    this.totalEarned += value;
    this.collectFlashTimer = 0.4;
    return value;
  }

  public canAfford(amount: number): boolean {
    return this.balance >= Math.max(0, Math.round(amount));
  }

  public spend(amount: number): boolean {
    const cost = Math.max(0, Math.round(amount));
    if (cost === 0) return true;
    if (this.balance < cost) return false;
    this.balance -= cost;
    this.totalSpent += cost;
    return true;
  }

  public update(dt: number): void {
    if (this.collectFlashTimer > 0) {
      this.collectFlashTimer = Math.max(0, this.collectFlashTimer - dt);
    }
  }
}
