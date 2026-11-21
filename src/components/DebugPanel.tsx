import React, { useState } from 'react';
import { InputManager } from '../game/InputManager';
import {
  AbilityCooldownId,
  ActionBindings,
  DummyConfig,
  HudSnapshot,
  InputAction,
} from '../game/types';

interface DebugPanelProps {
  snapshot: HudSnapshot;
  bindings: ActionBindings;
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
  onResetPlayer: () => void;
  onResetDummy: () => void;
  onUpdateDummyConfig: (partial: Partial<DummyConfig>) => void;
  onSetAbilityCooldown: (id: AbilityCooldownId, duration: number) => void;
  onOpenFrameAdjuster: () => void;
  onRebindAction: (action: InputAction, onDone: () => void) => void;
  onResetBindings: () => void;
  onClose: () => void;
}

const REBINDABLE_ACTIONS: { action: InputAction; label: string }[] = [
  { action: 'moveLeft', label: 'Esquerda' },
  { action: 'moveRight', label: 'Direita' },
  { action: 'run', label: 'Correr' },
  { action: 'jump', label: 'Saltar' },
  { action: 'attack', label: 'Ataque 1 / 2' },
  { action: 'special', label: 'Ataque 3 / 4' },
  { action: 'dash', label: 'Dash Sombras' },
  { action: 'transformation', label: 'Transformação' },
  { action: 'shadowProjectile', label: 'Projétil Sombrio' },
  { action: 'up', label: 'Cima' },
  { action: 'down', label: 'Baixo' },
];

export const DebugPanel: React.FC<DebugPanelProps> = ({
  snapshot,
  bindings,
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
  onResetPlayer,
  onResetDummy,
  onUpdateDummyConfig,
  onSetAbilityCooldown,
  onOpenFrameAdjuster,
  onRebindAction,
  onResetBindings,
  onClose,
}) => {
  const [listeningAction, setListeningAction] = useState<InputAction | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [showCooldowns, setShowCooldowns] = useState(false);

  return (
    <aside
      aria-label="Painel de Debug"
      className="pointer-events-auto w-72 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-md border border-[#323846] bg-[#171a21]/95 p-3.5 text-xs text-[#cbd5e1] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[#2a303c] pb-2">
        <span className="font-display text-sm font-semibold text-[#f1f5f9]">
          Painel de Debug
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onClose();
          }}
          className="px-2 py-0.5 rounded text-[#94a3b8] hover:text-white hover:bg-[#252a35] cursor-pointer"
          aria-label="Fechar Painel de Debug"
        >
          Fechar
        </button>
      </div>

      {/* Collision & Physics Toggles */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[11px] font-medium text-[#94a3b8]">Colisão e Física</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleHitboxes();
            }}
            className={`px-2.5 py-1.5 rounded border text-left font-medium transition-colors cursor-pointer ${
              snapshot.debug.showHitboxes
                ? 'border-red-400/60 bg-red-500/20 text-red-200'
                : 'border-[#2f3542] bg-[#20242e] text-[#cbd5e1] hover:bg-[#272c38]'
            }`}
          >
            Hitboxes: {snapshot.debug.showHitboxes ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleHurtboxes();
            }}
            className={`px-2.5 py-1.5 rounded border text-left font-medium transition-colors cursor-pointer ${
              snapshot.debug.showHurtboxes
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                : 'border-[#2f3542] bg-[#20242e] text-[#cbd5e1] hover:bg-[#272c38]'
            }`}
          >
            Hurtboxes: {snapshot.debug.showHurtboxes ? 'ON' : 'OFF'}
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleGravity();
          }}
          className={`w-full px-2.5 py-1.5 rounded border text-left font-medium transition-colors cursor-pointer ${
            snapshot.debug.gravityEnabled
              ? 'border-[#2f3542] bg-[#20242e] text-[#cbd5e1] hover:bg-[#272c38]'
              : 'border-amber-400/60 bg-amber-500/20 text-amber-200'
          }`}
        >
          Gravidade: {snapshot.debug.gravityEnabled ? 'Ativa' : 'Desativada (Flutuar)'}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenFrameAdjuster();
          }}
          className="w-full px-2.5 py-1.5 rounded border border-purple-500/45 bg-purple-950/35 hover:bg-purple-900/40 text-purple-200 font-medium text-left cursor-pointer"
        >
          Ajustar Frames (Sprites Hiori)
        </button>
      </div>

      {/* HUD & Player Resources (Vida, Energia, Moedas) */}
      <div className="mt-3.5 space-y-2 border-t border-[#2a303c] pt-3">
        <div className="text-[11px] font-medium text-[#94a3b8]">Vida, Energia e Moedas</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onTestDamage();
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            Perder Vida (-1)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onHealPlayer();
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            Recuperar (+1)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onAddEnergy(25);
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            +25 Energia
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onFillEnergy();
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            Encher Energia
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onAddCoins(5);
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            +5 Moedas
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onSpendCoins(1);
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            Gastar (-1)
          </button>
        </div>

        <label className="block pt-1">
          <div className="flex justify-between mb-1">
            <span>Vida Máxima (Máscaras)</span>
            <span className="font-mono-tabular text-[#f1f5f9]">{snapshot.playerMaxHp}</span>
          </div>
          <input
            type="range"
            min={3}
            max={9}
            step={1}
            value={snapshot.playerMaxHp}
            onChange={(e) => onSetMaxHp(Number(e.target.value))}
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Energia Máxima</span>
            <span className="font-mono-tabular text-[#f1f5f9]">{snapshot.maxEnergy}</span>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={snapshot.maxEnergy}
            onChange={(e) => onSetMaxEnergy(Number(e.target.value))}
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onTestInvulnerability();
            }}
            className="px-2 py-1.5 rounded border border-[#2f3542] bg-[#20242e] hover:bg-[#272c38] text-[#e2e8f0] font-medium cursor-pointer"
          >
            Invulnerável (2s)
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetPlayer();
            }}
            className="px-2 py-1.5 rounded border border-[#3a4252] bg-[#262b36] hover:bg-[#303746] text-[#f1f5f9] font-medium cursor-pointer"
          >
            Reiniciar Hiori
          </button>
        </div>
      </div>

      {/* Dummy Config */}
      <div className="mt-3.5 space-y-2.5 border-t border-[#2a303c] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#94a3b8]">Configuração do Dummy</span>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onResetDummy();
            }}
            className="px-2 py-0.5 rounded border border-[#3a4252] bg-[#262b36] hover:bg-[#303746] text-[#f1f5f9] text-[11px] cursor-pointer"
          >
            Reiniciar Dummy
          </button>
        </div>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Vida Máxima</span>
            <span className="font-mono-tabular text-[#f1f5f9]">
              {snapshot.dummyConfig.maxHealth}
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={400}
            step={10}
            value={snapshot.dummyConfig.maxHealth}
            onChange={(e) => onUpdateDummyConfig({ maxHealth: Number(e.target.value) })}
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Defesa (Redução)</span>
            <span className="font-mono-tabular text-[#f1f5f9]">
              {snapshot.dummyConfig.defense}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={15}
            step={1}
            value={snapshot.dummyConfig.defense}
            onChange={(e) => onUpdateDummyConfig({ defense: Number(e.target.value) })}
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Resistência Knockback</span>
            <span className="font-mono-tabular text-[#f1f5f9]">
              {Math.round(snapshot.dummyConfig.knockbackResistance * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={snapshot.dummyConfig.knockbackResistance}
            onChange={(e) =>
              onUpdateDummyConfig({ knockbackResistance: Number(e.target.value) })
            }
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>

        <label className="block">
          <div className="flex justify-between mb-1">
            <span>Tempo de Respawn</span>
            <span className="font-mono-tabular text-[#f1f5f9]">
              {snapshot.dummyConfig.respawnTime.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={6}
            step={0.5}
            value={snapshot.dummyConfig.respawnTime}
            onChange={(e) => onUpdateDummyConfig({ respawnTime: Number(e.target.value) })}
            className="w-full accent-[#cbd5e1] cursor-pointer"
          />
        </label>
      </div>

      {/* Configurable Cooldowns */}
      <div className="mt-3.5 border-t border-[#2a303c] pt-3">
        <button
          type="button"
          onClick={() => setShowCooldowns((v) => !v)}
          className="flex w-full items-center justify-between text-[11px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] cursor-pointer"
        >
          <span>Cooldowns das Habilidades</span>
          <span>{showCooldowns ? '−' : '+'}</span>
        </button>

        {showCooldowns && (
          <div className="mt-2 space-y-2">
            {snapshot.cooldowns.map((cd) => (
              <label key={cd.id} className="block">
                <div className="flex justify-between mb-0.5 text-[11px]">
                  <span className="text-[#cbd5e1]">
                    {cd.label} ({cd.keyHint})
                  </span>
                  <span className="font-mono-tabular text-[#f1f5f9]">{cd.total.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={8}
                  step={0.05}
                  value={cd.total}
                  onChange={(e) => onSetAbilityCooldown(cd.id, Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Rebindable Controls Section */}
      <div className="mt-3.5 border-t border-[#2a303c] pt-3">
        <button
          type="button"
          onClick={() => setShowControls((v) => !v)}
          className="flex w-full items-center justify-between text-[11px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] cursor-pointer"
        >
          <span>Controles (Clique para alterar)</span>
          <span>{showControls ? '−' : '+'}</span>
        </button>

        {showControls && (
          <div className="mt-2 space-y-1">
            {REBINDABLE_ACTIONS.map(({ action, label }) => {
              const isListening = listeningAction === action;
              const codeLabel = bindings[action]
                .map((c) => InputManager.formatKeyCode(c))
                .join(' / ');

              return (
                <div key={action} className="flex items-center justify-between py-0.5">
                  <span className="text-[#cbd5e1]">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setListeningAction(action);
                      onRebindAction(action, () => setListeningAction(null));
                    }}
                    className={`px-2 py-0.5 rounded border font-mono-tabular text-[11px] cursor-pointer ${
                      isListening
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-[#333a48] bg-[#222732] text-[#e2e8f0] hover:bg-[#2c3240]'
                    }`}
                  >
                    {isListening ? 'Pressione tecla...' : codeLabel}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={onResetBindings}
              className="mt-1.5 w-full py-1 rounded border border-[#2f3542] text-[11px] text-[#94a3b8] hover:text-white cursor-pointer"
            >
              Restaurar Padrão
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
