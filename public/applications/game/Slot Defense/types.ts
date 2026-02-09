
export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
}

export type AttackType = 'SINGLE' | 'SPLASH' | 'INSTANT';

export interface UnitConfig {
  name: string;
  range: number;
  damage: number;
  attackSpeed: number; // Cooldown in ticks
  color: string; // Tailwind color class for styling
  rarity: Rarity;
  visual: string; // Emoji character
  attackType: AttackType;
  splashRadius?: number; // Only for SPLASH
  effect?: 'slow' | 'stun'; // Status effect
  description?: string; // Unit description for HUD
  recipe?: string[]; // Names of units required to craft this (Only for Mythic)
}

export interface Tower {
  id: string;
  x: number;
  y: number;
  type: UnitConfig;
  lastAttackTick: number;
  level: number;
}

export interface Enemy {
  id: string;
  pathIndex: number; // Current index in the path array
  progress: number; // 0.0 to 1.0 between path nodes
  hp: number;
  maxHp: number;
  speed: number;
  frozen: number; // ticks remaining
  stunned: number; // ticks remaining
  isBoss: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  attackType: AttackType;
  splashRadius?: number;
  effect?: 'slow' | 'stun';
  visual: string; // Projectile visual (e.g., fireball)
}

export interface VisualEffect {
  id: string;
  x: number;
  y: number;
  type: 'hit' | 'death' | 'spawn' | 'gold' | 'merge' | 'explosion' | 'slash';
  content?: string; // Text content or Emoji
  scale?: number;
  createdAt: number; // Game tick when created
}

export interface GameState {
  gold: number;
  tokens: number;
  summonCost: number;
  wave: number;
  waveTime: number; // Ticks remaining in current wave
  isPlaying: boolean;
  isGameOver: boolean;
  gameTick: number;
  gameSpeed: number; // 1 or 2
  upgradeLevels: Record<Rarity, number>;
}

export interface Cell {
  x: number;
  y: number;
  isPath: boolean;
}