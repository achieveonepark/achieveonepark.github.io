import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { 
  GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, PATH_COORDINATES, 
  UNIT_TYPES, PROBABILITIES, MAX_ENEMIES, WAVE_DURATION_SEC, BASE_FPS,
  TICKET_DROP_RATE
} from '../constants';
import { Rarity, UnitConfig, Enemy, Tower, Projectile, GameState } from '../types';

// Emoji Font Stack for better cross-platform compatibility (Windows/Mac/Android)
const EMOJI_FONT_FAMILY = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Android Emoji", sans-serif';

export class MainScene extends Phaser.Scene {
    // Game State
    private enemies: any[] = [];
    private towers: any[] = [];
    private projectiles: any[] = [];
    
    // Logic State
    private gameSpeed: number = 1;
    private wave: number = 1;
    private waveTimer: number = 0;
    private enemyCount: number = 0;
    private isPlaying: boolean = false;
    private isGameOver: boolean = false;
    private spawnTimer: number = 0;
    private spawnedInCurrentWave: number = 0; // Track spawns for boss logic
    
    // Optimization State
    private lastTimerSec: number = -1;
    
    // Boss State
    private challengeBossLevel: number = 1;
    
    // Upgrade State (Received from React)
    private upgradeLevels: Record<Rarity, number> = {
        [Rarity.COMMON]: 0,
        [Rarity.RARE]: 0,
        [Rarity.EPIC]: 0,
        [Rarity.LEGENDARY]: 0,
        [Rarity.MYTHIC]: 0,
    };
    
    private selectedTower: any | null = null;

    // Visuals
    private gridGraphics!: Phaser.GameObjects.Graphics;
    private pathGraphics!: Phaser.GameObjects.Graphics;
    private rangeGraphics!: Phaser.GameObjects.Graphics;
    private selectionGraphics!: Phaser.GameObjects.Graphics;
    
    // Fix: Explicitly declare Phaser properties to resolve TypeScript errors
    declare add: Phaser.GameObjects.GameObjectFactory;
    declare input: Phaser.Input.InputPlugin;
    declare cameras: Phaser.Cameras.Scene2D.CameraManager;
    declare tweens: Phaser.Tweens.TweenManager;
    declare children: Phaser.GameObjects.DisplayList;

    constructor() {
        super('MainScene');
    }

    create() {
        // 1. Init Graphics
        this.gridGraphics = this.add.graphics();
        this.pathGraphics = this.add.graphics();
        this.rangeGraphics = this.add.graphics().setDepth(90);
        this.selectionGraphics = this.add.graphics().setDepth(95);
        
        this.drawGrid();
        
        // Background click to deselect
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
            if (gameObjects.length === 0) {
                this.deselectTower();
            }
        });

        // 3. Setup Events
        EventBus.on('summon-unit', this.summonUnit, this);
        EventBus.on('set-game-speed', (speed: number) => { this.gameSpeed = speed; });
        EventBus.on('toggle-play', (isPlaying: boolean) => { this.isPlaying = isPlaying; });
        EventBus.on('restart-game', this.restartGame, this);
        EventBus.on('check-recipe', this.checkRecipe, this);
        EventBus.on('upgrades-update', (levels: Record<Rarity, number>) => {
            this.upgradeLevels = levels;
        });
        EventBus.on('evolve-unit', this.evolveUnit, this);
        EventBus.on('gamble-effect', this.playGambleEffect, this);
        EventBus.on('auto-merge', this.handleAutoMerge, this);
        
        // New Handlers
        EventBus.on('sell-unit', this.handleSellUnit, this);
        EventBus.on('exchange-unit', this.handleExchangeUnit, this);
        EventBus.on('summon-challenge-boss', this.summonChallengeBoss, this);

        // Initial Emit
        this.emitStats();
    }

    update(time: number, delta: number) {
        if (!this.isPlaying || this.isGameOver) return;

        const dt = delta * this.gameSpeed;

        this.handleWaveLogic(dt);
        this.moveEnemies(dt);
        this.handleTowers(time, dt);
        this.handleProjectiles(dt);
        this.cleanup();
    }

    // --- Interaction Logic ---

    private selectTower(container: Phaser.GameObjects.Container) {
        const tower = this.towers.find(t => t.container === container);
        if (!tower) return;

        // If clicking the ALREADY selected tower -> Try to auto-merge (Star up)
        if (this.selectedTower === tower) {
            this.attemptClickMerge(tower);
            return;
        }

        this.selectedTower = tower;
        this.drawSelection(tower.container.x, tower.container.y);
        this.drawRange(tower.container.x, tower.container.y, tower.config.range);
        
        // Pass ID to UI for precise identification
        const unitData = { ...tower.config, id: tower.id };
        EventBus.emit('tower-selected', unitData);
        
        // Visual Pop
        this.tweens.add({
            targets: container,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 100,
            yoyo: true
        });
    }

    private deselectTower() {
        this.selectedTower = null;
        this.selectionGraphics.clear();
        this.rangeGraphics.clear();
        EventBus.emit('tower-deselected');
    }

    private attemptClickMerge(tower: any) {
        // Legendaries and Mythics cannot be merged via simple click (Evolution is via HUD)
        if (tower.config.rarity === Rarity.LEGENDARY || tower.config.rarity === Rarity.MYTHIC) {
            this.addVisualEffect(tower.container.x, tower.container.y, "MAX", "normal");
            return;
        }

        // Find another matching tower
        const match = this.towers.find(t => 
            t !== tower && 
            t.config.name === tower.config.name && 
            t.config.rarity === tower.config.rarity
        );

        if (match) {
            this.executeMerge(tower, match);
        } else {
            // No match found
            this.addVisualEffect(tower.container.x, tower.container.y, "No Match", "normal");
            this.cameras.main.shake(100, 0.002);
        }
    }

    private executeMerge(t1: any, t2: any) {
         // Found a match! Merge them.
        this.addVisualEffect(t1.container.x, t1.container.y, "MERGE!", "merge");
        this.addVisualEffect(t2.container.x, t2.container.y, "MERGE!", "merge");

        // Store rarity and pos before destroy
        const x = t1.x;
        const y = t1.y;
        const rarity = t1.config.rarity;

        // Destroy both
        t1.container.destroy();
        t2.container.destroy();
        this.towers = this.towers.filter(t => t !== t1 && t !== t2);
        
        // Deselect
        this.deselectTower();
        
        // Request Summon Next Tier
        EventBus.emit('request-merge', { x, y, rarity });
        this.emitStats();
    }

    private handleAutoMerge() {
        // Group eligible towers by name+rarity
        const towersByKey: Record<string, any[]> = {};
        let mergedCount = 0;

        this.towers.forEach(t => {
            // Legendaries and Mythics cannot be auto-merged
            if (t.config.rarity === Rarity.LEGENDARY || t.config.rarity === Rarity.MYTHIC) return;
            
            const key = `${t.config.name}_${t.config.rarity}`;
            if (!towersByKey[key]) towersByKey[key] = [];
            towersByKey[key].push(t);
        });

        // Iterate groups and merge pairs
        Object.values(towersByKey).forEach(group => {
            while (group.length >= 2) {
                const t1 = group.pop();
                const t2 = group.pop();
                this.executeMerge(t1, t2);
                mergedCount++;
            }
        });

        if (mergedCount > 0) {
            // Global effect
             this.cameras.main.shake(200, 0.005);
             const cx = GRID_WIDTH * TILE_SIZE / 2;
             const cy = GRID_HEIGHT * TILE_SIZE / 2;
             this.addVisualEffect(cx, cy, `Auto Merged ${mergedCount} Pairs!`, 'normal', 1.5);
        } else {
             const cx = GRID_WIDTH * TILE_SIZE / 2;
             const cy = GRID_HEIGHT * TILE_SIZE / 2;
             this.addVisualEffect(cx, cy, `No mergeable units`, 'normal');
        }
    }

    private evolveUnit(data: { targetMythic: UnitConfig, ingredientIds: string[], x: number, y: number }) {
        // Verify ingredients exist
        const ingredients = this.towers.filter(t => data.ingredientIds.includes(t.id));
        
        if (ingredients.length !== data.ingredientIds.length) {
            console.error("Missing ingredients for evolution");
            return;
        }

        // Destroy ingredients
        ingredients.forEach(t => {
            this.addVisualEffect(t.container.x, t.container.y, "CONSUMED", "normal");
            t.container.destroy();
        });
        this.towers = this.towers.filter(t => !data.ingredientIds.includes(t.id));

        // Deselect just in case
        this.deselectTower();

        // Summon Mythic at the selected location
        // We use summonUnit logic but with specific config and location
        this.summonUnit({ x: data.x, y: data.y, unitConfig: data.targetMythic });
    }

    // --- New Features: Sell & Exchange & Challenge Boss ---

    private handleSellUnit(towerId: string) {
        const towerIndex = this.towers.findIndex(t => t.id === towerId);
        if (towerIndex === -1) return;
        
        const tower = this.towers[towerIndex];
        
        // Visual
        this.addVisualEffect(tower.container.x, tower.container.y, "SOLD", "normal");
        
        // Destroy
        tower.container.destroy();
        this.towers.splice(towerIndex, 1);
        
        // Reset Selection if sold
        if (this.selectedTower === tower) {
            this.deselectTower();
        }
        
        this.emitStats();
    }

    private handleExchangeUnit(towerId: string) {
        const tower = this.towers.find(t => t.id === towerId);
        if (!tower) return;
        
        const currentRarity = tower.config.rarity as Rarity;
        
        // Mythics cannot be exchanged usually, but let's allow it if user wants to spend a ticket
        const pool = UNIT_TYPES[currentRarity];
        const newConfig = pool[Math.floor(Math.random() * pool.length)];
        
        // Update Config
        tower.config = newConfig;
        
        // Update Visuals
        // Remove old visual items from container
        tower.container.removeAll(true);
        
        // Re-create visual
        // Colors mapping
        let color = 0x888888;
        if (newConfig.rarity === Rarity.COMMON) color = 0xa8a29e;
        if (newConfig.rarity === Rarity.RARE) color = 0x3b82f6;
        if (newConfig.rarity === Rarity.EPIC) color = 0xa855f7;
        if (newConfig.rarity === Rarity.LEGENDARY) color = 0xeab308;
        if (newConfig.rarity === Rarity.MYTHIC) color = 0xff00ff;

        const bg = this.add.rectangle(0, 0, TILE_SIZE-6, TILE_SIZE-6, color, 0.9).setOrigin(0.5);
        bg.setStrokeStyle(2, 0xffffff, 0.5);

        // Updated Font for Emoji
        const text = this.add.text(0, 0, newConfig.visual, { 
            fontSize: '28px', 
            align: 'center',
            fontFamily: EMOJI_FONT_FAMILY
        }).setOrigin(0.5);

        tower.container.add([bg, text]);
        
        // Effect
        this.addVisualEffect(tower.container.x, tower.container.y, "CHANGE!", "normal");
        
        // Reselect to update UI
        this.selectTower(tower.container);
        this.emitStats();
    }

    private summonChallengeBoss() {
        const hp = 3000 * this.challengeBossLevel; 
        
        // Custom boss logic reused
        const container = this.add.container(0, 0);
        // Updated Font
        const visual = this.add.text(0, 0, '☠️', { 
            fontSize: '60px',
            fontFamily: EMOJI_FONT_FAMILY
        }).setOrigin(0.5);
        
        // Purple glow for challenge boss
        const glow = this.add.circle(0,0, 40, 0xa855f7, 0.5);
        this.tweens.add({ targets: glow, alpha: 0.2, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });

        const hpBarBg = this.add.rectangle(0, -35, 60, 8, 0x222222).setOrigin(0.5);
        const hpBar = this.add.rectangle(-30, -35, 60, 8, 0xa855f7).setOrigin(0, 0.5);
        
        container.add([glow, visual, hpBarBg, hpBar]);
        container.setDepth(15); 

        const enemyObj = {
            id: Math.random().toString(),
            container: container,
            visual: visual,
            hpBar: hpBar,
            pathIndex: 0,
            progress: 0,
            hp: hp,
            maxHp: hp,
            speed: 0.0004, // Very slow
            frozen: 0,
            stunned: 0,
            isBoss: true,
            isChallenge: true // Flag for ticket drop
        };
        
        const start = PATH_COORDINATES[0];
        container.setPosition(start.x * TILE_SIZE + TILE_SIZE/2, start.y * TILE_SIZE + TILE_SIZE/2);
        
        this.enemies.push(enemyObj);
        this.enemyCount = this.enemies.length;
        EventBus.emit('enemy-count', this.enemyCount);
        
        // Announcement
        const notice = this.add.text(GRID_WIDTH * TILE_SIZE / 2, GRID_HEIGHT * TILE_SIZE / 2, `BOSS Lv.${this.challengeBossLevel}`, {
            fontSize: '40px',
            color: '#a855f7',
            stroke: '#ffffff',
            strokeThickness: 4,
            fontFamily: 'DungGeunMo'
        }).setOrigin(0.5).setDepth(4000);
        
        this.tweens.add({ targets: notice, scale: 1.5, alpha: 0, duration: 2000, onComplete: () => notice.destroy() });
    }

    private drawSelection(x: number, y: number) {
        this.selectionGraphics.clear();
        // Pulsing circle
        this.selectionGraphics.lineStyle(3, 0x00ff00, 0.8);
        this.selectionGraphics.strokeCircle(x, y, TILE_SIZE * 0.7);
    }

    // --- Core Logic ---

    private handleWaveLogic(dt: number) {
        this.waveTimer += dt;
        const totalDuration = WAVE_DURATION_SEC * 1000;
        const remaining = Math.max(0, totalDuration - this.waveTimer);
        
        const totalMobs = 40 + (this.wave * 8);
        const idealInterval = 500;
        const requiredInterval = (WAVE_DURATION_SEC * 1000 * 0.9) / totalMobs; 
        
        const interval = Math.min(idealInterval, requiredInterval);
        
        // Always spawn first enemy immediately if none exist and not game over
        if (this.spawnTimer === 0 && this.enemyCount === 0 && this.enemies.length === 0) {
             this.spawnEnemy();
        }

        this.spawnTimer += dt;
        
        if (this.spawnTimer >= interval && (this.enemies.length + (this.enemyCount - this.enemies.length)) < totalMobs) { 
             // Stop spawning 5 seconds before wave ends
             if (remaining > 5000) { 
                this.spawnEnemy();
                this.spawnTimer = 0;
             }
        }

        if (this.waveTimer >= totalDuration) {
            this.wave++;
            this.waveTimer = 0;
            this.spawnedInCurrentWave = 0; // Reset spawn counter
            EventBus.emit('wave-complete', this.wave);
            this.cameras.main.shake(200, 0.005);
        }

        // Optimization: Only emit when second changes to prevent React re-renders (60fps -> 1fps)
        const currentSec = Math.ceil(remaining / 1000);
        if (currentSec !== this.lastTimerSec) {
            this.lastTimerSec = currentSec;
            EventBus.emit('timer-update', remaining);
        }
    }

    private spawnEnemy() {
        this.spawnedInCurrentWave++;
        
        // Boss Logic: Every 5 waves, spawn a boss every 10th enemy
        const isBossWave = this.wave % 5 === 0;
        let isBoss = false;
        
        if (isBossWave) {
            if (this.spawnedInCurrentWave % 10 === 0) {
                isBoss = true;
            }
        }

        const hpBase = 100 * Math.pow(1.2, this.wave);
        const maxHp = Math.floor(hpBase * (isBoss ? 15 : 1)); // Boss has 15x HP
        
        const container = this.add.container(0, 0);
        const visualText = isBoss ? '👹' : '😈';
        // Use Emoji Font for Mobs too
        const visual = this.add.text(0, 0, visualText, { 
            fontSize: isBoss ? '52px' : '26px',
            fontFamily: EMOJI_FONT_FAMILY
        }).setOrigin(0.5);
        
        // Shadow
        const shadow = this.add.ellipse(0, 15, isBoss ? 40 : 20, isBoss ? 16 : 8, 0x000000, 0.5);
        
        // HP Bar
        const hpBarBg = this.add.rectangle(0, -25, isBoss ? 50 : 30, 5, 0x222222).setOrigin(0.5);
        const hpBar = this.add.rectangle(isBoss ? -25 : -15, -25, isBoss ? 50 : 30, 5, isBoss ? 0xff0000 : 0x00ff00).setOrigin(0, 0.5);
        
        container.add([shadow, visual, hpBarBg, hpBar]);
        container.setDepth(10); // Enemies above grid, below projectiles

        const enemyObj = {
            id: Math.random().toString(),
            container: container,
            visual: visual, // Store reference to text for tinting
            hpBar: hpBar,
            pathIndex: 0,
            progress: 0,
            hp: maxHp,
            maxHp: maxHp,
            speed: (0.0006 + (Math.min(this.wave, 50) * 0.00001)) * (isBoss ? 0.6 : 1.0), // Boss is slower
            frozen: 0,
            stunned: 0,
            isBoss: isBoss,
            isChallenge: false
        };
        
        const start = PATH_COORDINATES[0];
        container.setPosition(start.x * TILE_SIZE + TILE_SIZE/2, start.y * TILE_SIZE + TILE_SIZE/2);
        
        this.enemies.push(enemyObj);
        this.enemyCount = this.enemies.length;
        EventBus.emit('enemy-count', this.enemyCount);

        if (this.enemyCount > MAX_ENEMIES) {
            this.isGameOver = true;
            EventBus.emit('game-over');
            this.cameras.main.shake(500, 0.02);
        }
    }

    private moveEnemies(dt: number) {
        this.enemies.forEach(e => {
            // Status Effects: Stun and Freeze (0.1s stop)
            if (e.stunned > 0) {
                e.stunned -= dt;
                // Jitter effect
                e.container.x += (Math.random() - 0.5) * 2;
                return; // Stop moving
            }

            if (e.frozen > 0) {
                e.frozen -= dt;
                e.container.setAlpha(0.6); 
                // Fix: Apply tint to visual (Text), not container
                if (e.visual) e.visual.setTint(0x00ffff);
                return; // Stop moving (0.1s freeze request)
            } else {
                e.container.setAlpha(1);
                // Fix: Clear tint from visual (Text)
                if (e.visual) e.visual.clearTint();
            }

            let speed = e.speed;
            
            // Updated Movement Logic for High Speed Support
            // Instead of resetting progress to 0 when >= 1, we subtract 1
            // to preserve the "extra" distance traveled in this frame.
            e.progress += speed * dt;

            while (e.progress >= 1) {
                e.progress -= 1;
                e.pathIndex++;
                if (e.pathIndex >= PATH_COORDINATES.length - 1) {
                    e.pathIndex = 0; 
                }
            }

            const current = PATH_COORDINATES[e.pathIndex];
            const next = PATH_COORDINATES[e.pathIndex + 1] || PATH_COORDINATES[0];
            
            const x = (current.x + (next.x - current.x) * e.progress) * TILE_SIZE + TILE_SIZE/2;
            const y = (current.y + (next.y - current.y) * e.progress) * TILE_SIZE + TILE_SIZE/2;
            
            e.container.setPosition(x, y);
            e.container.setDepth(y); 
        });
    }

    private handleTowers(time: number, dt: number) {
        this.towers.forEach(tower => {
            tower.cooldown -= dt;
            if (tower.cooldown <= 0) {
                const target = this.findTarget(tower);
                if (target) {
                    this.fireProjectile(tower, target);
                    this.tweens.add({
                        targets: tower.container,
                        scaleX: 1.1,
                        scaleY: 0.9,
                        duration: 50,
                        yoyo: true
                    });
                    tower.cooldown = (tower.config.attackSpeed / 30) * 1000;
                }
            }
        });
    }

    private findTarget(tower: any) {
        let closest = null;
        let maxProgress = -1; 
        const rangePx = tower.config.range * TILE_SIZE;

        for (const e of this.enemies) {
            const dist = Phaser.Math.Distance.Between(tower.container.x, tower.container.y, e.container.x, e.container.y);
            if (dist <= rangePx) {
                const score = (e.isBoss ? 1000 : 0) + e.pathIndex + e.progress;
                if (score > maxProgress) {
                    maxProgress = score;
                    closest = e;
                }
            }
        }
        return closest;
    }

    private fireProjectile(tower: any, target: any) {
        const config = tower.config;
        
        // Calculate Damage with Upgrades
        const level = this.upgradeLevels[config.rarity as Rarity] || 0;
        const multiplier = 1 + (level * 0.2); // +20% per level
        let damage = config.damage * multiplier;

        if (config.attackType === 'INSTANT') {
            this.hitTarget(target, config, damage);
            const line = this.add.line(0, 0, tower.container.x, tower.container.y, target.container.x, target.container.y, 0xffffff, 0.5).setLineWidth(2);
            this.tweens.add({ targets: line, alpha: 0, width: 0, duration: 150, onComplete: () => line.destroy() });
            
        } else {
            const visual = this.getProjectileVisual(config);
            // Use Emoji Font
            const proj = this.add.text(tower.container.x, tower.container.y, visual, { 
                fontSize: '18px',
                fontFamily: EMOJI_FONT_FAMILY
            }).setOrigin(0.5).setDepth(2000);
            
            this.projectiles.push({
                obj: proj,
                targetId: target.id,
                damage: damage,
                speed: 0.8, 
                config: config,
                target: target 
            });
        }
    }

    private handleProjectiles(dt: number) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const target = this.enemies.find(e => e.id === p.targetId);
            
            let tx, ty;
            if (target) {
                tx = target.container.x;
                ty = target.container.y;
            } else {
                p.obj.destroy();
                this.projectiles.splice(i, 1);
                continue;
            }

            const angle = Phaser.Math.Angle.Between(p.obj.x, p.obj.y, tx, ty);
            const dist = Phaser.Math.Distance.Between(p.obj.x, p.obj.y, tx, ty);
            const moveDist = p.speed * dt;

            p.obj.rotation += 0.2; 

            if (dist < moveDist) {
                this.hitTarget(target, p.config, p.damage);
                this.addVisualEffect(tx, ty, '💥', 'hit');
                p.obj.destroy();
                this.projectiles.splice(i, 1);
            } else {
                p.obj.x += Math.cos(angle) * moveDist;
                p.obj.y += Math.sin(angle) * moveDist;
            }
        }
    }

    private hitTarget(target: any, config: any, damage: number) {
        if (!target || target.hp <= 0) return;

        const isCrit = Math.random() < 0.2; 
        let finalDamage = damage * (isCrit ? 1.5 : 1);
        finalDamage = Math.floor(finalDamage);

        // Status Effects (100ms duration)
        if (config.effect === 'slow') {
             target.frozen = 100;
        }
        if (config.effect === 'stun') {
             target.stunned = 100;
        }

        if (config.attackType === 'SPLASH') {
            const radiusPx = (config.splashRadius || 1.5) * TILE_SIZE;
            
            const boom = this.add.circle(target.container.x, target.container.y, radiusPx, 0xffaa00, 0.4);
            this.tweens.add({ targets: boom, scale: 1.2, alpha: 0, duration: 200, onComplete: () => boom.destroy() });

            this.enemies.forEach(e => {
                if (Phaser.Math.Distance.Between(e.container.x, e.container.y, target.container.x, target.container.y) <= radiusPx) {
                    this.damageEnemy(e, finalDamage, isCrit);
                    // Splash Effect Transfer
                    if (config.effect === 'slow') e.frozen = 100;
                    if (config.effect === 'stun') e.stunned = 100;
                }
            });
        } else {
            this.damageEnemy(target, finalDamage, isCrit);
        }
    }

    private damageEnemy(enemy: any, amount: number, isCrit: boolean = false) {
        if (enemy.hp <= 0) return;

        enemy.hp -= amount;
        
        const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
        enemy.hpBar.width = (enemy.isBoss ? 50 : 30) * hpPercent;
        enemy.hpBar.fillColor = hpPercent < 0.3 ? 0xff0000 : 0x00ff00;

        this.showDamageText(enemy.container.x, enemy.container.y - 20, amount, isCrit);

        if (enemy.hp <= 0 && !enemy.dead) {
            enemy.dead = true;
        }
    }

    private showDamageText(x: number, y: number, amount: number, isCrit: boolean) {
        const rx = x + (Math.random() - 0.5) * 20;
        const ry = y + (Math.random() - 0.5) * 10;
        
        const style = {
            fontSize: isCrit ? '24px' : '16px',
            fontStyle: 'bold',
            fontFamily: 'DungGeunMo', // Pixel Font
            color: isCrit ? '#ff0000' : '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        };
        
        const text = this.add.text(rx, ry, Math.floor(amount).toString(), style).setOrigin(0.5).setDepth(3000);
        
        this.tweens.add({
            targets: text,
            y: ry - 40,
            scale: isCrit ? 1.5 : 1.0,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    private cleanup() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp <= 0) {
                const reward = (10 + Math.floor(this.wave * 0.5)) * (e.isBoss ? 10 : 1);
                EventBus.emit('gain-gold', reward);
                this.addVisualEffect(e.container.x, e.container.y, `+${reward}G`, 'gold');
                
                // TICKET DROP LOGIC
                // 1. Challenge Boss or Wave Boss (5, 10...)
                if (e.isBoss || e.isChallenge) {
                    EventBus.emit('gain-ticket', 1);
                    this.addVisualEffect(e.container.x, e.container.y - 20, `+1 🎫`, 'normal', 1.5);
                    
                    // Challenge Boss Level Up logic
                    if (e.isChallenge) {
                        this.challengeBossLevel *= 2;
                        EventBus.emit('challenge-boss-level', this.challengeBossLevel);
                        this.addVisualEffect(e.container.x, e.container.y - 40, `BOSS LV UP!`, 'normal', 1.5);
                    }
                } 
                // 2. Normal Mob RNG
                else {
                    if (Math.random() < TICKET_DROP_RATE) {
                        EventBus.emit('gain-ticket', 1);
                        this.addVisualEffect(e.container.x, e.container.y - 20, `LUCKY! +1 🎫`, 'normal', 1.5);
                    }
                }

                e.container.destroy();
                this.enemies.splice(i, 1);
            }
        }
        
        if (this.enemies.length !== this.enemyCount) {
            this.enemyCount = this.enemies.length;
            EventBus.emit('enemy-count', this.enemyCount);
        }
    }

    // --- Helpers & Visuals ---

    private drawGrid() {
        this.gridGraphics.clear();
        this.pathGraphics.clear();

        // Dark background
        this.add.rectangle(GRID_WIDTH * TILE_SIZE / 2, GRID_HEIGHT * TILE_SIZE / 2, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE, 0x111111).setDepth(-10);

        // Path (Neon Style)
        PATH_COORDINATES.forEach((coord, index) => {
            // Path Glow
            this.pathGraphics.fillStyle(0x222222, 1);
            this.pathGraphics.fillRect(coord.x * TILE_SIZE, coord.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        });

        // Grid Lines (Subtle)
        this.gridGraphics.lineStyle(1, 0x333333, 0.3);
        for (let x = 0; x <= GRID_WIDTH; x++) {
            this.gridGraphics.moveTo(x * TILE_SIZE, 0);
            this.gridGraphics.lineTo(x * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);
        }
        for (let y = 0; y <= GRID_HEIGHT; y++) {
            this.gridGraphics.moveTo(0, y * TILE_SIZE);
            this.gridGraphics.lineTo(GRID_WIDTH * TILE_SIZE, y * TILE_SIZE);
        }
        this.gridGraphics.strokePath();
    }

    private drawRange(x: number, y: number, rangeTiles: number) {
        this.rangeGraphics.clear();
        this.rangeGraphics.lineStyle(2, 0xffffff, 0.5);
        this.rangeGraphics.fillStyle(0xffffff, 0.1);
        this.rangeGraphics.fillCircle(x, y, rangeTiles * TILE_SIZE);
        this.rangeGraphics.strokeCircle(x, y, rangeTiles * TILE_SIZE);
    }

    // Triggered by "Gamble" logic from React
    private playGambleEffect(data: { x: number, y: number, success: boolean }) {
        const xPos = data.x * TILE_SIZE + TILE_SIZE/2;
        const yPos = data.y * TILE_SIZE + TILE_SIZE/2;
        
        // Success: Golden burst + Text
        if (data.success) {
            const burst = this.add.circle(xPos, yPos, 10, 0xffd700);
            this.tweens.add({
                targets: burst,
                scale: 15, // Fill screen almost
                alpha: 0,
                duration: 600,
                ease: 'Sine.easeOut',
                onComplete: () => burst.destroy()
            });

            const text = this.add.text(xPos, yPos, '대성공!!', {
                fontSize: '40px',
                fontFamily: 'DungGeunMo',
                color: '#ffffff',
                stroke: '#eab308',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(3000).setScale(0);

            this.tweens.add({
                targets: text,
                scale: 1.5,
                y: yPos - 50,
                duration: 400,
                yoyo: true,
                onComplete: () => text.destroy()
            });
            
            // Shake
            this.cameras.main.shake(300, 0.01);

        } else {
            // Fail: Grey smoke + Text
            const burst = this.add.circle(xPos, yPos, 10, 0x555555);
            this.tweens.add({
                targets: burst,
                scale: 5,
                alpha: 0,
                duration: 500,
                onComplete: () => burst.destroy()
            });

            const text = this.add.text(xPos, yPos, '꽝...', {
                fontSize: '24px',
                fontFamily: 'DungGeunMo',
                color: '#aaaaaa'
            }).setOrigin(0.5).setDepth(3000);

            this.tweens.add({
                targets: text,
                y: yPos - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => text.destroy()
            });
        }
    }

    private summonUnit(data: { x: number, y: number, unitConfig: UnitConfig }) {
        if (!data.unitConfig) return;

        const container = this.add.container(data.x * TILE_SIZE + TILE_SIZE/2, data.y * TILE_SIZE + TILE_SIZE/2);
        container.setSize(TILE_SIZE, TILE_SIZE);
        
        // Colors mapping
        let color = 0x888888;
        if (data.unitConfig.rarity === Rarity.COMMON) color = 0xa8a29e;
        if (data.unitConfig.rarity === Rarity.RARE) color = 0x3b82f6;
        if (data.unitConfig.rarity === Rarity.EPIC) color = 0xa855f7;
        if (data.unitConfig.rarity === Rarity.LEGENDARY) color = 0xeab308;
        if (data.unitConfig.rarity === Rarity.MYTHIC) color = 0xff00ff;

        // Card Shape
        const bg = this.add.rectangle(0, 0, TILE_SIZE-6, TILE_SIZE-6, color, 0.9).setOrigin(0.5);
        bg.setStrokeStyle(2, 0xffffff, 0.5);

        // Emoji (Updated Font)
        const text = this.add.text(0, 0, data.unitConfig.visual, { 
            fontSize: '28px', 
            align: 'center',
            fontFamily: EMOJI_FONT_FAMILY
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setData('config', data.unitConfig);
        container.setData('bg', bg);
        
        // Interaction
        container.setInteractive();
        
        // Pointer down for selection (Handled in create for global, but local listener good for ensuring target)
        container.on('pointerdown', (pointer: any, localX: any, localY: any, event: any) => {
             event.stopPropagation(); // Stop background click
             this.selectTower(container);
        });

        this.towers.push({
            id: Math.random().toString(),
            container: container,
            config: data.unitConfig,
            cooldown: 0,
            level: 1,
            x: data.x, 
            y: data.y
        });
        
        // --- Enhanced Spawn Effects Based on Rarity ---
        const cx = container.x;
        const cy = container.y;

        if (data.unitConfig.rarity === Rarity.COMMON) {
            // Simple pop
            container.setScale(0);
            this.tweens.add({ targets: container, scale: 1, duration: 200, ease: 'Back.out' });
            
        } else if (data.unitConfig.rarity === Rarity.RARE) {
            // Blue pulse
            container.setScale(0);
            this.tweens.add({ targets: container, scale: 1, duration: 300, ease: 'Back.out' });
            const ring = this.add.circle(cx, cy, 10, 0x3b82f6);
            this.tweens.add({ 
                targets: ring, 
                scale: 5, 
                alpha: 0, 
                duration: 500, 
                onComplete: () => ring.destroy() 
            });
            this.addVisualEffect(cx, cy - 20, "RARE!", "normal");

        } else if (data.unitConfig.rarity === Rarity.EPIC) {
            // Purple Spin + Burst
            container.setScale(0);
            container.setAngle(180);
            this.tweens.add({ 
                targets: container, 
                scale: 1, 
                angle: 0, 
                duration: 500, 
                ease: 'Cubic.out' 
            });
            
            const burst = this.add.star(cx, cy, 5, 10, 40, 0xa855f7);
            this.tweens.add({
                targets: burst,
                scale: 3,
                alpha: 0,
                duration: 600,
                rotation: 1,
                onComplete: () => burst.destroy()
            });
            this.addVisualEffect(cx, cy - 30, "EPIC!!", "normal", 1.2);

        } else {
            // Legendary / Mythic: EXPLOSION
            container.setScale(0);
            this.tweens.add({ targets: container, scale: 1, duration: 600, ease: 'Elastic.out' });

            // Flash screen
            this.cameras.main.flash(300, 255, 255, 255);
            this.cameras.main.shake(500, 0.02);

            // Rays
            const rays = this.add.triangle(cx, cy, 0, -100, 50, 100, -50, 100, 0xffd700);
            rays.setAlpha(0.6);
            this.tweens.add({
                targets: rays,
                angle: 360,
                duration: 1000,
                scale: 2,
                alpha: 0,
                onComplete: () => rays.destroy()
            });

            // Text
            const label = data.unitConfig.rarity === Rarity.MYTHIC ? "MYTHIC!!!" : "LEGENDARY!!";
            const color = data.unitConfig.rarity === Rarity.MYTHIC ? "#ff00ff" : "#ffd700";
            
            const bigText = this.add.text(cx, cy, label, {
                fontSize: '32px',
                fontFamily: 'DungGeunMo',
                color: color,
                stroke: '#ffffff',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(3000).setScale(0);

            this.tweens.add({
                targets: bigText,
                scale: 2,
                y: cy - 60,
                duration: 500,
                yoyo: true,
                onComplete: () => bigText.destroy()
            });
        }

        this.emitStats();
    }

    // --- Visual Helpers ---

    private addVisualEffect(x: number, y: number, text: string, type: string, scale: number = 1) {
        const t = this.add.text(x, y, text, { 
            fontSize: '20px', 
            fontStyle: 'bold',
            fontFamily: 'DungGeunMo'
        }).setOrigin(0.5).setDepth(2000);
        
        if (type === 'gold') {
            t.setColor('#ffd700');
            t.setStroke('#000', 2);
            this.tweens.add({
                targets: t,
                y: y - 40,
                alpha: 0,
                duration: 1000,
                onComplete: () => t.destroy()
            });
        } else {
            this.tweens.add({
                targets: t,
                scale: 1.5 * scale,
                alpha: 0,
                duration: 400,
                onComplete: () => t.destroy()
            });
        }
    }

    private getProjectileVisual(config: UnitConfig) {
        if (config.visual === '🔥') return '🔥';
        if (config.visual === '❄️') return '❄️';
        if (config.visual === '🐲') return '🟠';
        if (config.visual === '⚡') return '⚡';
        if (config.visual === '🏹') return '🗡️';
        if (config.visual === '🪨') return '🌑';
        if (config.visual === '💣') return '💥';
        return '🔹';
    }

    private restartGame() {
        this.enemies.forEach(e => e.container.destroy());
        this.towers.forEach(t => t.container.destroy());
        this.projectiles.forEach(p => p.obj.destroy());
        this.deselectTower();
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.enemyCount = 0;
        this.wave = 1;
        this.waveTimer = 0;
        this.spawnedInCurrentWave = 0;
        this.isGameOver = false;
        this.isPlaying = true;
        this.challengeBossLevel = 1;
        this.emitStats();
    }

    private checkRecipe() {} // Handled in React mainly
    private emitStats() {
        const simpleTowers = this.towers.map(t => ({ type: t.config, x: t.x, y: t.y, id: t.id }));
        EventBus.emit('stats-update', { towers: simpleTowers });
    }
}