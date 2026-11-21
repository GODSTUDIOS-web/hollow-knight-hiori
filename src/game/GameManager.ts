import { AudioSynth } from './AudioSynth';
import { CameraController } from './CameraController';
import { CoinPickupSystem } from './CoinPickupSystem';
import { CollisionSystem } from './CollisionSystem';
import { CurrencySystem } from './CurrencySystem';
import { FrameAdjustmentMap } from './data/hioriAnimationsConfig';
import { DEFAULT_DUMMY_CONFIG, TRAINING_STAGE_CONFIG } from './data/stageConfig';
import { DummyTraining } from './DummyTraining';
import { EnemyController } from './EnemyController';
import { HitboxSystem } from './HitboxSystem';
import { InputManager } from './InputManager';
import { ParticlePool } from './ParticlePool';
import { PlayerController } from './PlayerController';
import { ProjectileSystem } from './ProjectileSystem';
import { SaveSlotData } from './SaveSystem';
import { AreaId, PlayerSkinId } from './SettingsStore';
import {
  AbilityCooldownId,
  DebugSettings,
  DummyConfig,
  FrameBoundsAdjustment,
  GameModeState,
  HudSnapshot,
  StageConfig,
} from './types';

export class GameManager {
  public readonly input: InputManager;
  public readonly audio: AudioSynth;
  public readonly hitboxSystem: HitboxSystem;
  public readonly particles: ParticlePool;
  public readonly projectiles: ProjectileSystem;
  public readonly currency: CurrencySystem;
  public readonly coinPickups: CoinPickupSystem;
  public readonly camera: CameraController;
  public readonly player: PlayerController;
  public readonly enemyController: EnemyController;
  public readonly dummy: DummyTraining;
  public readonly stage: StageConfig;

  public mode: GameModeState = 'title';
  public debug: DebugSettings = {
    showHitboxes: false,
    showHurtboxes: false,
    gravityEnabled: true,
  };

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gridPattern: CanvasPattern | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private hitstopTimer = 0;
  private fpsAccumulator = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private hudEmitTimer = 0;
  private lastHudKey = '';
  private onHudUpdate: ((snapshot: HudSnapshot) => void) | null = null;
  public currentAreaId: AreaId = 'ruins';
  public nearBench = false;
  public nearAreaPortal = false;
  private interactPressedThisFrame = false;
  private onOpenSaveBench: (() => void) | null = null;
  private onRequestAreaTransition: ((nextArea: AreaId) => void) | null = null;
  private onKeyInteractBound: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    stage: StageConfig = TRAINING_STAGE_CONFIG,
    onHudUpdate?: (snapshot: HudSnapshot) => void,
    autostart = false
  ) {
    this.stage = stage;
    this.onHudUpdate = onHudUpdate ?? null;
    this.input = new InputManager();
    this.audio = new AudioSynth();
    this.hitboxSystem = new HitboxSystem();
    this.particles = new ParticlePool();
    this.projectiles = new ProjectileSystem();
    this.currency = new CurrencySystem();
    this.coinPickups = new CoinPickupSystem();
    this.camera = new CameraController(stage.worldWidth, stage.worldHeight);
    this.player = new PlayerController(stage.playerSpawn);
    this.enemyController = new EnemyController();
    this.dummy = new DummyTraining(stage.dummySpawn, DEFAULT_DUMMY_CONFIG);
    this.enemyController.register(this.dummy);

    this.camera.snapTo(this.player.getCenter());
    if (autostart) {
      this.mode = 'playing';
    }
    this.syncBodyDataset();
  }

  public mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.buildGridPattern();
    this.input.attach();

    this.resizeCanvas();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      if (canvas.parentElement) {
        this.resizeObserver.observe(canvas.parentElement);
      }
    }

    this.lastTimestamp = performance.now();
    this.emitHudSnapshot(true);
    this.rafId = requestAnimationFrame(this.loop);

    if (typeof window !== 'undefined') {
      this.onKeyInteractBound = (e: KeyboardEvent) => {
        if (this.mode !== 'playing' || e.repeat) return;
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        if (e.code === 'KeyE') {
          this.interactPressedThisFrame = true;
        }
      };
      window.addEventListener('keydown', this.onKeyInteractBound);
    }
  }

  public unmount(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (typeof window !== 'undefined' && this.onKeyInteractBound) {
      window.removeEventListener('keydown', this.onKeyInteractBound);
      this.onKeyInteractBound = null;
    }
    this.input.detach();
    this.audio.stopSoundtrackPreview();
    this.canvas = null;
    this.ctx = null;
  }

  public setInteractionCallbacks(
    onOpenSaveBench: () => void,
    onRequestAreaTransition: (nextArea: AreaId) => void
  ): void {
    this.onOpenSaveBench = onOpenSaveBench;
    this.onRequestAreaTransition = onRequestAreaTransition;
  }

  public setHudListener(listener: (snapshot: HudSnapshot) => void): void {
    this.onHudUpdate = listener;
    this.emitHudSnapshot(true);
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor(rect.height));

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.camera.setViewport(width, height);
  }

  private syncBodyDataset(): void {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = this.mode;
    }
  }

  public startGame(): void {
    this.mode = 'playing';
    this.input.clearAll();
    this.syncBodyDataset();
    this.emitHudSnapshot(true);
  }

  public pauseGame(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.clearAll();
    this.render();
    this.syncBodyDataset();
    this.emitHudSnapshot(true);
  }

  public resumeGame(): void {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.input.clearAll();
    this.syncBodyDataset();
    this.emitHudSnapshot(true);
  }

  public returnToTitle(): void {
    this.mode = 'title';
    this.resetAll();
    this.syncBodyDataset();
    this.emitHudSnapshot(true);
  }

  public resetPlayer(): void {
    this.player.reset();
    this.projectiles.clear();
    this.camera.snapTo(this.player.getCenter());
    this.emitHudSnapshot(true);
  }

  public resetDummy(): void {
    this.dummy.reset(false);
    this.emitHudSnapshot(true);
  }

  public resetAll(): void {
    this.player.reset();
    this.dummy.reset(true);
    this.projectiles.clear();
    this.currency.reset();
    this.coinPickups.resetStagePickups();
    this.hitstopTimer = 0;
    this.camera.snapTo(this.player.getCenter());
    this.emitHudSnapshot(true);
  }

  public toggleHitboxes(): void {
    this.debug.showHitboxes = !this.debug.showHitboxes;
    this.emitHudSnapshot(true);
  }

  public toggleHurtboxes(): void {
    this.debug.showHurtboxes = !this.debug.showHurtboxes;
    this.emitHudSnapshot(true);
  }

  public toggleGravity(): void {
    this.debug.gravityEnabled = !this.debug.gravityEnabled;
    this.emitHudSnapshot(true);
  }

  public toggleMute(): void {
    this.audio.toggleMute();
    this.emitHudSnapshot(true);
  }

  public testPlayerInvulnerability(): void {
    this.player.health.triggerTestInvulnerability(2.0);
    this.emitHudSnapshot(true);
  }

  public testPlayerDamage(): void {
    const applied = this.player.applyHit(1, 0, 0, this.particles, this.audio);
    if (applied) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
      this.camera.addTrauma(0.4);
    }
    this.emitHudSnapshot(true);
  }

  public healPlayer(amount = 1): void {
    const healed = this.player.health.heal(amount);
    if (healed > 0) {
      const c = this.player.getCenter();
      this.particles.spawnBurst(c.x, c.y, 10, '#f1f5f9', 50, 150, 140);
      this.audio.playHeal();
    }
    this.emitHudSnapshot(true);
  }

  public setPlayerMaxHp(maxHp: number): void {
    this.player.health.setMaxHp(maxHp, true);
    this.emitHudSnapshot(true);
  }

  public addEnergy(amount = 25): void {
    this.player.energy.gain(amount);
    this.emitHudSnapshot(true);
  }

  public fillEnergy(): void {
    this.player.energy.fill();
    this.emitHudSnapshot(true);
  }

  public setMaxEnergy(maxEnergy: number): void {
    this.player.energy.setMaxEnergy(maxEnergy, false);
    this.emitHudSnapshot(true);
  }

  public setAbilityEnergyCost(id: AbilityCooldownId, cost: number): void {
    this.player.energy.setAbilityCost(id, cost);
    this.emitHudSnapshot(true);
  }

  public addCurrency(amount = 1): void {
    const added = this.currency.add(amount);
    if (added > 0) {
      this.audio.playCoinPickup();
    }
    this.emitHudSnapshot(true);
  }

  public spendCurrency(amount = 1): boolean {
    const ok = this.currency.spend(amount);
    this.emitHudSnapshot(true);
    return ok;
  }

  public updateDummyConfig(partial: Partial<DummyConfig>): void {
    this.dummy.setConfig(partial);
    this.emitHudSnapshot(true);
  }

  public setAbilityCooldown(id: AbilityCooldownId, duration: number): void {
    this.player.cooldowns.setDuration(id, duration);
    this.emitHudSnapshot(true);
  }

  public setSkin(skin: PlayerSkinId): void {
    this.player.skin = skin;
    this.emitHudSnapshot(true);
  }

  public getAreaDisplayName(areaId: AreaId = this.currentAreaId): string {
    return areaId === 'cathedral' ? 'Catedral Sombria' : 'Cidade das Ruínas';
  }

  public setArea(areaId: AreaId): void {
    this.currentAreaId = areaId;
    if (areaId === 'cathedral') {
      this.player.movement.position.x = 1860;
      this.player.movement.position.y = 600;
    } else {
      this.player.movement.position.x = this.stage.playerSpawn.x;
      this.player.movement.position.y = this.stage.playerSpawn.y;
    }
    this.player.movement.velocity.x = 0;
    this.player.movement.velocity.y = 0;
    this.camera.snapTo(this.player.getCenter());
    this.emitHudSnapshot(true);
  }

  public healFullAtBench(): void {
    this.player.health.setMaxHp(this.player.health.maxHp, true);
    this.player.energy.fill();
    const c = this.player.getCenter();
    this.particles.spawnBurst(c.x, c.y, 14, '#e9d5ff', 50, 170, 180);
    this.audio.playHeal();
    this.emitHudSnapshot(true);
  }

  public buildSaveData(): SaveSlotData {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      areaId: this.currentAreaId,
      areaName: this.getAreaDisplayName(this.currentAreaId),
      coins: this.currency.getBalance(),
      playerHp: this.player.health.currentHp,
      playerMaxHp: this.player.health.maxHp,
      energy: this.player.energy.getEnergy(),
      maxEnergy: this.player.energy.getMaxEnergy(),
      dummyKills: this.dummy.kills,
      totalDamage: this.dummy.totalDamageTaken,
      selectedSkin: this.player.skin,
    };
  }

  public applySaveData(save: SaveSlotData): void {
    this.resetAll();
    this.currentAreaId = save.areaId;
    this.player.skin = save.selectedSkin;
    this.player.health.setMaxHp(save.playerMaxHp, false);
    this.player.health.currentHp = Math.max(1, Math.min(save.playerMaxHp, save.playerHp));
    this.player.energy.setMaxEnergy(save.maxEnergy, false);
    this.player.energy.currentEnergy = Math.max(0, Math.min(save.maxEnergy, save.energy));
    this.currency.reset(save.coins);
    this.dummy.kills = save.dummyKills;
    this.dummy.totalDamageTaken = save.totalDamage;
    if (this.stage.benchZone && save.areaId === 'ruins') {
      this.player.movement.position.x = this.stage.benchZone.x + 22;
      this.player.movement.position.y = this.stage.benchZone.y - this.player.config.height + 58;
    }
    this.camera.snapTo(this.player.getCenter());
    this.emitHudSnapshot(true);
  }

  public getFrameAdjustments(): FrameAdjustmentMap {
    return this.player.animation.getAdjustments();
  }

  public setFrameAdjustment(key: string, adjustment: FrameBoundsAdjustment): void {
    this.player.animation.setAdjustment(key, adjustment);
  }

  public resetFrameAdjustments(): void {
    this.player.animation.resetAdjustments();
  }

  private loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(Math.max(rawDt, 0), 0.05);

    this.fpsAccumulator += rawDt;
    this.fpsFrames++;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    this.handleGlobalShortcuts();

    if (this.mode === 'playing' || this.mode === 'title') {
      this.stepSimulation(dt);
      this.render();
    }
    this.input.endFrame();

    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.06) {
      this.hudEmitTimer = 0;
      this.emitHudSnapshot(false);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private handleGlobalShortcuts(): void {
    if (this.input.justPressed('mute')) {
      this.toggleMute();
    }

    if (this.mode === 'playing' && this.input.justPressed('pause')) {
      this.pauseGame();
      return;
    }
    if (this.mode === 'paused' && this.input.justPressed('pause')) {
      this.resumeGame();
      return;
    }
    if (this.mode === 'playing' && this.input.justPressed('reset')) {
      this.resetPlayer();
    }
  }

  private stepSimulation(dt: number): void {
    this.elapsedTime += dt;
    const isTitle = this.mode === 'title';

    this.particles.update(dt);
    this.currency.update(dt);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.camera.update(this.player.getCenter(), this.player.movement.facing, dt, isTitle);
      return;
    }

    this.hitboxSystem.clearFrame();

    // Update player
    this.player.update(
      this.input,
      dt,
      this.stage.platforms,
      this.debug.gravityEnabled,
      this.hitboxSystem,
      this.particles,
      this.audio,
      !isTitle,
      this.projectiles
    );

    // Update world crystal coin pickups
    if (!isTitle) {
      this.coinPickups.update(
        dt,
        this.player.getRect(),
        this.stage.platforms,
        this.currency,
        this.particles,
        this.audio
      );
    }

    // Update independent shadow projectiles & effect sprites
    this.projectiles.update(dt, this.stage.platforms, this.hitboxSystem, this.particles);

    // Update enemies / Dummy
    const wasDummyDead = this.dummy.state === 'DEAD';
    this.enemyController.updateAll(dt, this.stage.platforms, this.debug.gravityEnabled, this.hitboxSystem);

    // Register stage hazard hitboxes
    for (let i = 0; i < this.stage.hazards.length; i++) {
      const hz = this.stage.hazards[i];
      this.hitboxSystem.registerHitbox({
        id: hz.id,
        owner: 'hazard',
        ownerId: hz.id,
        rect: hz,
        damage: hz.damage,
        knockbackX: 260,
        knockbackY: hz.knockbackY,
        facing: 1,
        hitstop: 0.055,
        shakeTrauma: 0.42,
        pogoForce: 0,
        hitTargetIds: new Set<string>(),
      });
    }

    // Resolve hitbox/hurtbox collisions
    const hits = this.hitboxSystem.resolveHits();
    const projectileHitIds: string[] = [];

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (hit.hitboxId.startsWith('shadow-proj-')) {
        projectileHitIds.push(hit.hitboxId);
      }

      if (hit.targetId === 'player') {
        const applied = this.player.applyHit(
          hit.finalDamage,
          hit.knockbackVx,
          hit.knockbackVy,
          this.particles,
          this.audio
        );
        if (applied) {
          this.hitstopTimer = Math.max(this.hitstopTimer, hit.hitstop);
          this.camera.addTrauma(hit.shakeTrauma);
        }
      } else {
        const enemy = this.enemyController.getById(hit.targetId);
        if (enemy) {
          enemy.onHit(hit, this.particles);
          this.hitstopTimer = Math.max(this.hitstopTimer, hit.hitstop);
          this.camera.addTrauma(hit.shakeTrauma);
          this.audio.playHit(hit.finalDamage >= 20);

          // Basic melee hits refill Hiori's special energy orb & bar
          if (
            hit.hitboxId.startsWith('attack1-') ||
            hit.hitboxId.startsWith('attack2-') ||
            hit.hitboxId.startsWith('down_slash-')
          ) {
            this.player.energy.gain(this.player.energy.gainOnHit);
          }

          if (hit.pogoForce < 0) {
            this.player.movement.applyPogoBounce(hit.pogoForce);
          }
        }
      }
    }

    if (!wasDummyDead && this.dummy.state === 'DEAD') {
      this.coinPickups.spawnDropBurst(
        this.dummy.position.x + this.dummy.width * 0.5,
        this.dummy.position.y + 12,
        3,
        2
      );
    }

    if (projectileHitIds.length > 0) {
      this.projectiles.resolveImpacts(projectileHitIds, this.particles);
    }

    this.camera.update(this.player.getCenter(), this.player.movement.facing, dt, isTitle);

    if (!isTitle) {
      const pRect = this.player.getRect();
      this.nearBench = this.stage.benchZone
        ? CollisionSystem.intersects(pRect, this.stage.benchZone)
        : false;
      this.nearAreaPortal = this.stage.portalZone
        ? CollisionSystem.intersects(pRect, this.stage.portalZone)
        : false;

      if (this.interactPressedThisFrame) {
        this.interactPressedThisFrame = false;
        if (this.nearBench) {
          this.pauseGame();
          this.onOpenSaveBench?.();
        } else if (this.nearAreaPortal) {
          const nextArea: AreaId = this.currentAreaId === 'ruins' ? 'cathedral' : 'ruins';
          this.onRequestAreaTransition?.(nextArea);
        }
      }
    } else {
      this.interactPressedThisFrame = false;
    }
  }

  private render(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const vw = this.camera.viewportWidth;
    const vh = this.camera.viewportHeight;

    const camX = this.camera.getRenderX();
    const camY = this.camera.getRenderY();
    if (this.gridPattern) {
      this.renderReferenceGrid(ctx, camX, camY, vw, vh);
    } else {
      ctx.fillStyle = this.stage.neutralColor;
      ctx.fillRect(0, 0, vw, vh);
    }

    ctx.save();
    ctx.translate(-camX, -camY);

    this.renderPlatforms(ctx);
    this.renderStageLandmarks(ctx);
    this.renderHazards(ctx);
    this.coinPickups.render(ctx);
    this.enemyController.renderAll(ctx, this.elapsedTime, this.mode !== 'title');
    this.player.render(ctx, this.elapsedTime);
    this.projectiles.render(ctx);
    this.particles.render(ctx);

    if (this.debug.showHurtboxes) {
      this.renderHurtboxesDebug(ctx);
    }
    if (this.debug.showHitboxes) {
      this.renderHitboxesDebug(ctx);
    }

    ctx.restore();
  }

  private buildGridPattern(): void {
    if (!this.ctx || typeof document === 'undefined') return;
    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const tctx = tile.getContext('2d');
    if (!tctx) return;
    tctx.fillStyle = this.stage.neutralColor;
    tctx.fillRect(0, 0, 64, 64);
    tctx.strokeStyle = this.stage.gridColor;
    tctx.lineWidth = 1;
    tctx.beginPath();
    tctx.moveTo(0.5, 0);
    tctx.lineTo(0.5, 64);
    tctx.moveTo(0, 0.5);
    tctx.lineTo(64, 0.5);
    tctx.stroke();
    this.gridPattern = this.ctx.createPattern(tile, 'repeat');
  }

  private renderReferenceGrid(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number
  ): void {
    if (!this.gridPattern) return;
    const ox = -(camX % 64);
    const oy = -(camY % 64);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = this.gridPattern;
    ctx.fillRect(-ox, -oy, vw + 64, vh + 64);
    ctx.restore();
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.stage.platforms.length; i++) {
      const p = this.stage.platforms[i];
      if (p.kind === 'ground') {
        ctx.fillStyle = '#292e38';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#475061';
        ctx.fillRect(p.x, p.y, p.width, 4);
      } else if (p.kind === 'wall') {
        ctx.fillStyle = '#252a33';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = '#3c4452';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
      } else {
        ctx.fillStyle = '#333946';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#647084';
        ctx.fillRect(p.x, p.y, p.width, 3);
      }
    }
  }

  private renderStageLandmarks(ctx: CanvasRenderingContext2D): void {
    // 1. Gothic Save Bench (Banco de Salvamento)
    if (this.stage.benchZone) {
      const bz = this.stage.benchZone;
      const bx = bz.x + 10;
      const by = bz.y + bz.height - 28;
      const bw = bz.width - 20;
      ctx.save();
      // Subtle lantern ambient glow behind bench
      const glow = ctx.createRadialGradient(
        bz.x + bz.width * 0.5,
        by - 4,
        4,
        bz.x + bz.width * 0.5,
        by - 4,
        46
      );
      glow.addColorStop(0, this.nearBench ? 'rgba(196, 181, 253, 0.34)' : 'rgba(167, 139, 250, 0.16)');
      glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(bz.x + bz.width * 0.5, by - 4, 46, 0, Math.PI * 2);
      ctx.fill();

      // Wrought-iron bench frame
      ctx.strokeStyle = this.nearBench ? '#d8b4fe' : '#64748b';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#14161d';
      // Backrest curves
      ctx.beginPath();
      ctx.roundRect(bx + 4, by - 14, bw - 8, 16, 4);
      ctx.fill();
      ctx.stroke();
      // Seat plank
      ctx.fillStyle = '#262b38';
      ctx.fillRect(bx, by, bw, 6);
      ctx.strokeRect(bx, by, bw, 6);
      // Bench legs
      ctx.beginPath();
      ctx.moveTo(bx + 8, by + 6);
      ctx.lineTo(bx + 4, bz.y + bz.height);
      ctx.moveTo(bx + bw - 8, by + 6);
      ctx.lineTo(bx + bw - 4, bz.y + bz.height);
      ctx.stroke();

      if (this.nearBench && this.mode === 'playing') {
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5f3ff';
        ctx.fillText('[E] Banco · Salvar', bz.x + bz.width * 0.5, by - 24);
      }
      ctx.restore();
    }

    // 2. Gothic Cathedral Area Archway (Carregamento por Área)
    if (this.stage.portalZone) {
      const pz = this.stage.portalZone;
      const cx = pz.x + pz.width * 0.5;
      const bottom = pz.y + pz.height;
      ctx.save();
      const portalGlow = ctx.createRadialGradient(cx, bottom - 48, 8, cx, bottom - 48, 66);
      portalGlow.addColorStop(
        0,
        this.nearAreaPortal ? 'rgba(192, 132, 252, 0.42)' : 'rgba(139, 92, 246, 0.22)'
      );
      portalGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = portalGlow;
      ctx.beginPath();
      ctx.arc(cx, bottom - 48, 66, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.nearAreaPortal ? '#e9d5ff' : '#7c3aed';
      ctx.lineWidth = 2.2;
      ctx.fillStyle = 'rgba(17, 12, 28, 0.78)';
      ctx.beginPath();
      ctx.moveTo(pz.x + 12, bottom);
      ctx.lineTo(pz.x + 12, pz.y + 42);
      ctx.quadraticCurveTo(cx, pz.y - 8, pz.x + pz.width - 12, pz.y + 42);
      ctx.lineTo(pz.x + pz.width - 12, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (this.nearAreaPortal && this.mode === 'playing') {
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5f3ff';
        const label =
          this.currentAreaId === 'ruins'
            ? '[E] Entrar na Catedral Sombria'
            : '[E] Voltar às Ruínas';
        ctx.fillText(label, cx, pz.y - 12);
      }
      ctx.restore();
    }
  }

  private renderHazards(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.stage.hazards.length; i++) {
      const hz = this.stage.hazards[i];
      const toothWidth = 15;
      const count = Math.max(1, Math.floor(hz.width / toothWidth));
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      for (let t = 0; t < count; t++) {
        const tx = hz.x + t * toothWidth;
        ctx.beginPath();
        ctx.moveTo(tx, hz.y + hz.height);
        ctx.lineTo(tx + toothWidth * 0.5, hz.y);
        ctx.lineTo(tx + toothWidth, hz.y + hz.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  private renderHurtboxesDebug(ctx: CanvasRenderingContext2D): void {
    const hurtboxes = this.hitboxSystem.getHurtboxes();
    ctx.save();
    for (let i = 0; i < hurtboxes.length; i++) {
      const h = hurtboxes[i];
      ctx.fillStyle = h.invulnerable ? 'rgba(56, 189, 248, 0.22)' : 'rgba(34, 197, 94, 0.22)';
      ctx.strokeStyle = h.invulnerable ? '#38bdf8' : '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.fillRect(h.rect.x, h.rect.y, h.rect.width, h.rect.height);
      ctx.strokeRect(h.rect.x, h.rect.y, h.rect.width, h.rect.height);
    }
    ctx.restore();
  }

  private renderHitboxesDebug(ctx: CanvasRenderingContext2D): void {
    const hitboxes = this.hitboxSystem.getActiveHitboxes();
    ctx.save();
    for (let i = 0; i < hitboxes.length; i++) {
      const hb = hitboxes[i];
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.fillRect(hb.rect.x, hb.rect.y, hb.rect.width, hb.rect.height);
      ctx.strokeRect(hb.rect.x, hb.rect.y, hb.rect.width, hb.rect.height);
    }
    ctx.restore();
  }

  public getHudSnapshot(): HudSnapshot {
    const animState = this.player.animation.getExecutionState();
    return {
      mode: this.mode,
      fps: this.currentFps,
      playerHp: this.player.health.currentHp,
      playerMaxHp: this.player.health.maxHp,
      playerInvulnerable: this.player.health.isInvulnerable(),
      playerHealFlash: this.player.health.healFlashTimer > 0,
      playerHurtFlash: this.player.health.damageFlashTimer > 0,
      playerShadowFormRemaining: Number(this.player.combat.shadowFormTimer.toFixed(1)),
      playerState: this.player.getState(),
      playerAnimName: animState.displayName,
      playerFacing: this.player.movement.facing,
      playerAttackLabel: this.player.combat.currentAttackLabel,
      comboStep: this.player.combat.comboStep,
      energy: this.player.energy.getEnergy(),
      maxEnergy: this.player.energy.getMaxEnergy(),
      energyRatio: Number(this.player.energy.getRatio().toFixed(3)),
      energyFull: this.player.energy.isFull(),
      energyGainFlash: this.player.energy.gainFlashTimer > 0,
      energySpendFlash: this.player.energy.spendFlashTimer > 0,
      abilityEnergyCosts: this.player.energy.getAllCosts(),
      coins: this.currency.getBalance(),
      coinFlash: this.currency.collectFlashTimer > 0,
      nearBench: this.nearBench,
      nearAreaPortal: this.nearAreaPortal,
      currentAreaId: this.currentAreaId,
      currentAreaName: this.getAreaDisplayName(this.currentAreaId),
      selectedSkin: this.player.skin,
      dummyHp: this.dummy.currentHp,
      dummyMaxHp: this.dummy.config.maxHealth,
      dummyState: this.dummy.state,
      dummyRespawnRemaining: Number(this.dummy.respawnTimer.toFixed(1)),
      lastDamage: this.dummy.lastDamageTaken,
      totalDamage: this.dummy.totalDamageTaken,
      dummyKills: this.dummy.kills,
      hitComboCount: this.dummy.hitComboCount,
      hitComboDamage: this.dummy.hitComboDamage,
      hitComboRatio: Number(this.dummy.getHitComboRatio().toFixed(2)),
      cooldowns: this.player.cooldowns.getSnapshot(),
      muted: this.audio.isMuted(),
      debug: { ...this.debug },
      dummyConfig: { ...this.dummy.config },
    };
  }

  private emitHudSnapshot(force: boolean): void {
    if (!this.onHudUpdate) return;
    const snap = this.getHudSnapshot();
    const cooldownKey = snap.cooldowns
      .map((c) => `${c.id}:${c.remaining.toFixed(1)}:${c.total}`)
      .join(',');
    const key = [
      snap.mode,
      snap.fps,
      snap.playerHp,
      snap.playerMaxHp,
      snap.playerInvulnerable,
      snap.playerHealFlash,
      snap.playerHurtFlash,
      snap.playerShadowFormRemaining,
      snap.playerState,
      snap.playerAnimName,
      snap.playerAttackLabel,
      snap.energy,
      snap.maxEnergy,
      snap.energyGainFlash,
      snap.energySpendFlash,
      snap.coins,
      snap.coinFlash,
      snap.nearBench,
      snap.nearAreaPortal,
      snap.currentAreaId,
      snap.selectedSkin,
      snap.dummyHp,
      snap.dummyMaxHp,
      snap.dummyState,
      snap.lastDamage,
      snap.totalDamage,
      snap.dummyKills,
      snap.hitComboCount >= 2 ? snap.hitComboCount : 0,
      snap.hitComboCount >= 2 ? snap.hitComboDamage : 0,
      snap.hitComboCount >= 2 ? snap.hitComboRatio : 0,
      cooldownKey,
      snap.muted,
      snap.debug.showHitboxes,
      snap.debug.showHurtboxes,
      snap.debug.gravityEnabled,
      snap.dummyConfig.maxHealth,
      snap.dummyConfig.defense,
      snap.dummyConfig.knockbackResistance,
      snap.dummyConfig.respawnTime,
    ].join('|');

    if (force || key !== this.lastHudKey) {
      this.lastHudKey = key;
      this.onHudUpdate(snap);
    }
  }
}
