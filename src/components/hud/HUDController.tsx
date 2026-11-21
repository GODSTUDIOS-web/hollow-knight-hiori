import React from 'react';
import { Volume2, VolumeX, Pause, Wrench, RotateCcw } from 'lucide-react';
import {
  AbilityCooldownId,
  ActionBindings,
  DummyConfig,
  HudSnapshot,
  InputAction,
} from '../../game/types';
import { DebugPanel } from '../DebugPanel';
import { CurrencyDisplay } from './CurrencyDisplay';
import { EnergyDisplay } from './EnergyDisplay';
import { HealthDisplay } from './HealthDisplay';

interface HUDControllerProps {
  snapshot: HudSnapshot;
  debugOpen: boolean;
  bindings: ActionBindings;
  onToggleDebug: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onResetPlayer: () => void;
  onToggleHitboxes: () => void;
  onToggleHurtboxes: () => void;
  onToggleGravity: () => void;
  onTestInvulnerability: () => void;
  onTestDamage: () => void;
  onHealPlayer: () => void;
  onSetMaxHp: (maxHp: number) => void;
  onAddEnergy: (amount: number) => void;
  onFillEnergy: () => void;
  onSetMaxEnergy: (maxEnergy: number) => void;
  onAddCoins: (amount: number) => void;
  onSpendCoins: (amount: number) => void;
  onResetDummy: () => void;
  onUpdateDummyConfig: (partial: Partial<DummyConfig>) => void;
  onSetAbilityCooldown: (id: AbilityCooldownId, duration: number) => void;
  onOpenFrameAdjuster: () => void;
  onRebindAction: (action: InputAction, onDone: () => void) => void;
  onResetBindings: () => void;
}

export const HUDController: React.FC<HUDControllerProps> = ({
  snapshot,
  debugOpen,
  bindings,
  onToggleDebug,
  onToggleMute,
  onPause,
  onResetPlayer,
  onToggleHitboxes,
  onToggleHurtboxes,
  onToggleGravity,
  onTestInvulnerability,
  onTestDamage,
  onHealPlayer,
  onSetMaxHp,
  onAddEnergy,
  onFillEnergy,
  onSetMaxEnergy,
  onAddCoins,
  onSpendCoins,
  onResetDummy,
  onUpdateDummyConfig,
  onSetAbilityCooldown,
  onOpenFrameAdjuster,
  onRebindAction,
  onResetBindings,
}) => {
  const dummyPct = Math.max(
    0,
    Math.min(100, Math.round((snapshot.dummyHp / Math.max(1, snapshot.dummyMaxHp)) * 100))
  );

  return (
    <div
      data-testid="official-hud"
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-[clamp(10px,1.8vw,28px)]"
    >
      {/* Top Perimeter: Official Left Cluster (Ornamental Vessel + Masks + Bar) & Official Right Cluster (Crystal Currency) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Cluster */}
        <div className="flex flex-col items-start gap-1.5">
          {/* Official Ornate HUD Lockup (728:213 aspect ratio matching reference image) */}
          <div
            className="relative shrink-0"
            style={{
              width: 'clamp(270px, 34vw, 540px)',
              aspectRatio: '728 / 213',
            }}
          >
            <EnergyDisplay
              energy={snapshot.energy}
              maxEnergy={snapshot.maxEnergy}
              energyRatio={snapshot.energyRatio}
              energyFull={snapshot.energyFull}
              gainFlash={snapshot.energyGainFlash}
              spendFlash={snapshot.energySpendFlash}
            >
              <HealthDisplay
                currentHp={snapshot.playerHp}
                maxHp={snapshot.playerMaxHp}
                healFlash={snapshot.playerHealFlash}
                hurtFlash={snapshot.playerHurtFlash}
              />
            </EnergyDisplay>
          </div>

          {/* Quiet status micro-line & Combo Counter underneath without covering the official HUD */}
          <div className="flex items-center gap-2 pl-2 text-[11px] text-[#94a3b8] font-mono-tabular">
            <span>
              Energia: <strong className="text-[#e2e8f0]">{snapshot.energy}/{snapshot.maxEnergy}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Estado: <strong className="text-[#e2e8f0]">{snapshot.playerState}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              FPS: <strong className="text-[#e2e8f0]">{snapshot.fps}</strong>
            </span>
            {snapshot.playerInvulnerable && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300 font-semibold">INVULN</span>
              </>
            )}
            {snapshot.playerShadowFormRemaining > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="shadow-form-timer"
                  className="text-purple-300 font-semibold"
                >
                  SOMBRA {snapshot.playerShadowFormRemaining.toFixed(1)}s
                </span>
              </>
            )}
          </div>

          {snapshot.hitComboCount >= 2 && snapshot.hitComboRatio > 0 && (
            <div
              data-testid="combo-counter"
              aria-label={`Combo: ${snapshot.hitComboCount} hits, ${snapshot.hitComboDamage} de dano`}
              className="ml-2 bg-[#15181f]/80 border border-[#3a4252] rounded-md px-3 py-1.5 min-w-[144px]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-xl font-bold leading-none text-[#f1f5f9] font-mono-tabular">
                    {snapshot.hitComboCount}x
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
                    Combo
                  </span>
                </div>
                <span className="text-xs font-mono-tabular text-[#cbd5e1]">
                  {snapshot.hitComboDamage} dano
                </span>
              </div>
              <div className="mt-1 w-full h-1 rounded-sm bg-[#252a34] overflow-hidden">
                <div
                  className="h-full bg-[#e2e8f0] origin-left"
                  style={{ transform: `scaleX(${snapshot.hitComboRatio})` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Cluster: Official Crystal Currency Counter + Compact Controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4">
            {/* Official Currency Display (pure transparent background, top-right corner) */}
            <CurrencyDisplay coins={snapshot.coins} coinFlash={snapshot.coinFlash} />
          </div>

          {/* Compact Utility Buttons + Dummy Telemetry cleanly positioned below currency */}
          <div className="flex items-center gap-2.5">
            <div className="bg-[#15181f]/75 border border-[#2c323f] rounded-md px-2.5 py-1 text-right">
              <div className="flex items-center justify-end gap-2 text-[11px] font-mono-tabular">
                <span className="text-[#94a3b8]">
                  Dummy:{' '}
                  <strong className="text-[#f1f5f9]">
                    {snapshot.dummyHp}/{snapshot.dummyMaxHp}
                  </strong>
                </span>
                <span className="text-[#cbd5e1]">Dano: {snapshot.totalDamage}</span>
              </div>
              <div className="mt-1 w-full h-1 rounded-sm bg-[#252a34] overflow-hidden">
                <div
                  className="h-full bg-[#e2e8f0] transition-transform duration-100 origin-left"
                  style={{ transform: `scaleX(${dummyPct / 100})` }}
                />
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                title="Alternar Áudio (M)"
                aria-label={snapshot.muted ? 'Ativar áudio' : 'Silenciar áudio'}
                className="w-8 h-8 rounded border border-[#2c323f] bg-[#15181f]/85 hover:bg-[#232833] text-[#e2e8f0] flex items-center justify-center cursor-pointer"
              >
                {snapshot.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onResetPlayer();
                }}
                title="Reiniciar Jogador (R)"
                aria-label="Reiniciar Jogador"
                className="w-8 h-8 rounded border border-[#2c323f] bg-[#15181f]/85 hover:bg-[#232833] text-[#e2e8f0] flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleDebug();
                }}
                title="Painel de Debug (T)"
                aria-label="Abrir ou fechar Painel de Debug"
                aria-expanded={debugOpen}
                className={`h-8 px-2 rounded border flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                  debugOpen
                    ? 'border-[#cbd5e1] bg-[#e6e9ef] text-[#14171c]'
                    : 'border-[#2c323f] bg-[#15181f]/85 hover:bg-[#232833] text-[#e2e8f0]'
                }`}
              >
                <Wrench className="w-3 h-3" />
                <span>Debug</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                title="Pausar (Esc / P)"
                aria-label="Pausar jogo"
                className="w-8 h-8 rounded border border-[#2c323f] bg-[#15181f]/85 hover:bg-[#232833] text-[#e2e8f0] flex items-center justify-center cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {debugOpen && (
            <DebugPanel
              snapshot={snapshot}
              bindings={bindings}
              onToggleHitboxes={onToggleHitboxes}
              onToggleHurtboxes={onToggleHurtboxes}
              onToggleGravity={onToggleGravity}
              onTestInvulnerability={onTestInvulnerability}
              onTestDamage={onTestDamage}
              onHealPlayer={onHealPlayer}
              onSetMaxHp={onSetMaxHp}
              onAddEnergy={onAddEnergy}
              onFillEnergy={onFillEnergy}
              onSetMaxEnergy={onSetMaxEnergy}
              onAddCoins={onAddCoins}
              onSpendCoins={onSpendCoins}
              onResetDummy={onResetDummy}
              onResetPlayer={onResetPlayer}
              onUpdateDummyConfig={onUpdateDummyConfig}
              onSetAbilityCooldown={onSetAbilityCooldown}
              onOpenFrameAdjuster={onOpenFrameAdjuster}
              onRebindAction={onRebindAction}
              onResetBindings={onResetBindings}
              onClose={onToggleDebug}
            />
          )}
        </div>
      </div>

      {/* Bottom Cooldown Bar + Single-line control hint */}
      <div className="flex flex-col items-center gap-1.5">
        <div
          data-testid="cooldown-bar"
          aria-label="Cooldowns das habilidades"
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          {snapshot.cooldowns.map((cd) => {
            const pctReady =
              cd.total > 0 ? Math.max(0, Math.min(1, 1 - cd.remaining / cd.total)) : 1;
            const energyCost = snapshot.abilityEnergyCosts[cd.id] ?? 0;
            const hasEnoughEnergy = snapshot.energy >= energyCost;
            const isShadowAbility =
              cd.id === 'transformation' ||
              cd.id === 'shadow_dash' ||
              cd.id === 'shadow_projectile';

            return (
              <div
                key={cd.id}
                data-cooldown-id={cd.id}
                data-ready={cd.ready && hasEnoughEnergy ? 'true' : 'false'}
                className={`relative overflow-hidden rounded border px-2.5 py-1 min-w-[84px] bg-[#15181f]/85 transition-opacity ${
                  cd.ready && hasEnoughEnergy
                    ? isShadowAbility
                      ? 'border-purple-400/50 text-[#f1f5f9]'
                      : 'border-[#3a4252] text-[#f1f5f9]'
                    : 'border-[#252a34] text-[#64748b] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular leading-tight">
                  <span className="font-semibold text-[#cbd5e1]">{cd.keyHint}</span>
                  <span
                    className={
                      !cd.ready
                        ? 'text-amber-300'
                        : !hasEnoughEnergy
                          ? 'text-rose-300'
                          : isShadowAbility
                            ? 'text-purple-300'
                            : 'text-emerald-300'
                    }
                  >
                    {!cd.ready
                      ? `${cd.remaining.toFixed(1)}s`
                      : !hasEnoughEnergy
                        ? `${energyCost}E`
                        : energyCost > 0
                          ? `-${energyCost}E`
                          : 'Pronto'}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] truncate leading-tight text-[#94a3b8]">
                  {cd.label}
                </div>
                <div className="mt-1 h-0.5 w-full bg-[#232833] overflow-hidden">
                  <div
                    className={`h-full origin-left ${
                      cd.ready && hasEnoughEnergy
                        ? isShadowAbility
                          ? 'bg-purple-400'
                          : 'bg-[#e2e8f0]'
                        : 'bg-amber-400/80'
                    }`}
                    style={{ transform: `scaleX(${pctReady})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full flex items-center justify-between text-[11px] text-[#838d9e] font-mono-tabular">
          <span>
            A/D Mover · Shift Correr · Espaço Saltar (2x) · J / W+J / K / D+K Ataques · L Dash · I
            Transf. · O Projétil
          </span>
          <span>
            {snapshot.playerAttackLabel !== '—' ? `Ação: ${snapshot.playerAttackLabel}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
