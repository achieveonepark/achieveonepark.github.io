export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// World is larger than canvas for exploration
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 2000;

export const PLAYER_SPEED = 4;
export const DASH_SPEED = 12;
export const DASH_DURATION = 15; // Frames
export const DASH_COOLDOWN = 45; // Frames

export const ENEMY_SPEED = 2.5; // Slightly faster to chase player
export const ENEMY_SPAWN_RATE = 30; // Much faster spawns (was 120)

export const PROJECTILE_SPEED = 10;
export const ATTACK_RANGE = 400; // Auto-attack range

export const COLORS = {
  background: '#1e1b2e', // Dark purple/slate
  grid: '#2d2a42',
  player: '#ef4444', // Red (Zagreus-ish)
  playerDash: '#fca5a5',
  enemy: '#94a3b8', // Slate ghosts
  projectile: '#fbbf24', // Amber
  wall: '#0f172a',
  text: '#f1f5f9',
  accent: '#f59e0b', // Gold
  danger: '#ef4444',
};

export enum GameState {
  MENU,
  PLAYING,
  BOON_SELECT,
  GAME_OVER,
  VICTORY
}

export const GODS = ['Zeus', 'Poseidon', 'Athena', 'Ares', 'Artemis'] as const;
export type GodName = typeof GODS[number];