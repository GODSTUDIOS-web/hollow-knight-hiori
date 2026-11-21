import { DummyConfig, StageConfig } from '../types';

export const TRAINING_STAGE_CONFIG: StageConfig = {
  id: 'prototype-chamber-01',
  name: 'Câmara de Testes',
  worldWidth: 2200,
  worldHeight: 1100,
  // Neutral studio/chamber tone without final scenery
  neutralColor: '#1d2026',
  gridColor: 'rgba(255, 255, 255, 0.035)',
  playerSpawn: { x: 340, y: 740 },
  dummySpawn: { x: 860, y: 748 },
  benchZone: { x: 145, y: 762, width: 92, height: 58 },
  portalZone: { x: 1940, y: 560, width: 96, height: 120 },
  platforms: [
    // Solid main floor
    { id: 'floor-main', x: 0, y: 820, width: 2200, height: 280, kind: 'ground' },
    // Left and right arena boundary walls
    { id: 'wall-left', x: 0, y: 0, width: 56, height: 1100, kind: 'wall' },
    { id: 'wall-right', x: 2144, y: 0, width: 56, height: 1100, kind: 'wall' },
    // Elevated testing platforms (left, center-high, right)
    { id: 'plat-low-left', x: 160, y: 690, width: 190, height: 22, kind: 'platform', oneWay: true },
    { id: 'plat-mid-center', x: 460, y: 620, width: 230, height: 22, kind: 'platform', oneWay: true },
    { id: 'plat-high-center', x: 790, y: 500, width: 240, height: 22, kind: 'platform', oneWay: true },
    { id: 'plat-mid-right', x: 1150, y: 635, width: 250, height: 22, kind: 'platform', oneWay: true },
    { id: 'plat-upper-right', x: 1490, y: 515, width: 210, height: 22, kind: 'platform', oneWay: true },
    // Solid step block & vertical test wall inside the arena
    { id: 'block-step', x: 1420, y: 752, width: 140, height: 68, kind: 'ground' },
    { id: 'wall-inner-test', x: 1760, y: 560, width: 44, height: 260, kind: 'wall' },
    // High ledge past inner wall
    { id: 'plat-far-right', x: 1860, y: 680, width: 220, height: 24, kind: 'ground' },
  ],
  // Small isolated spike strip on the far right so players can test hazard damage organically too
  hazards: [
    { id: 'hazard-test-spikes', x: 1585, y: 804, width: 135, height: 16, damage: 1, knockbackY: -380 },
  ],
  // Prepared empty background layers for future parallax environments
  backgroundLayers: [],
};

export const DEFAULT_DUMMY_CONFIG: DummyConfig = {
  maxHealth: 100,
  defense: 0,
  knockbackResistance: 0.15,
  respawnTime: 2.0,
};
