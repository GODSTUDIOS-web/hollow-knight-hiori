import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioSynth } from './AudioSynth';
import { CoinPickupSystem } from './CoinPickupSystem';
import { CollisionSystem } from './CollisionSystem';
import { CooldownSystem, DEFAULT_ABILITY_COOLDOWNS } from './CooldownSystem';
import { CurrencySystem } from './CurrencySystem';
import { ATTACKS_CONFIG } from './data/attacksConfig';
import { DEFAULT_PLAYER_CONFIG } from './data/playerConfig';
import { DEFAULT_DUMMY_CONFIG, TRAINING_STAGE_CONFIG } from './data/stageConfig';
import { DUMMY_HIT_COMBO_WINDOW, DummyTraining } from './DummyTraining';
import { EnergySystem } from './EnergySystem';
import { HitboxSystem } from './HitboxSystem';
import { ParticlePool } from './ParticlePool';
import { PlayerCombat } from './PlayerCombat';
import { PlayerHealth } from './PlayerHealth';
import { PlayerMovement } from './PlayerMovement';
import { ProjectileSystem } from './ProjectileSystem';
import { clearSaveData, hasSaveData, readSaveData, writeSaveData } from './SaveSystem';
import { clampVolume, DEFAULT_SETTINGS, loadSettings, saveSettings } from './SettingsStore';

test('CollisionSystem resolves solid ground and wall collisions cleanly', () => {
  const platforms = TRAINING_STAGE_CONFIG.platforms;
  const floorY = 820;

  // Falling onto solid floor
  const fallRes = CollisionSystem.moveAndCollide(
    { x: 300, y: floorY - 52 - 5, width: 30, height: 52 },
    { x: 0, y: 400 },
    0.05,
    platforms,
    false
  );
  assert.equal(fallRes.isGrounded, true);
  assert.equal(fallRes.position.y, floorY - 52);
  assert.equal(fallRes.velocity.y, 0);

  // Moving left into left boundary wall (x = 0, width = 56)
  const wallRes = CollisionSystem.moveAndCollide(
    { x: 60, y: floorY - 52, width: 30, height: 52 },
    { x: -300, y: 0 },
    0.05,
    platforms,
    false
  );
  assert.equal(wallRes.onWallLeft, true);
  assert.equal(wallRes.position.x, 56);
  assert.equal(wallRes.velocity.x, 0);
});

test('HitboxSystem computes mitigated damage, centered 360 hitbox, and deduplicates per swing', () => {
  const hitboxSys = new HitboxSystem();
  const sharedHitSet = new Set<string>();
  const playerRect = { x: 800, y: 760, width: 30, height: 52 };
  const attack = ATTACKS_CONFIG.attack1; // damage 14, knockbackX 220

  const hbRect = HitboxSystem.createAttackHitboxRect(playerRect, 1, attack);
  hitboxSys.registerHitbox({
    id: 'swing-1',
    owner: 'player',
    ownerId: 'player',
    rect: hbRect,
    damage: attack.damage,
    knockbackX: attack.knockbackX,
    knockbackY: attack.knockbackY,
    facing: 1,
    hitstop: attack.hitstop,
    shakeTrauma: attack.shakeTrauma,
    pogoForce: attack.pogoForce,
    hitTargetIds: sharedHitSet,
  });

  hitboxSys.registerHurtbox({
    id: 'dummy-1',
    owner: 'enemy',
    rect: { x: 850, y: 750, width: 38, height: 68 },
    invulnerable: false,
    defense: 4,
    knockbackResistance: 0.5,
  });

  const hits1 = hitboxSys.resolveHits();
  assert.equal(hits1.length, 1);
  assert.equal(hits1[0].finalDamage, 10); // 14 - 4
  assert.equal(hits1[0].knockbackVx, 110); // 220 * (1 - 0.5)

  // Second frame of same swing should not hit the same target again
  const hits2 = hitboxSys.resolveHits();
  assert.equal(hits2.length, 0);

  // Centered 360-degree spin hitbox covers symmetrically around actor center
  const spinRect = HitboxSystem.createAttackHitboxRect(playerRect, 1, ATTACKS_CONFIG.attack3);
  const playerCenterX = playerRect.x + playerRect.width * 0.5;
  assert.equal(spinRect.x + spinRect.width * 0.5, playerCenterX);
});

test('CooldownSystem enforces exact default durations independently and supports custom tuning', () => {
  const cd = new CooldownSystem();
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.attack1.duration, 0.35);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.attack2.duration, 0.65);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.attack3.duration, 1.2);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.attack4.duration, 1.5);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.transformation.duration, 5.0);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.shadow_dash.duration, 1.5);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.shadow_projectile.duration, 2.0);
  assert.equal(DEFAULT_ABILITY_COOLDOWNS.double_jump.duration, 0.2);

  cd.trigger('attack1');
  assert.equal(cd.isReady('attack1'), false);
  assert.equal(cd.isReady('attack2'), true);

  cd.update(0.2);
  assert.equal(cd.isReady('attack1'), false);
  assert.ok(Math.abs(cd.getRemaining('attack1') - 0.15) < 1e-6);

  cd.update(0.2);
  assert.equal(cd.isReady('attack1'), true);
  assert.equal(cd.getRemaining('attack1'), 0);

  cd.setDuration('shadow_projectile', 1.0);
  cd.trigger('shadow_projectile');
  assert.equal(cd.getRemaining('shadow_projectile'), 1.0);
});

test('PlayerMovement handles walk, run, jump, double jump (0.2s cd), and shadow dash (1.5s cd)', () => {
  const platforms = TRAINING_STAGE_CONFIG.platforms;
  const cd = new CooldownSystem();
  const move = new PlayerMovement({ x: 340, y: 820 - 52 }, DEFAULT_PLAYER_CONFIG, cd);

  // Step once to ground
  move.update(
    {
      moveX: 0,
      runHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      jumpJustReleased: false,
      dashJustPressed: false,
      downHeld: false,
    },
    0.016,
    platforms,
    true,
    true,
    false
  );
  assert.equal(move.isGrounded, true);

  // Jump
  const jumpEv = move.update(
    {
      moveX: 1,
      runHeld: true,
      jumpJustPressed: true,
      jumpHeld: true,
      jumpJustReleased: false,
      dashJustPressed: false,
      downHeld: false,
    },
    0.016,
    platforms,
    true,
    true,
    false
  );
  assert.equal(jumpEv.jumped, true);
  assert.equal(move.isGrounded, false);
  assert.equal(move.doubleJumpAvailable, true);

  // Double jump in air triggers 0.2s cooldown
  const djEv = move.update(
    {
      moveX: 1,
      runHeld: true,
      jumpJustPressed: true,
      jumpHeld: true,
      jumpJustReleased: false,
      dashJustPressed: false,
      downHeld: false,
    },
    0.016,
    platforms,
    true,
    true,
    false
  );
  assert.equal(djEv.doubleJumped, true);
  assert.equal(move.doubleJumpAvailable, false);
  assert.equal(cd.isReady('double_jump'), false);

  // Shadow dash triggers 1.5s cooldown
  const dashEv = move.update(
    {
      moveX: 1,
      runHeld: false,
      jumpJustPressed: false,
      jumpHeld: false,
      jumpJustReleased: false,
      dashJustPressed: true,
      downHeld: false,
    },
    0.016,
    platforms,
    true,
    true,
    false
  );
  assert.equal(dashEv.dashed, true);
  assert.equal(move.isDashing, true);
  assert.equal(move.velocity.x, DEFAULT_PLAYER_CONFIG.dashSpeed);
  assert.equal(cd.isReady('shadow_dash'), false);
  assert.equal(cd.getRemaining('shadow_dash'), 1.5);
});

test('PlayerCombat dispatches J, J+J combo, W+J, K, D+K, I transformation, and O projectile with cooldowns', () => {
  const cd = new CooldownSystem();
  const combat = new PlayerCombat(cd);

  // J -> attack1 + 0.35s cooldown
  const a1 = combat.update(
    { attackJustPressed: true, specialJustPressed: false, upHeld: false, downHeld: false, isGrounded: true },
    0.016,
    true
  );
  assert.equal(a1.startedAttack?.id, 'attack1');
  assert.equal(cd.isReady('attack1'), false);

  // Advance past attack1 animation & cooldown (0.36s), then press J again -> J+J combo
  for (let i = 0; i < 18; i++) {
    cd.update(0.02);
    combat.update(
      { attackJustPressed: false, specialJustPressed: false, upHeld: false, downHeld: false, isGrounded: true },
      0.02,
      true
    );
  }
  assert.equal(cd.isReady('attack1'), true);
  const a1Combo = combat.update(
    { attackJustPressed: true, specialJustPressed: false, upHeld: false, downHeld: false, isGrounded: true },
    0.016,
    true
  );
  assert.equal(a1Combo.startedAttack?.id, 'attack1');
  assert.equal(a1Combo.comboFollowup, true);

  combat.reset();
  cd.resetAll();

  // W + J -> attack2 (vertical slash)
  const a2 = combat.update(
    { attackJustPressed: true, specialJustPressed: false, upHeld: true, downHeld: false, isGrounded: true },
    0.016,
    true
  );
  assert.equal(a2.startedAttack?.id, 'attack2');
  assert.equal(cd.isReady('attack2'), false);

  combat.reset();
  cd.resetAll();

  // Neutral K -> attack3 (360 spin)
  const a3 = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: true,
      upHeld: false,
      downHeld: false,
      moveX: 0,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(a3.startedAttack?.id, 'attack3');
  assert.equal(cd.isReady('attack3'), false);

  combat.reset();
  cd.resetAll();

  // D + K -> attack4 (Investida)
  const a4 = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: true,
      upHeld: false,
      downHeld: false,
      moveX: 1,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(a4.startedAttack?.id, 'attack4');
  assert.equal(cd.isReady('attack4'), false);

  combat.reset();
  cd.resetAll();

  // O -> shadow_projectile spawn + 2.0s cooldown blocks immediate second cast
  const proj = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: false,
      projectileJustPressed: true,
      upHeld: false,
      downHeld: false,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(proj.spawnedProjectile, true);
  assert.equal(cd.isReady('shadow_projectile'), false);

  // I -> transformation_burst + Shadow Form damage boost
  combat.reset();
  const transf = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: false,
      transformationJustPressed: true,
      upHeld: false,
      downHeld: false,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(transf.startedTransformation, true);
  assert.equal(transf.startedAttack?.id, 'transformation_burst');
  assert.ok(combat.shadowFormTimer > 0);
  assert.ok(combat.getDamageMultiplier() > 1);
  assert.equal(cd.isReady('transformation'), false);
});

test('ProjectileSystem moves shadow projectile, registers hitbox, and collides with walls', () => {
  const projSys = new ProjectileSystem();
  const hitboxSys = new HitboxSystem();
  const particles = new ParticlePool();

  projSys.spawnShadowProjectile(400, 780, 1, 1);
  assert.equal(projSys.getActiveProjectiles().length, 1);

  projSys.update(0.05, TRAINING_STAGE_CONFIG.platforms, hitboxSys, particles);
  assert.equal(projSys.getActiveProjectiles().length, 1);
  assert.ok(projSys.getActiveProjectiles()[0].x > 400 - 24);
  assert.equal(hitboxSys.getActiveHitboxes().length, 1);

  // Move into right wall (x = 2144)
  projSys.clear();
  projSys.spawnShadowProjectile(2130, 780, 1, 1);
  projSys.update(0.05, TRAINING_STAGE_CONFIG.platforms, hitboxSys, particles);
  assert.equal(projSys.getActiveProjectiles().length, 0);
});

test('DummyTraining takes damage, dies, and respawns automatically', () => {
  const dummy = new DummyTraining(
    { x: 860, y: 820 - 68 },
    { ...DEFAULT_DUMMY_CONFIG, maxHealth: 30, respawnTime: 0.5 }
  );
  const particles = new ParticlePool();
  const hitboxSys = new HitboxSystem();

  dummy.onHit(
    {
      hitboxId: 'test',
      targetId: dummy.id,
      finalDamage: 30,
      knockbackVx: 200,
      knockbackVy: -100,
      hitPointX: 870,
      hitPointY: 780,
      hitstop: 0.04,
      shakeTrauma: 0.2,
      pogoForce: 0,
    },
    particles
  );

  assert.equal(dummy.currentHp, 0);
  assert.equal(dummy.state, 'DEAD');
  assert.equal(dummy.kills, 1);

  // Advance through death animation + respawn timer
  for (let i = 0; i < 65; i++) {
    dummy.update(0.02, TRAINING_STAGE_CONFIG.platforms, true, hitboxSys);
  }
  assert.equal(dummy.state, 'IDLE');
  assert.equal(dummy.currentHp, 30);
});

test('PlayerHealth enforces invulnerability frames and triggers respawn after death', () => {
  const health = new PlayerHealth(DEFAULT_PLAYER_CONFIG);
  const firstHit = health.takeDamage(2);
  assert.equal(firstHit.applied, true);
  assert.equal(health.currentHp, 3);
  assert.equal(health.isInvulnerable(), true);

  // Blocked by invulnerability frames
  const blockedHit = health.takeDamage(2);
  assert.equal(blockedHit.applied, false);
  assert.equal(health.currentHp, 3);

  // Expire invulnerability and deal lethal damage
  health.invulnerabilityTimer = 0;
  const lethal = health.takeDamage(5);
  assert.equal(lethal.applied, true);
  assert.equal(lethal.died, true);
  assert.equal(health.isDead, true);

  const res = health.update(DEFAULT_PLAYER_CONFIG.deathRespawnDelay + 0.05);
  assert.equal(res.shouldRespawn, true);
});

test('DummyTraining tracks multi-hit combo within window and resets after cooldown', () => {
  const dummy = new DummyTraining(
    { x: 860, y: 820 - 68 },
    { ...DEFAULT_DUMMY_CONFIG, maxHealth: 200 }
  );
  const particles = new ParticlePool();
  const hitboxSys = new HitboxSystem();

  const makeHit = (damage: number) => ({
    hitboxId: 'combo-test',
    targetId: dummy.id,
    finalDamage: damage,
    knockbackVx: 80,
    knockbackVy: -40,
    hitPointX: 870,
    hitPointY: 780,
    hitstop: 0.03,
    shakeTrauma: 0.15,
    pogoForce: 0,
  });

  dummy.onHit(makeHit(12), particles);
  assert.equal(dummy.hitComboCount, 1);
  assert.equal(dummy.getHitComboRatio(), 0);

  dummy.update(0.5, TRAINING_STAGE_CONFIG.platforms, true, hitboxSys);
  dummy.onHit(makeHit(15), particles);
  assert.equal(dummy.hitComboCount, 2);
  assert.equal(dummy.hitComboDamage, 27);
  assert.equal(dummy.getHitComboRatio(), 1);

  dummy.update(0.3, TRAINING_STAGE_CONFIG.platforms, true, hitboxSys);
  dummy.onHit(makeHit(24), particles);
  assert.equal(dummy.hitComboCount, 3);
  assert.equal(dummy.hitComboDamage, 51);

  for (let i = 0; i < Math.ceil((DUMMY_HIT_COMBO_WINDOW + 0.1) / 0.1); i++) {
    dummy.update(0.1, TRAINING_STAGE_CONFIG.platforms, true, hitboxSys);
  }
  assert.equal(dummy.hitComboCount, 0);
  assert.equal(dummy.hitComboDamage, 0);
  assert.equal(dummy.getHitComboRatio(), 0);
});

test('EnergySystem tracks gain, spend, full state, max energy scaling, and gates PlayerCombat special skills', () => {
  const energy = new EnergySystem({ maxEnergy: 100, startingEnergy: 10 });
  const cd = new CooldownSystem();
  const combat = new PlayerCombat(cd, energy);

  assert.equal(energy.getEnergy(), 10);
  assert.equal(energy.isFull(), false);

  // Insufficient energy blocks shadow_projectile (cost 20)
  const blocked = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: false,
      projectileJustPressed: true,
      upHeld: false,
      downHeld: false,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(blocked.spawnedProjectile, false);
  assert.equal(energy.getEnergy(), 10);

  // Gain energy -> fills and triggers gainFlashTimer
  energy.gain(90);
  assert.equal(energy.getEnergy(), 100);
  assert.equal(energy.isFull(), true);
  assert.ok(energy.gainFlashTimer > 0);

  // Cast shadow_projectile -> consumes 20 energy
  const cast = combat.update(
    {
      attackJustPressed: false,
      specialJustPressed: false,
      projectileJustPressed: true,
      upHeld: false,
      downHeld: false,
      isGrounded: true,
    },
    0.016,
    true
  );
  assert.equal(cast.spawnedProjectile, true);
  assert.equal(energy.getEnergy(), 80);
  assert.ok(energy.spendFlashTimer > 0);

  // Configurable max energy & cost
  energy.setMaxEnergy(150);
  assert.equal(energy.getMaxEnergy(), 150);
  energy.setAbilityCost('attack3', 25);
  assert.equal(energy.getCost('attack3'), 25);
});

test('PlayerHealth heal and setMaxHp restore and expand health masks cleanly', () => {
  const health = new PlayerHealth(DEFAULT_PLAYER_CONFIG);
  assert.equal(health.maxHp, 5);
  health.takeDamage(2);
  assert.equal(health.currentHp, 3);

  const healed = health.heal(1);
  assert.equal(healed, 1);
  assert.equal(health.currentHp, 4);
  assert.ok(health.healFlashTimer > 0);

  health.setMaxHp(7, true);
  assert.equal(health.maxHp, 7);
  assert.equal(health.currentHp, 6);
});

test('CurrencySystem and CoinPickupSystem start at 0, collect crystals on touch, and support spending', () => {
  const currency = new CurrencySystem();
  const pickups = new CoinPickupSystem();
  const particles = new ParticlePool();
  const audio = new AudioSynth();

  assert.equal(currency.getBalance(), 0);
  const initialCoins = pickups.getActiveCoins();
  assert.ok(initialCoins.length >= 1);

  const first = initialCoins[0];
  pickups.update(
    0.016,
    { x: first.x, y: first.y, width: 30, height: 52 },
    TRAINING_STAGE_CONFIG.platforms,
    currency,
    particles,
    audio
  );
  assert.equal(currency.getBalance(), first.value);
  assert.ok(currency.collectFlashTimer > 0);

  assert.equal(currency.spend(first.value), true);
  assert.equal(currency.getBalance(), 0);
  assert.equal(currency.spend(10), false);
});

test('SettingsStore persists music/sfx volumes, language, displayMode, and skins cleanly', () => {
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
  };

  assert.equal(clampVolume(1.5), 1);
  assert.equal(clampVolume(-0.2), 0);

  const initial = loadSettings(mockStorage);
  assert.equal(initial.musicVolume, DEFAULT_SETTINGS.musicVolume);
  assert.equal(initial.language, 'pt-BR');

  saveSettings(
    {
      musicVolume: 0.42,
      sfxVolume: 0.65,
      language: 'en',
      displayMode: 'fullscreen',
      selectedSkin: 'shadow_violet',
      unlockedSkins: ['classic', 'shadow_violet'],
    },
    mockStorage
  );

  const reloaded = loadSettings(mockStorage);
  assert.equal(reloaded.musicVolume, 0.42);
  assert.equal(reloaded.sfxVolume, 0.65);
  assert.equal(reloaded.language, 'en');
  assert.equal(reloaded.displayMode, 'fullscreen');
  assert.equal(reloaded.selectedSkin, 'shadow_violet');
  assert.deepEqual(reloaded.unlockedSkins, ['classic', 'shadow_violet']);
});

test('SaveSystem writes, reads, and clears bench progress for Continue flow', () => {
  const mem = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };

  assert.equal(hasSaveData(mockStorage), false);
  writeSaveData(
    {
      version: 1,
      savedAt: '2026-11-21T00:00:00.000Z',
      areaId: 'cathedral',
      areaName: 'Catedral Sombria',
      coins: 120,
      playerHp: 5,
      playerMaxHp: 5,
      energy: 100,
      maxEnergy: 100,
      dummyKills: 3,
      totalDamage: 300,
      selectedSkin: 'pale_knight',
    },
    mockStorage
  );

  assert.equal(hasSaveData(mockStorage), true);
  const loaded = readSaveData(mockStorage);
  assert.equal(loaded?.coins, 120);
  assert.equal(loaded?.areaId, 'cathedral');
  assert.equal(loaded?.selectedSkin, 'pale_knight');

  clearSaveData(mockStorage);
  assert.equal(hasSaveData(mockStorage), false);
});


