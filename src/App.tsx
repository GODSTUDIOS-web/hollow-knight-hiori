import { useCallback, useEffect, useRef, useState } from 'react';
import { FrameAdjusterModal } from './components/FrameAdjusterModal';
import { HUDController } from './components/hud/HUDController';
import { PauseModal } from './components/PauseModal';
import { TitleOverlay } from './components/TitleOverlay';
import { CreditsModal } from './components/ui/CreditsModal';
import { ExtrasModal } from './components/ui/ExtrasModal';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { SaveBenchModal } from './components/ui/SaveBenchModal';
import { SettingsModal } from './components/ui/SettingsModal';
import { CooldownSystem } from './game/CooldownSystem';
import { FrameAdjustmentMap } from './game/data/hioriAnimationsConfig';
import { DEFAULT_DUMMY_CONFIG, TRAINING_STAGE_CONFIG } from './game/data/stageConfig';
import { DEFAULT_ENERGY_CONFIG } from './game/EnergySystem';
import { GameManager } from './game/GameManager';
import { clearSaveData, readSaveData, SaveSlotData, writeSaveData } from './game/SaveSystem';
import {
  AreaId,
  DisplayMode,
  GameSettings,
  loadSettings,
  PlayerSkinId,
  saveSettings,
} from './game/SettingsStore';
import {
  AbilityCooldownId,
  ActionBindings,
  DummyConfig,
  FrameBoundsAdjustment,
  HudSnapshot,
  InputAction,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  mode: 'title',
  fps: 60,
  playerHp: 5,
  playerMaxHp: 5,
  playerInvulnerable: false,
  playerHealFlash: false,
  playerHurtFlash: false,
  playerShadowFormRemaining: 0,
  playerState: 'IDLE',
  playerAnimName: 'Idle (Parado)',
  playerFacing: 1,
  playerAttackLabel: '—',
  comboStep: 0,
  energy: DEFAULT_ENERGY_CONFIG.startingEnergy,
  maxEnergy: DEFAULT_ENERGY_CONFIG.maxEnergy,
  energyRatio: DEFAULT_ENERGY_CONFIG.startingEnergy / DEFAULT_ENERGY_CONFIG.maxEnergy,
  energyFull: false,
  energyGainFlash: false,
  energySpendFlash: false,
  abilityEnergyCosts: { ...DEFAULT_ENERGY_CONFIG.abilityCosts },
  coins: 0,
  coinFlash: false,
  nearBench: false,
  nearAreaPortal: false,
  currentAreaId: 'ruins',
  currentAreaName: 'Cidade das Ruínas',
  selectedSkin: 'classic',
  dummyHp: DEFAULT_DUMMY_CONFIG.maxHealth,
  dummyMaxHp: DEFAULT_DUMMY_CONFIG.maxHealth,
  dummyState: 'IDLE',
  dummyRespawnRemaining: 0,
  lastDamage: 0,
  totalDamage: 0,
  dummyKills: 0,
  hitComboCount: 0,
  hitComboDamage: 0,
  hitComboRatio: 0,
  cooldowns: new CooldownSystem().getSnapshot(),
  muted: false,
  debug: {
    showHitboxes: false,
    showHurtboxes: false,
    gravityEnabled: true,
  },
  dummyConfig: { ...DEFAULT_DUMMY_CONFIG },
};

type ActiveSubOverlay = 'none' | 'extras' | 'settings' | 'credits' | 'save_bench';

interface LoadingState {
  active: boolean;
  variant: 'initial' | 'area';
  targetArea: AreaId;
  progress: number;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<GameManager | null>(null);
  const loadingTimerRef = useRef<number | null>(null);

  const [snapshot, setSnapshot] = useState<HudSnapshot>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [savedSlot, setSavedSlot] = useState<SaveSlotData | null>(() => readSaveData());
  const [subOverlay, setSubOverlay] = useState<ActiveSubOverlay>('none');
  const [soundtrackPlaying, setSoundtrackPlaying] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    active: false,
    variant: 'initial',
    targetArea: 'ruins',
    progress: 0,
  });

  const [debugOpen, setDebugOpen] = useState(false);
  const [frameAdjusterOpen, setFrameAdjusterOpen] = useState(false);
  const [frameAdjustments, setFrameAdjustments] = useState<FrameAdjustmentMap>({});
  const [bindings, setBindings] = useState<ActionBindings | null>(null);

  const runLoadingTransition = useCallback(
    (variant: 'initial' | 'area', targetArea: AreaId, onComplete: () => void) => {
      if (loadingTimerRef.current !== null) {
        window.clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      setLoading({ active: true, variant, targetArea, progress: 12 });
      const startTime = performance.now();
      const durationMs = 760;

      loadingTimerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        const pct = Math.min(100, Math.round(12 + (elapsed / durationMs) * 88));
        setLoading({ active: true, variant, targetArea, progress: pct });

        if (elapsed >= durationMs) {
          if (loadingTimerRef.current !== null) {
            window.clearInterval(loadingTimerRef.current);
            loadingTimerRef.current = null;
          }
          setLoading((prev) => ({ ...prev, active: false, progress: 100 }));
          onComplete();
        }
      }, 45);
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const initialSettings = loadSettings();
    const manager = new GameManager(
      TRAINING_STAGE_CONFIG,
      (next) => setSnapshot(next),
      autostart
    );
    manager.audio.setMusicVolume(initialSettings.musicVolume);
    manager.audio.setSfxVolume(initialSettings.sfxVolume);
    manager.setSkin(initialSettings.selectedSkin);

    manager.setInteractionCallbacks(
      () => {
        setSubOverlay('save_bench');
      },
      (nextArea: AreaId) => {
        manager.pauseGame();
        runLoadingTransition('area', nextArea, () => {
          manager.setArea(nextArea);
          manager.resumeGame();
          canvasRef.current?.focus();
        });
      }
    );

    managerRef.current = manager;
    setBindings(manager.input.getBindings());
    setFrameAdjustments(manager.getFrameAdjustments());

    if (canvasRef.current) {
      manager.mount(canvasRef.current);
    }

    return () => {
      if (loadingTimerRef.current !== null) {
        window.clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      manager.unmount();
      managerRef.current = null;
    };
  }, [runLoadingTransition]);

  const handlePlayNew = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    setSubOverlay('none');
    runLoadingTransition('initial', 'ruins', () => {
      manager.resetAll();
      manager.setSkin(settings.selectedSkin);
      manager.startGame();
      canvasRef.current?.focus();
    });
  }, [runLoadingTransition, settings.selectedSkin]);

  const handleContinueSaved = useCallback(() => {
    const manager = managerRef.current;
    const slot = readSaveData();
    if (!manager || !slot) return;
    setSubOverlay('none');
    runLoadingTransition('initial', slot.areaId, () => {
      manager.applySaveData(slot);
      manager.startGame();
      canvasRef.current?.focus();
    });
  }, [runLoadingTransition]);

  const handleUpdateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = saveSettings({ ...prev, ...partial });
      const manager = managerRef.current;
      if (manager) {
        manager.audio.setMusicVolume(next.musicVolume);
        manager.audio.setSfxVolume(next.sfxVolume);
        manager.setSkin(next.selectedSkin);
      }
      return next;
    });
  }, []);

  const handleToggleDisplayMode = useCallback(
    (mode: DisplayMode) => {
      handleUpdateSettings({ displayMode: mode });
      if (typeof document === 'undefined') return;
      if (mode === 'fullscreen') {
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen?.().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    },
    [handleUpdateSettings]
  );

  const handleSelectSkin = useCallback(
    (skin: PlayerSkinId) => {
      handleUpdateSettings({ selectedSkin: skin });
    },
    [handleUpdateSettings]
  );

  const handleUnlockSkin = useCallback(
    (skin: PlayerSkinId, cost: number): boolean => {
      const manager = managerRef.current;
      const currentSave = readSaveData();
      const activeBalance =
        snapshot.mode === 'title' ? (currentSave?.coins ?? 0) : snapshot.coins;

      if (activeBalance < cost) return false;

      if (snapshot.mode === 'title' && currentSave) {
        const updatedSave = writeSaveData({
          ...currentSave,
          coins: Math.max(0, currentSave.coins - cost),
          selectedSkin: skin,
        });
        setSavedSlot(updatedSave);
      } else if (manager) {
        if (!manager.spendCurrency(cost)) return false;
      }

      handleUpdateSettings({
        unlockedSkins: Array.from(new Set([...settings.unlockedSkins, skin])),
        selectedSkin: skin,
      });
      return true;
    },
    [handleUpdateSettings, settings.unlockedSkins, snapshot.coins, snapshot.mode]
  );

  const handleConfirmBenchSave = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.healFullAtBench();
    const saved = writeSaveData(manager.buildSaveData());
    setSavedSlot(saved);
  }, []);

  const handleCloseSaveBench = useCallback(() => {
    setSubOverlay('none');
    if (snapshot.mode === 'paused') {
      managerRef.current?.resumeGame();
      canvasRef.current?.focus();
    }
  }, [snapshot.mode]);

  const handleExitSession = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
    }
    clearSaveData();
    setSavedSlot(null);
    managerRef.current?.resetAll();
  }, []);

  // 'T' debug shortcut during active play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const manager = managerRef.current;
      if (!manager) return;
      if (e.code === 'Escape' && subOverlay !== 'none') {
        if (subOverlay === 'save_bench') {
          handleCloseSaveBench();
        } else {
          setSubOverlay('none');
        }
        return;
      }
      if (manager.mode === 'playing' && e.code === 'KeyT') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        setDebugOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCloseSaveBench, subOverlay]);

  const handleRebindAction = useCallback((action: InputAction, onDone: () => void) => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.input.startRebind(action, () => {
      setBindings(manager.input.getBindings());
      onDone();
    });
  }, []);

  const handleResetBindings = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.input.resetBindings();
    setBindings(manager.input.getBindings());
  }, []);

  const handleUpdateDummyConfig = useCallback((partial: Partial<DummyConfig>) => {
    managerRef.current?.updateDummyConfig(partial);
  }, []);

  const handleSetAbilityCooldown = useCallback((id: AbilityCooldownId, duration: number) => {
    managerRef.current?.setAbilityCooldown(id, duration);
  }, []);

  const handleChangeFrameAdjustment = useCallback(
    (key: string, adjustment: FrameBoundsAdjustment) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.setFrameAdjustment(key, adjustment);
      setFrameAdjustments(manager.getFrameAdjustments());
    },
    []
  );

  const handleResetFrameAdjustments = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.resetFrameAdjustments();
    setFrameAdjustments({});
  }, []);

  const availableCoinsForExtras =
    snapshot.mode === 'title' ? (savedSlot?.coins ?? 0) : snapshot.coins;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#181b20]">
      {/* Isolated Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          tabIndex={0}
          className="block w-full h-full outline-none"
        />
      </div>

      {snapshot.mode === 'title' && !loading.active && (
        <TitleOverlay
          hasSave={savedSlot !== null}
          savedAreaName={savedSlot?.areaName}
          language={settings.language}
          modalOpen={subOverlay !== 'none'}
          onPlay={handlePlayNew}
          onContinue={handleContinueSaved}
          onOpenExtras={() => setSubOverlay('extras')}
          onOpenSettings={() => setSubOverlay('settings')}
          onOpenCredits={() => setSubOverlay('credits')}
          onExit={handleExitSession}
        />
      )}

      {snapshot.mode === 'playing' && !loading.active && bindings && (
        <HUDController
          snapshot={snapshot}
          debugOpen={debugOpen}
          bindings={bindings}
          onToggleDebug={() => setDebugOpen((v) => !v)}
          onToggleMute={() => managerRef.current?.toggleMute()}
          onPause={() => managerRef.current?.pauseGame()}
          onResetPlayer={() => managerRef.current?.resetPlayer()}
          onToggleHitboxes={() => managerRef.current?.toggleHitboxes()}
          onToggleHurtboxes={() => managerRef.current?.toggleHurtboxes()}
          onToggleGravity={() => managerRef.current?.toggleGravity()}
          onTestInvulnerability={() => managerRef.current?.testPlayerInvulnerability()}
          onTestDamage={() => managerRef.current?.testPlayerDamage()}
          onHealPlayer={() => managerRef.current?.healPlayer(1)}
          onSetMaxHp={(maxHp) => managerRef.current?.setPlayerMaxHp(maxHp)}
          onAddEnergy={(amount) => managerRef.current?.addEnergy(amount)}
          onFillEnergy={() => managerRef.current?.fillEnergy()}
          onSetMaxEnergy={(maxEnergy) => managerRef.current?.setMaxEnergy(maxEnergy)}
          onAddCoins={(amount) => managerRef.current?.addCurrency(amount)}
          onSpendCoins={(amount) => managerRef.current?.spendCurrency(amount)}
          onResetDummy={() => managerRef.current?.resetDummy()}
          onUpdateDummyConfig={handleUpdateDummyConfig}
          onSetAbilityCooldown={handleSetAbilityCooldown}
          onOpenFrameAdjuster={() => setFrameAdjusterOpen(true)}
          onRebindAction={handleRebindAction}
          onResetBindings={handleResetBindings}
        />
      )}

      {frameAdjusterOpen && (
        <FrameAdjusterModal
          adjustments={frameAdjustments}
          onChangeAdjustment={handleChangeFrameAdjustment}
          onResetAll={handleResetFrameAdjustments}
          onClose={() => {
            setFrameAdjusterOpen(false);
            canvasRef.current?.focus();
          }}
        />
      )}

      {snapshot.mode === 'paused' && subOverlay === 'none' && !loading.active && (
        <PauseModal
          snapshot={snapshot}
          onResume={() => {
            managerRef.current?.resumeGame();
            canvasRef.current?.focus();
          }}
          onOpenSaveBench={() => setSubOverlay('save_bench')}
          onOpenSettings={() => setSubOverlay('settings')}
          onRestart={() => {
            managerRef.current?.resetAll();
            managerRef.current?.resumeGame();
            canvasRef.current?.focus();
          }}
          onReturnToTitle={() => {
            setDebugOpen(false);
            setFrameAdjusterOpen(false);
            setSubOverlay('none');
            managerRef.current?.returnToTitle();
            setSavedSlot(readSaveData());
          }}
        />
      )}

      {subOverlay === 'extras' && (
        <ExtrasModal
          language={settings.language}
          selectedSkin={settings.selectedSkin}
          unlockedSkins={settings.unlockedSkins}
          availableCoins={availableCoinsForExtras}
          soundtrackPlaying={soundtrackPlaying}
          onSelectSkin={handleSelectSkin}
          onUnlockSkin={handleUnlockSkin}
          onToggleSoundtrack={() => {
            const playing = managerRef.current?.audio.toggleSoundtrackPreview() ?? false;
            setSoundtrackPlaying(playing);
          }}
          onClose={() => setSubOverlay('none')}
        />
      )}

      {subOverlay === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onToggleDisplayMode={handleToggleDisplayMode}
          onClose={() => setSubOverlay('none')}
        />
      )}

      {subOverlay === 'credits' && (
        <CreditsModal language={settings.language} onClose={() => setSubOverlay('none')} />
      )}

      {subOverlay === 'save_bench' && (
        <SaveBenchModal
          language={settings.language}
          areaName={snapshot.currentAreaName}
          onConfirmSave={handleConfirmBenchSave}
          onClose={handleCloseSaveBench}
        />
      )}

      {loading.active && (
        <LoadingScreen
          variant={loading.variant}
          targetArea={loading.targetArea}
          progress={loading.progress}
          language={settings.language}
        />
      )}
    </main>
  );
}
