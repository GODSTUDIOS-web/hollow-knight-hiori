import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FRAME_ADJUSTMENT,
  FrameAdjustmentMap,
  HIORI_ANIMATIONS_CONFIG,
} from '../game/data/hioriAnimationsConfig';
import { FrameBoundsAdjustment, HioriAnimKey } from '../game/types';

interface FrameAdjusterModalProps {
  adjustments: FrameAdjustmentMap;
  onChangeAdjustment: (key: string, adjustment: FrameBoundsAdjustment) => void;
  onResetAll: () => void;
  onClose: () => void;
}

const ANIM_KEYS = Object.keys(HIORI_ANIMATIONS_CONFIG) as HioriAnimKey[];

export const FrameAdjusterModal: React.FC<FrameAdjusterModalProps> = ({
  adjustments,
  onChangeAdjustment,
  onResetAll,
  onClose,
}) => {
  const [selectedAnim, setSelectedAnim] = useState<HioriAnimKey>('transformation');
  const [selectedFrame, setSelectedFrame] = useState<number>(-1); // -1 = all frames in anim
  const [previewFrame, setPreviewFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  const def = HIORI_ANIMATIONS_CONFIG[selectedAnim];

  useEffect(() => {
    setSelectedFrame(-1);
    setPreviewFrame(0);
  }, [selectedAnim]);

  useEffect(() => {
    if (!playing || selectedFrame >= 0) return;
    const ms = Math.max(40, Math.round(1000 / Math.max(1, def.fps)));
    const id = window.setInterval(() => {
      setPreviewFrame((prev) => (prev + 1) % Math.max(1, def.frames.length));
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, selectedFrame, def.fps, def.frames.length]);

  const activeFrameIdx =
    selectedFrame >= 0 ? Math.min(selectedFrame, def.frames.length - 1) : previewFrame;
  const targetKey = selectedFrame >= 0 ? `${selectedAnim}:${activeFrameIdx}` : selectedAnim;

  const currentAdj: FrameBoundsAdjustment = useMemo(
    () => adjustments[targetKey] ?? { ...DEFAULT_FRAME_ADJUSTMENT },
    [adjustments, targetKey]
  );

  const combinedPreviewAdj: FrameBoundsAdjustment = useMemo(() => {
    const a = adjustments[selectedAnim];
    const f = adjustments[`${selectedAnim}:${activeFrameIdx}`];
    if (selectedFrame >= 0) {
      return {
        offsetX: (a?.offsetX ?? 0) + (f?.offsetX ?? 0),
        offsetY: (a?.offsetY ?? 0) + (f?.offsetY ?? 0),
        cropLeft: (a?.cropLeft ?? 0) + (f?.cropLeft ?? 0),
        cropRight: (a?.cropRight ?? 0) + (f?.cropRight ?? 0),
        cropTop: (a?.cropTop ?? 0) + (f?.cropTop ?? 0),
        cropBottom: (a?.cropBottom ?? 0) + (f?.cropBottom ?? 0),
      };
    }
    return currentAdj;
  }, [adjustments, selectedAnim, activeFrameIdx, selectedFrame, currentAdj]);

  const updateField = (field: keyof FrameBoundsAdjustment, value: number) => {
    onChangeAdjustment(targetKey, {
      ...currentAdj,
      [field]: value,
    });
  };

  const frameUrl = def.frames[activeFrameIdx] ?? def.frames[0];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Ajuste Manual de Frames do Personagem"
    >
      <div className="w-full max-w-2xl rounded-lg border border-[#353c4c] bg-[#15181f] text-[#e2e8f0] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#272d3a] px-4 py-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#f1f5f9]">
              Ajuste Manual de Frames — Hiori
            </h2>
            <p className="text-[11px] text-[#94a3b8]">
              Ajuste recorte e alinhamento sem distorcer a proporção original do sprite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-[#353c4c] bg-[#20242e] hover:bg-[#2a303d] text-xs font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {/* Left: Animation selector & visual checkerboard preview */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className="block text-[11px] text-[#94a3b8] mb-1">Animação</span>
                <select
                  value={selectedAnim}
                  onChange={(e) => setSelectedAnim(e.target.value as HioriAnimKey)}
                  className="w-full rounded border border-[#323947] bg-[#1d212b] px-2 py-1.5 text-xs text-[#f1f5f9]"
                >
                  {ANIM_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {HIORI_ANIMATIONS_CONFIG[k].displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                <span className="block text-[11px] text-[#94a3b8] mb-1">Escopo</span>
                <select
                  value={selectedFrame}
                  onChange={(e) => setSelectedFrame(Number(e.target.value))}
                  className="w-full rounded border border-[#323947] bg-[#1d212b] px-2 py-1.5 text-xs text-[#f1f5f9]"
                >
                  <option value={-1}>Todos os frames ({def.frames.length})</option>
                  {def.frames.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Frame #{idx + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Preview Box with baseline + center crosshair */}
            <div
              className="relative h-56 rounded border border-[#2f3644] flex items-end justify-center overflow-hidden select-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1d212a 25%, transparent 25%), linear-gradient(-45deg, #1d212a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1d212a 75%), linear-gradient(-45deg, transparent 75%, #1d212a 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#171a22',
              }}
            >
              {/* Crosshairs */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-sky-400/35 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-6 h-px bg-amber-400/50 pointer-events-none" />

              {frameUrl && (
                <div
                  className="relative mb-6 border border-purple-400/40"
                  style={{
                    transform: `translate(${combinedPreviewAdj.offsetX}px, ${combinedPreviewAdj.offsetY}px)`,
                  }}
                >
                  <img
                    src={frameUrl}
                    alt={`${def.displayName} frame ${activeFrameIdx + 1}`}
                    className="block max-h-40 w-auto object-contain"
                    style={{
                      clipPath: `inset(${combinedPreviewAdj.cropTop}px ${combinedPreviewAdj.cropRight}px ${combinedPreviewAdj.cropBottom}px ${combinedPreviewAdj.cropLeft}px)`,
                    }}
                  />
                </div>
              )}

              <div className="absolute top-2 left-2.5 text-[11px] font-mono-tabular text-[#cbd5e1] bg-[#14171d]/85 px-2 py-0.5 rounded border border-[#2c323f]">
                Frame {activeFrameIdx + 1}/{def.frames.length} · {def.fps} FPS · {def.frameWidth}x
                {def.frameHeight}
              </div>

              {selectedFrame < 0 && (
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="absolute top-2 right-2.5 px-2 py-0.5 rounded border border-[#343b4a] bg-[#1e232d] text-[11px] text-[#e2e8f0] hover:bg-[#2a313f] cursor-pointer"
                >
                  {playing ? 'Pausar' : 'Reproduzir'}
                </button>
              )}
            </div>
          </div>

          {/* Right: Sliders for offset & crop bounds */}
          <div className="space-y-2.5 text-xs">
            {(
              [
                { key: 'offsetX', label: 'Deslocamento X', min: -36, max: 36 },
                { key: 'offsetY', label: 'Deslocamento Y', min: -36, max: 36 },
                { key: 'cropLeft', label: 'Recorte Esquerda', min: 0, max: 40 },
                { key: 'cropRight', label: 'Recorte Direita', min: 0, max: 40 },
                { key: 'cropTop', label: 'Recorte Topo', min: 0, max: 40 },
                { key: 'cropBottom', label: 'Recorte Base', min: 0, max: 40 },
              ] as const
            ).map(({ key, label, min, max }) => (
              <label key={key} className="block">
                <div className="flex justify-between mb-1">
                  <span className="text-[#cbd5e1]">{label}</span>
                  <span className="font-mono-tabular text-[#f1f5f9]">{currentAdj[key]}px</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={currentAdj[key]}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                  className="w-full accent-[#c084fc] cursor-pointer"
                />
              </label>
            ))}

            <div className="pt-2 flex items-center gap-2 border-t border-[#272d3a]">
              <button
                type="button"
                onClick={() => onChangeAdjustment(targetKey, { ...DEFAULT_FRAME_ADJUSTMENT })}
                className="flex-1 py-1.5 rounded border border-[#343b4a] bg-[#20242e] hover:bg-[#2a303d] text-[#cbd5e1] cursor-pointer"
              >
                Zerar Seleção
              </button>
              <button
                type="button"
                onClick={onResetAll}
                className="flex-1 py-1.5 rounded border border-[#473348] bg-[#251b29] hover:bg-[#322337] text-purple-200 cursor-pointer"
              >
                Restaurar Todos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
