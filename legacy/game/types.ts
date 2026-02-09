import { GodName } from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  markedForDeletion?: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  dashCooldown: number;
  dashFrame: number;
  attackCooldown: number; // Added for rapid fire
  facing: Vector;
  boons: Boon[];
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number; // Added for health bar rendering
  type: 'wretch' | 'lout' | 'boss'; // Added boss
  attackCooldown: number;
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  source: 'player' | 'enemy';
  // New Mechanics
  homing?: boolean;
}

export type BoonMechanic = 
  | 'multishot'   // 연사 +3
  | 'rapid'       // 공속 1.5배
  | 'homing'      // 유도탄
  | 'orbital'     // 위성
  | 'lightning'   // 번개
  | 'heal';       // 회복

export interface Boon {
  id: string;
  god: GodName;
  name: string;
  description: string;
  mechanic: BoonMechanic; // Changed from generic type to specific mechanic
  rarity: 'Common' | 'Rare' | 'Epic' | 'Heroic';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface GameMetrics {
  fps: number;
  entityCount: number;
}

// --- New Narrative Types ---

export interface RoomOption {
  id: string;
  type: 'combat' | 'event' | 'shop';
  description: string;
  rewardType: 'Boon' | 'Health' | 'Wealth';
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface NarrativeBlock {
  speaker: string; // 'Zagreus', 'Narrator', 'Hades', etc.
  text: string;
  mood?: 'neutral' | 'ominous' | 'heroic' | 'sarcastic';
}

export interface RunState {
  depth: number;
  hp: number;
  maxHp: number;
  boons: Boon[];
  kills: number;
}