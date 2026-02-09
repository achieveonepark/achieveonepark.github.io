import React, { useRef, useEffect, useCallback, useState } from 'react';
import { 
  CANVAS_WIDTH as DEFAULT_WIDTH, 
  CANVAS_HEIGHT as DEFAULT_HEIGHT, 
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SPEED, 
  DASH_SPEED, 
  DASH_DURATION, 
  DASH_COOLDOWN, 
  ENEMY_SPEED,
  COLORS,
  PROJECTILE_SPEED,
  ENEMY_SPAWN_RATE,
  ATTACK_RANGE
} from '../constants';
import { Player, Enemy, Projectile, Point, Particle, GameMetrics, Boon } from '../types';

const BASE_ENEMIES_PER_ROOM = 10;

export const useGameLoop = (
  canvasRef: React.RefObject<HTMLCanvasElement>, 
  active: boolean,
  initialHp: number,
  depth: number,
  boons: Boon[],
  onGameOver: () => void,
  onRoomClear: (hp: number) => void
) => {
  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player',
    x: WORLD_WIDTH / 2, 
    y: WORLD_HEIGHT / 2,
    width: 32,
    height: 32,
    color: COLORS.player,
    hp: initialHp,
    maxHp: 100,
    dashCooldown: 0,
    dashFrame: 0,
    attackCooldown: 0,
    facing: { x: 0, y: 1 },
    boons: boons
  });

  const cameraRef = useRef<Point>({ x: 0, y: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const orbitalsRef = useRef<Projectile[]>([]);
  
  // Inputs
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const joystickRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const frameRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const orbitalAngleRef = useRef<number>(0);
  
  // Logic Flags
  const gameOverTriggeredRef = useRef(false);
  const roomClearTriggeredRef = useRef(false);
  const enemiesSpawnedCountRef = useRef(0);
  
  // Calculated room difficulty
  const totalEnemiesForRoom = Math.floor(BASE_ENEMIES_PER_ROOM * Math.pow(1.5, depth));

  // React State for HUD updates
  const [hudState, setHudState] = useState({ 
      hp: initialHp, 
      dashReady: true, 
      enemiesLeft: totalEnemiesForRoom 
  });
  const [metrics, setMetrics] = useState<GameMetrics>({ fps: 60, entityCount: 0 });

  // Update refs when props change
  useEffect(() => {
    playerRef.current.boons = boons;
    
    // Initialize orbitals
    const orbitalCount = boons.filter(b => b.mechanic === 'orbital').length;
    orbitalsRef.current = [];
    for(let i=0; i<orbitalCount * 2; i++) { 
        orbitalsRef.current.push({
            id: `orb-${i}`,
            x: 0, y: 0, width: 10, height: 10,
            color: COLORS.accent,
            vx: 0, vy: 0,
            damage: 10,
            source: 'player'
        });
    }
  }, [boons]);

  // Reset logic
  useEffect(() => {
      if (active) {
          playerRef.current.hp = initialHp;
          playerRef.current.x = WORLD_WIDTH / 2;
          playerRef.current.y = WORLD_HEIGHT / 2;
          
          enemiesRef.current = [];
          projectilesRef.current = [];
          particlesRef.current = [];
          enemiesSpawnedCountRef.current = 0;
          roomClearTriggeredRef.current = false;
          spawnTimerRef.current = 0;
      }
  }, [active, initialHp]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active]);

  // Helpers exposed to UI
  const setJoystickInput = useCallback((vector: {x: number, y: number}) => {
      joystickRef.current = vector;
  }, []);

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 30 + Math.random() * 20,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const triggerDash = useCallback(() => {
      const p = playerRef.current;
      if (p.dashCooldown <= 0) {
        p.dashFrame = DASH_DURATION;
        p.dashCooldown = DASH_COOLDOWN;
        createParticles(p.x, p.y, '#ffffff', 10);
      }
  }, []);

  const autoAttack = () => {
    const p = playerRef.current;
    if (p.hp <= 0 || p.attackCooldown > 0) return;
    if (enemiesRef.current.length === 0) return;

    let closestEnemy: Enemy | null = null;
    let minDistance = ATTACK_RANGE;

    enemiesRef.current.forEach(e => {
        const dist = Math.sqrt((e.x - p.x)**2 + (e.y - p.y)**2);
        if (dist < minDistance) {
            minDistance = dist;
            closestEnemy = e;
        }
    });

    if (!closestEnemy) return;

    // Check Boons
    const multishotCount = p.boons.filter(b => b.mechanic === 'multishot').length;
    const rapidCount = p.boons.filter(b => b.mechanic === 'rapid').length;
    const isHoming = p.boons.some(b => b.mechanic === 'homing');
    
    // Base Cooldown
    let cooldown = 30; 
    if (rapidCount > 0) cooldown = Math.floor(cooldown / (1.5 * rapidCount));
    p.attackCooldown = cooldown;

    const dx = closestEnemy.x - p.x;
    const dy = closestEnemy.y - p.y;
    const baseAngle = Math.atan2(dy, dx);
    
    // Projectiles
    const totalProjectiles = 1 + (multishotCount * 3);
    const spread = (Math.PI / 180) * 15;
    const startAngle = baseAngle - ((totalProjectiles - 1) * spread) / 2;

    for (let i = 0; i < totalProjectiles; i++) {
        const angle = startAngle + i * spread;
        const vx = Math.cos(angle) * PROJECTILE_SPEED;
        const vy = Math.sin(angle) * PROJECTILE_SPEED;

        projectilesRef.current.push({
          id: Math.random().toString(),
          x: p.x,
          y: p.y,
          width: 12,
          height: 12,
          color: COLORS.projectile,
          vx,
          vy,
          damage: 25,
          source: 'player',
          homing: isHoming
        });
    }
  };

  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    const p = playerRef.current;
    const angle = Math.random() * Math.PI * 2;
    // Spawn radius depends on screen size so enemies spawn off-screen
    const radius = (Math.max(canvasWidth, canvasHeight) / 2) + 100 + (Math.random() * 200);
    
    let x = p.x + Math.cos(angle) * radius;
    let y = p.y + Math.sin(angle) * radius;

    x = Math.max(30, Math.min(WORLD_WIDTH - 30, x));
    y = Math.max(30, Math.min(WORLD_HEIGHT - 30, y));

    const isBoss = enemiesSpawnedCountRef.current === totalEnemiesForRoom - 1;
    const hp = isBoss ? 250 : 50; 
    const size = isBoss ? 64 : 32;
    const color = isBoss ? '#7f1d1d' : COLORS.enemy;

    enemiesRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      width: size,
      height: size,
      color: color,
      hp: hp,
      maxHp: hp,
      type: isBoss ? 'boss' : 'wretch',
      attackCooldown: 60
    });
    enemiesSpawnedCountRef.current++;
  };

  const update = useCallback(() => {
    if (!active) return;
    const p = playerRef.current;
    
    // Get current canvas dimensions safely
    const currentCanvas = canvasRef.current;
    const canvasWidth = currentCanvas ? currentCanvas.width : DEFAULT_WIDTH;
    const canvasHeight = currentCanvas ? currentCanvas.height : DEFAULT_HEIGHT;

    // 1. Check Death
    if (p.hp <= 0) {
        if (!gameOverTriggeredRef.current) {
            gameOverTriggeredRef.current = true;
            onGameOver();
        }
        return;
    }

    // 2. Check Room Clear
    const enemiesLeftToSpawn = totalEnemiesForRoom - enemiesSpawnedCountRef.current;
    const activeEnemies = enemiesRef.current.length;
    
    if (enemiesLeftToSpawn <= 0 && activeEnemies === 0) {
        if (!roomClearTriggeredRef.current) {
            roomClearTriggeredRef.current = true;
            setTimeout(() => {
                 onRoomClear(p.hp);
            }, 1000);
        }
    }

    // --- Player Movement ---
    let dx = 0;
    let dy = 0;

    // Keyboard Input
    if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) dy -= 1;
    if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) dy += 1;
    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) dx -= 1;
    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) dx += 1;

    // Joystick Input override/add
    const jx = joystickRef.current.x;
    const jy = joystickRef.current.y;
    if (jx !== 0 || jy !== 0) {
        // If keyboard is idle, use joystick. Or sum them? Let's treat them as additive but clamped
        if (dx === 0 && dy === 0) {
            dx = jx;
            dy = jy;
        } else {
            // Keyboard wins for precision if pressed
        }
    }

    // Trigger dash from keyboard
    if (keysRef.current['Space']) {
        triggerDash();
    }

    if (p.dashFrame > 0) {
      p.dashFrame--;
      p.x += p.facing.x * DASH_SPEED;
      p.y += p.facing.y * DASH_SPEED;
      if (p.dashFrame % 3 === 0) {
        createParticles(p.x, p.y, COLORS.playerDash, 2);
      }
    } else {
      if (dx !== 0 || dy !== 0) {
        // If purely digital input (keyboard), normalize. If analog (joystick), keep magnitude unless > 1
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
            if (mag > 1) { // Normalize
                dx /= mag;
                dy /= mag;
            }
            p.facing = { x: dx / (mag > 0 ? mag : 1), y: dy / (mag > 0 ? mag : 1) }; // Keep direction correct
            
            p.x += dx * PLAYER_SPEED;
            p.y += dy * PLAYER_SPEED;
        }
      }
    }

    if (p.dashCooldown > 0) p.dashCooldown--;
    if (p.attackCooldown > 0) p.attackCooldown--;

    autoAttack();

    p.x = Math.max(p.width/2, Math.min(WORLD_WIDTH - p.width/2, p.x));
    p.y = Math.max(p.height/2, Math.min(WORLD_HEIGHT - p.height/2, p.y));

    // Dynamic Camera (Follow Player) based on current viewport size
    cameraRef.current.x = Math.max(0, Math.min(p.x - canvasWidth / 2, WORLD_WIDTH - canvasWidth));
    cameraRef.current.y = Math.max(0, Math.min(p.y - canvasHeight / 2, WORLD_HEIGHT - canvasHeight));

    // --- Passive: Orbitals ---
    orbitalAngleRef.current += 0.05;
    const orbitalRadius = 70;
    orbitalsRef.current.forEach((orb, i) => {
        const angleOffset = (Math.PI * 2 / orbitalsRef.current.length) * i;
        orb.x = p.x + Math.cos(orbitalAngleRef.current + angleOffset) * orbitalRadius;
        orb.y = p.y + Math.sin(orbitalAngleRef.current + angleOffset) * orbitalRadius;
        
        enemiesRef.current.forEach(e => {
            const dist = Math.sqrt((orb.x - e.x)**2 + (orb.y - e.y)**2);
            if (dist < (e.width/2 + orb.width/2)) {
                e.hp -= 2;
                createParticles(e.x, e.y, COLORS.accent, 1);
            }
        });
    });

    // --- Passive: Lightning ---
    const lightningCount = p.boons.filter(b => b.mechanic === 'lightning').length;
    if (lightningCount > 0 && frameRef.current % 120 === 0 && enemiesRef.current.length > 0) {
        for(let i=0; i<lightningCount; i++) {
            const visibleEnemies = enemiesRef.current.filter(e => 
                e.x > cameraRef.current.x && e.x < cameraRef.current.x + canvasWidth &&
                e.y > cameraRef.current.y && e.y < cameraRef.current.y + canvasHeight
            );
            
            const target = visibleEnemies.length > 0 
                ? visibleEnemies[Math.floor(Math.random() * visibleEnemies.length)]
                : enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)];

            if (target) {
                target.hp -= 50;
                createParticles(target.x, target.y, '#ffff00', 20);
            }
        }
    }

    spawnTimerRef.current++;
    if (
        spawnTimerRef.current > ENEMY_SPAWN_RATE && 
        enemiesRef.current.length < 50 && 
        enemiesSpawnedCountRef.current < totalEnemiesForRoom
    ) {
        spawnEnemy(canvasWidth, canvasHeight);
        spawnTimerRef.current = 0;
    }

    enemiesRef.current.forEach(e => {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist > 0) {
        e.x += (dx / dist) * ENEMY_SPEED;
        e.y += (dy / dist) * ENEMY_SPEED;
      }
      
      enemiesRef.current.forEach(other => {
          if (e === other) return;
          const edx = e.x - other.x;
          const edy = e.y - other.y;
          const edist = Math.sqrt(edx*edx + edy*edy);
          if (edist < e.width) {
              e.x += (edx / edist) * 0.5;
              e.y += (edy / edist) * 0.5;
          }
      });

      if (dist < (p.width/2 + e.width/2) && p.dashFrame <= 0) {
        p.hp -= 0.5;
        createParticles(p.x, p.y, COLORS.danger, 1);
      }
    });

    projectilesRef.current.forEach(proj => {
      if (proj.homing && enemiesRef.current.length > 0) {
        let closest = enemiesRef.current[0];
        let minDist = 9999;
        enemiesRef.current.forEach(e => {
            const d = Math.sqrt((e.x - proj.x)**2 + (e.y - proj.y)**2);
            if (d < minDist) { minDist = d; closest = e; }
        });
        
        const dx = closest.x - proj.x;
        const dy = closest.y - proj.y;
        const targetAngle = Math.atan2(dy, dx);
        const steerSpeed = 0.15;
        proj.vx = proj.vx * (1 - steerSpeed) + (Math.cos(targetAngle) * PROJECTILE_SPEED) * steerSpeed;
        proj.vy = proj.vy * (1 - steerSpeed) + (Math.sin(targetAngle) * PROJECTILE_SPEED) * steerSpeed;
      }

      proj.x += proj.vx;
      proj.y += proj.vy;

      if (proj.x < 0 || proj.x > WORLD_WIDTH || proj.y < 0 || proj.y > WORLD_HEIGHT) {
        proj.markedForDeletion = true;
      }

      if (proj.source === 'player') {
        enemiesRef.current.forEach(e => {
            const dist = Math.sqrt((proj.x - e.x)**2 + (proj.y - e.y)**2);
            if (dist < (e.width/2 + proj.width/2)) {
                e.hp -= proj.damage;
                proj.markedForDeletion = true;
                createParticles(e.x, e.y, COLORS.accent, 5);
            }
        });
      }
    });
    
    enemiesRef.current.forEach(e => {
        if (e.hp <= 0) {
            e.markedForDeletion = true;
            createParticles(e.x, e.y, e.color, 8);
        }
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);
    
    particlesRef.current.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
    });
    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

    if (frameRef.current % 10 === 0) {
        setHudState({ 
            hp: p.hp, 
            dashReady: p.dashCooldown <= 0,
            enemiesLeft: Math.max(0, totalEnemiesForRoom - enemiesSpawnedCountRef.current) + enemiesRef.current.length
        });
        setMetrics({
            fps: 60, 
            entityCount: 1 + enemiesRef.current.length + projectilesRef.current.length + particlesRef.current.length + orbitalsRef.current.length
        });
    }

    frameRef.current++;
  }, [active, onGameOver, onRoomClear, totalEnemiesForRoom, triggerDash]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Dynamic dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    const cam = cameraRef.current;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const offsetX = -cam.x % gridSize;
    const offsetY = -cam.y % gridSize;

    ctx.beginPath();
    for (let x = offsetX; x <= width; x += gridSize) { 
        ctx.moveTo(x, 0); 
        ctx.lineTo(x, height); 
    }
    for (let y = offsetY; y <= height; y += gridSize) { 
        ctx.moveTo(0, y); 
        ctx.lineTo(width, y); 
    }
    ctx.stroke();
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 5;
    ctx.strokeRect(-cam.x, -cam.y, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.restore();

    const toScreenX = (val: number) => val - cam.x;
    const toScreenY = (val: number) => val - cam.y;

    particlesRef.current.forEach(pt => {
        if (pt.x < cam.x || pt.x > cam.x + width || pt.y < cam.y || pt.y > cam.y + height) return;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / 30;
        ctx.beginPath();
        ctx.arc(toScreenX(pt.x), toScreenY(pt.y), pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    enemiesRef.current.forEach(e => {
        if (e.x + e.width < cam.x || e.x - e.width > cam.x + width || 
            e.y + e.height < cam.y || e.y - e.height > cam.y + height) return;

        const sx = toScreenX(e.x);
        const sy = toScreenY(e.y);

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(sx, sy + e.height/2 - 2, e.width/3, e.height/6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = e.color;
        if (e.type === 'boss') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.strokeRect(sx - e.width/2, sy - e.height/2, e.width, e.height);
        }
        ctx.fillRect(sx - e.width/2, sy - e.height/2, e.width, e.height);
        
        const barWidth = e.width;
        ctx.fillStyle = 'black';
        ctx.fillRect(sx - barWidth/2, sy - e.height/2 - 10, barWidth, 4);
        ctx.fillStyle = 'red';
        ctx.fillRect(sx - barWidth/2, sy - e.height/2 - 10, barWidth * (e.hp / e.maxHp), 4);
    });

    const p = playerRef.current;
    const px = toScreenX(p.x);
    const py = toScreenY(p.y);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(px, py + 15, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.dashFrame > 0 ? COLORS.playerDash : COLORS.player;
    ctx.beginPath();
    ctx.moveTo(px, py - 20);
    ctx.lineTo(px + 15, py);
    ctx.lineTo(px, py + 20);
    ctx.lineTo(px - 15, py);
    ctx.closePath();
    ctx.fill();

    orbitalsRef.current.forEach(orb => {
        ctx.fillStyle = COLORS.accent;
        ctx.beginPath();
        ctx.arc(toScreenX(orb.x), toScreenY(orb.y), 5, 0, Math.PI * 2);
        ctx.fill();
    });

    projectilesRef.current.forEach(proj => {
        if (proj.x < cam.x || proj.x > cam.x + width || proj.y < cam.y || proj.y > cam.y + height) return;
        const sx = toScreenX(proj.x);
        const sy = toScreenY(proj.y);

        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - proj.vx * 2, sy - proj.vy * 2);
        ctx.stroke();
    });

    const gradient = ctx.createRadialGradient(width/2, height/2, Math.max(width, height)/3, width/2, height/2, Math.max(width, height)/1.5);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0, width, height);

  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    if (active) {
      loop();
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, update, draw]);

  return { 
      hudState, 
      metrics, 
      setJoystickInput, 
      triggerDash,
      resetGame: () => {
        playerRef.current.hp = 100;
        enemiesRef.current = [];
        projectilesRef.current = [];
        enemiesSpawnedCountRef.current = 0;
        gameOverTriggeredRef.current = false;
        roomClearTriggeredRef.current = false;
      }
  };
};