interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
}

interface FloatingNumber {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  value: number;
  life: number;
  maxLife: number;
  color: string;
  isCrit: boolean;
}

interface SlashVfx {
  active: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  arcDirection: 'horizontal' | 'horizontal_rev' | 'up' | 'down' | 'special';
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

const PARTICLE_CAPACITY = 160;
const DAMAGE_TEXT_CAPACITY = 24;
const SLASH_VFX_CAPACITY = 12;

export class ParticlePool {
  private particles: Particle[];
  private particleCursor = 0;

  private damageNumbers: FloatingNumber[];
  private damageCursor = 0;

  private slashes: SlashVfx[];
  private slashCursor = 0;

  constructor() {
    this.particles = Array.from({ length: PARTICLE_CAPACITY }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      gravity: 0,
    }));

    this.damageNumbers = Array.from({ length: DAMAGE_TEXT_CAPACITY }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      value: 0,
      life: 0,
      maxLife: 1,
      color: '#f8fafc',
      isCrit: false,
    }));

    this.slashes = Array.from({ length: SLASH_VFX_CAPACITY }, () => ({
      active: false,
      x: 0,
      y: 0,
      facing: 1,
      arcDirection: 'horizontal',
      life: 0,
      maxLife: 0.16,
      radius: 44,
      color: '#f1f5f9',
    }));
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speedMin = 60,
    speedMax = 240,
    gravity = 420,
    dirBiasX = 0
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_CAPACITY;

      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed + dirBiasX;
      p.vy = Math.sin(angle) * speed - 40;
      p.size = 2 + Math.random() * 3.5;
      p.maxLife = 0.22 + Math.random() * 0.24;
      p.life = p.maxLife;
      p.color = color;
      p.gravity = gravity;
    }
  }

  public spawnDamageNumber(x: number, y: number, value: number, isHeavy = false): void {
    const d = this.damageNumbers[this.damageCursor];
    this.damageCursor = (this.damageCursor + 1) % DAMAGE_TEXT_CAPACITY;

    d.active = true;
    d.x = x + (Math.random() - 0.5) * 18;
    d.y = y - 10;
    d.vy = isHeavy ? -95 : -75;
    d.value = value;
    d.maxLife = 0.65;
    d.life = d.maxLife;
    d.color = isHeavy ? '#fbbf24' : '#f1f5f9';
    d.isCrit = isHeavy;
  }

  public spawnSlash(
    x: number,
    y: number,
    facing: 1 | -1,
    arcDirection: SlashVfx['arcDirection'],
    radius: number,
    color: string
  ): void {
    const s = this.slashes[this.slashCursor];
    this.slashCursor = (this.slashCursor + 1) % SLASH_VFX_CAPACITY;

    s.active = true;
    s.x = x;
    s.y = y;
    s.facing = facing;
    s.arcDirection = arcDirection;
    s.maxLife = arcDirection === 'special' ? 0.22 : 0.14;
    s.life = s.maxLife;
    s.radius = radius;
    s.color = color;
  }

  public update(dt: number): void {
    for (let i = 0; i < PARTICLE_CAPACITY; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = 0; i < DAMAGE_TEXT_CAPACITY; i++) {
      const d = this.damageNumbers[i];
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        continue;
      }
      d.y += d.vy * dt;
      d.vy *= Math.exp(-3.5 * dt);
    }

    for (let i = 0; i < SLASH_VFX_CAPACITY; i++) {
      const s = this.slashes[i];
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. Slash arcs
    for (let i = 0; i < SLASH_VFX_CAPACITY; i++) {
      const s = this.slashes[i];
      if (!s.active) continue;
      const progress = 1 - s.life / s.maxLife;
      const alpha = Math.max(0, 1 - progress * progress);

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = alpha;

      if (s.arcDirection === 'up') {
        ctx.rotate(-Math.PI * 0.5);
      } else if (s.arcDirection === 'down') {
        ctx.rotate(Math.PI * 0.5);
      } else if (s.facing === -1) {
        ctx.scale(-1, 1);
      }

      const outerR = s.radius * (0.9 + progress * 0.16);
      const thickness = (s.arcDirection === 'special' ? 18 : 11) * (1 - progress * 0.65);

      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1.5, thickness);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (s.arcDirection === 'special') {
        ctx.arc(0, 0, outerR, -Math.PI * 0.65, Math.PI * 0.65);
      } else if (s.arcDirection === 'horizontal_rev') {
        ctx.arc(0, 0, outerR, -Math.PI * 0.42, Math.PI * 0.48);
      } else {
        ctx.arc(0, 0, outerR, -Math.PI * 0.45, Math.PI * 0.45);
      }
      ctx.stroke();

      // Inner bright core edge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, thickness * 0.32);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Pooled spark particles
    for (let i = 0; i < PARTICLE_CAPACITY; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const s = p.size * (0.5 + 0.5 * alpha);
      ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
    }
    ctx.globalAlpha = 1;

    // 3. Floating damage numbers
    for (let i = 0; i < DAMAGE_TEXT_CAPACITY; i++) {
      const d = this.damageNumbers[i];
      if (!d.active) continue;
      const alpha = Math.min(1, (d.life / d.maxLife) * 1.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = d.isCrit
        ? '700 18px "JetBrains Mono", monospace'
        : '600 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#111317';
      ctx.strokeText(`-${d.value}`, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(`-${d.value}`, d.x, d.y);
      ctx.restore();
    }
  }
}
