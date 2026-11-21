import { AudioSynth } from './AudioSynth';
import { CollisionSystem } from './CollisionSystem';
import { CurrencySystem } from './CurrencySystem';
import { ParticlePool } from './ParticlePool';
import { Rect, StagePlatform } from './types';

export interface CrystalCoin {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  value: number;
  floating: boolean;
  bobPhase: number;
  collected: boolean;
}

const CRYSTAL_ICON_URL = '/assets/ui/hud/currency/crystal_icon.png';

const STAGE_INITIAL_CRYSTALS: Array<{ x: number; y: number; value: number }> = [
  { x: 520, y: 580, value: 1 },
  { x: 610, y: 580, value: 1 },
  { x: 895, y: 460, value: 3 },
  { x: 1265, y: 595, value: 2 },
  { x: 1475, y: 712, value: 2 },
  { x: 1960, y: 640, value: 5 },
];

export class CoinPickupSystem {
  private coins: CrystalCoin[] = [];
  private nextId = 1;
  private elapsed = 0;
  private iconImage: HTMLImageElement | null = null;

  constructor() {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = CRYSTAL_ICON_URL;
      this.iconImage = img;
    }
    this.resetStagePickups();
  }

  public resetStagePickups(): void {
    this.coins.length = 0;
    for (let i = 0; i < STAGE_INITIAL_CRYSTALS.length; i++) {
      const c = STAGE_INITIAL_CRYSTALS[i];
      this.coins.push({
        id: this.nextId++,
        x: c.x,
        y: c.y,
        vx: 0,
        vy: 0,
        width: 22,
        height: 28,
        value: c.value,
        floating: true,
        bobPhase: i * 1.1,
        collected: false,
      });
    }
  }

  public spawnDropBurst(x: number, y: number, count: number, valueEach = 1): void {
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) * 0.5) * 95 + (Math.random() - 0.5) * 40;
      this.coins.push({
        id: this.nextId++,
        x: x - 11,
        y: y - 14,
        vx: spread,
        vy: -280 - Math.random() * 140,
        width: 22,
        height: 28,
        value: valueEach,
        floating: false,
        bobPhase: Math.random() * Math.PI * 2,
        collected: false,
      });
    }
  }

  public getActiveCoins(): readonly CrystalCoin[] {
    return this.coins;
  }

  public update(
    dt: number,
    playerRect: Rect,
    platforms: StagePlatform[],
    currency: CurrencySystem,
    particles: ParticlePool,
    audio: AudioSynth
  ): void {
    this.elapsed += dt;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      if (coin.collected) {
        this.coins.splice(i, 1);
        continue;
      }

      if (!coin.floating) {
        coin.vy = Math.min(720, coin.vy + 1250 * dt);
        coin.vx *= Math.exp(-3.2 * dt);
        const res = CollisionSystem.moveAndCollide(
          { x: coin.x, y: coin.y, width: coin.width, height: coin.height },
          { x: coin.vx, y: coin.vy },
          dt,
          platforms,
          false
        );
        coin.x = res.position.x;
        coin.y = res.position.y;
        coin.vx = res.velocity.x;
        coin.vy = res.isGrounded ? 0 : res.velocity.y;
      }

      const coinRect: Rect = { x: coin.x, y: coin.y, width: coin.width, height: coin.height };
      if (CollisionSystem.intersects(playerRect, coinRect)) {
        coin.collected = true;
        currency.add(coin.value);
        particles.spawnBurst(
          coin.x + coin.width * 0.5,
          coin.y + coin.height * 0.5,
          8,
          '#e2e8f0',
          50,
          170,
          200
        );
        audio.playCoinPickup();
        this.coins.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.coins.length; i++) {
      const coin = this.coins[i];
      const bobY = coin.floating ? Math.sin(this.elapsed * 3.4 + coin.bobPhase) * 4 : 0;
      const cx = coin.x + coin.width * 0.5;
      const cy = coin.y + coin.height * 0.5 + bobY;

      ctx.save();
      const pulse = 0.8 + Math.sin(this.elapsed * 5 + coin.bobPhase) * 0.2;
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18 * pulse);
      glow.addColorStop(0, 'rgba(226, 232, 240, 0.28)');
      glow.addColorStop(1, 'rgba(226, 232, 240, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 * pulse, 0, Math.PI * 2);
      ctx.fill();

      if (this.iconImage && this.iconImage.complete && this.iconImage.naturalWidth > 0) {
        const dw = 22;
        const dh = (this.iconImage.naturalHeight / this.iconImage.naturalWidth) * dw;
        ctx.drawImage(this.iconImage, cx - dw * 0.5, cy - dh * 0.5, dw, dh);
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 11);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 11);
        ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
