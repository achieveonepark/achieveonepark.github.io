import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Coins, Users, Skull, Zap, Play, Pause, RefreshCcw,
  Bot, Dna, Sparkles, Ticket, Hammer, Combine, FastForward, Info, Library, X, Clock, ArrowRight,
  Trash2, RefreshCw, Swords, ChevronRight, Settings
} from 'lucide-react';
import { PhaserGame } from './game/PhaserGame';
import { EventBus } from './game/EventBus';
import { 
  SUMMON_COST, SUMMON_COST_INCREASE, TOKEN_COST, SELL_PRICES, EXCHANGE_PRICES,
  PROBABILITIES, 
  UNIT_TYPES, UPGRADE_COSTS, MAX_ENEMIES, GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, isPathCell, PATH_COORDINATES,
  CHALLENGE_BOSS_COOLDOWN_MS
} from './constants';
import { Rarity, GameState, Tower, UnitConfig } from './types';
import { getGameCommentary } from './services/geminiService';

// Helper to find visual for recipe
const getUnitVisual = (name: string): string => {
    for (const r of Object.values(Rarity)) {
        const found = UNIT_TYPES[r].find(u => u.name === name);
        if (found) return found.visual;
    }
    return '?';
};

const App: React.FC = () => {
  // --- UI State ---
  const [gameState, setGameState] = useState<GameState>({
    gold: 300,
    tokens: 3,
    summonCost: SUMMON_COST,
    wave: 1,
    waveTime: 0,
    isPlaying: false,
    isGameOver: false,
    gameTick: 0,
    gameSpeed: 1,
    upgradeLevels: {
      [Rarity.COMMON]: 0,
      [Rarity.RARE]: 0,
      [Rarity.EPIC]: 0,
      [Rarity.LEGENDARY]: 0,
      [Rarity.MYTHIC]: 0,
    }
  });

  const [enemyCount, setEnemyCount] = useState(0);
  const [aiComment, setAiComment] = useState<string>("Phaser 엔진 가동! 100마리가 넘지 않게 막아내세요!");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitConfig & { id?: string } | null>(null);
  
  // Modals
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isCheatOpen, setIsCheatOpen] = useState(false);
  
  // Boss State
  const [bossCooldown, setBossCooldown] = useState(0); // Timestamp
  const [bossLevel, setBossLevel] = useState(1); // For display
  
  const towersRef = useRef<Tower[]>([]);

  // --- Event Listeners ---
  useEffect(() => {
    EventBus.on('gain-gold', (amount: number) => {
      setGameState(prev => ({ ...prev, gold: prev.gold + amount }));
    });
    
    // Ticket handling
    EventBus.on('gain-ticket', (amount: number) => {
      setGameState(prev => ({ ...prev, tokens: prev.tokens + amount }));
    });

    EventBus.on('wave-complete', (wave: number) => {
      setGameState(prev => ({ 
        ...prev, 
        wave: wave
      }));
    });

    EventBus.on('timer-update', (remaining: number) => {
        setGameState(prev => ({ ...prev, waveTime: remaining }));
    });

    EventBus.on('enemy-count', setEnemyCount);
    
    EventBus.on('game-over', () => {
        setGameState(prev => ({ ...prev, isGameOver: true, isPlaying: false }));
    });

    EventBus.on('stats-update', (data: { towers: any[] }) => {
        towersRef.current = data.towers;
    });
    
    // Boss Level Sync
    EventBus.on('challenge-boss-level', (lvl: number) => {
        setBossLevel(lvl);
    });

    EventBus.on('request-merge', (data: { x: number, y: number, rarity: Rarity }) => {
         handleMergeRequest(data.x, data.y, data.rarity);
    });

    // Selection Events
    EventBus.on('tower-selected', (unit: UnitConfig & { id?: string }) => {
        setSelectedUnit(unit);
    });
    EventBus.on('tower-deselected', () => {
        setSelectedUnit(null);
    });
    EventBus.on('sell-unit', (unitId: string) => {
        // Optimistic UI update or wait for next stat update
        setSelectedUnit(null);
    });

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'c') {
            setIsCheatOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        EventBus.removeAllListeners();
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- Logic Helpers ---

  const handleMergeRequest = (x: number, y: number, currentRarity: Rarity) => {
     let nextRarity = Rarity.COMMON;
     if (currentRarity === Rarity.COMMON) nextRarity = Rarity.RARE;
     else if (currentRarity === Rarity.RARE) nextRarity = Rarity.EPIC;
     else if (currentRarity === Rarity.EPIC) nextRarity = Rarity.LEGENDARY;
     
     if (currentRarity === Rarity.LEGENDARY || currentRarity === Rarity.MYTHIC) return;

     const pool = UNIT_TYPES[nextRarity];
     const nextType = pool[Math.floor(Math.random() * pool.length)];
     
     EventBus.emit('summon-unit', { x, y, unitConfig: nextType });
  };

  const summonUnit = (rarityOverride?: Rarity, free?: boolean, spotOverride?: {x: number, y: number}) => {
    // Logic for dynamic cost
    // Free summons (gamble/merge) use 0 cost. Paid summons use current summonCost.
    const currentCost = free ? 0 : gameState.summonCost;

    if (!free && gameState.gold < currentCost) return;
    
    let spot = spotOverride;

    if (!spot) {
        // Check space
        let emptySpots = [];
        for(let y=0; y<GRID_HEIGHT; y++) {
            for(let x=0; x<GRID_WIDTH; x++) {
                if(!isPathCell(x,y) && !towersRef.current.some(t => t.x === x && t.y === y)) {
                    emptySpots.push({x,y});
                }
            }
        }

        if(emptySpots.length === 0) {
            alert("빈 공간이 없습니다!");
            return;
        }
        spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    }

    let selectedRarity = Rarity.COMMON;
    if (rarityOverride) {
      selectedRarity = rarityOverride;
    } else {
      const rand = Math.random();
      let cumulative = 0;
      if (rand < (cumulative += PROBABILITIES[Rarity.COMMON])) selectedRarity = Rarity.COMMON;
      else if (rand < (cumulative += PROBABILITIES[Rarity.RARE])) selectedRarity = Rarity.RARE;
      else if (rand < (cumulative += PROBABILITIES[Rarity.EPIC])) selectedRarity = Rarity.EPIC;
      else selectedRarity = Rarity.LEGENDARY;
    }

    const pool = UNIT_TYPES[selectedRarity];
    const unitConfig = pool[Math.floor(Math.random() * pool.length)];

    if (!free) {
        setGameState(prev => ({ 
            ...prev, 
            gold: prev.gold - currentCost,
            summonCost: prev.summonCost + SUMMON_COST_INCREASE
        }));
    }

    EventBus.emit('summon-unit', { x: spot.x, y: spot.y, unitConfig });
  };

  const gambleToken = () => {
    if (gameState.tokens < TOKEN_COST) return;
    
    // Find empty spot first
    let emptySpots = [];
    for(let y=0; y<GRID_HEIGHT; y++) {
        for(let x=0; x<GRID_WIDTH; x++) {
            if(!isPathCell(x,y) && !towersRef.current.some(t => t.x === x && t.y === y)) {
                emptySpots.push({x,y});
            }
        }
    }
    
    if (emptySpots.length === 0) { alert("공간 부족"); return; }
    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];

    setGameState(prev => ({ ...prev, tokens: prev.tokens - TOKEN_COST }));

    // 50% Success Rate
    const isSuccess = Math.random() < 0.5;

    // Trigger Visual Effect for Gamble Result
    EventBus.emit('gamble-effect', { x: spot.x, y: spot.y, success: isSuccess });

    if (!isSuccess) {
        // Fail: Summon Common
        summonUnit(Rarity.COMMON, true, spot);
    } else {
        // Success: 99% Rare, 0.8% Epic, 0.2% Legendary
        const rand = Math.random();
        let selectedRarity = Rarity.RARE;
        
        if (rand < 0.99) selectedRarity = Rarity.RARE;
        else if (rand < 0.998) selectedRarity = Rarity.EPIC;
        else selectedRarity = Rarity.LEGENDARY;

        summonUnit(selectedRarity, true, spot);
    }
  };
  
  const autoMerge = () => {
      EventBus.emit('auto-merge');
  };

  const upgradeUnit = (rarity: Rarity) => {
     const cost = UPGRADE_COSTS[rarity];
     if (gameState.gold >= cost) {
         setGameState(prev => {
             const newLevels = { ...prev.upgradeLevels, [rarity]: prev.upgradeLevels[rarity] + 1 };
             // Emit upgrade event to Phaser immediately
             EventBus.emit('upgrades-update', newLevels);
             return { ...prev, gold: prev.gold - cost, upgradeLevels: newLevels };
         });
     }
  };

  const openEncyclopedia = () => {
      setIsEncyclopediaOpen(true);
  };

  const handleAiAnalysis = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiComment("Gemini가 전장을 분석 중입니다...");
    const comment = await getGameCommentary(towersRef.current, gameState, enemyCount);
    setAiComment(comment);
    setIsAiLoading(false);
  };

  const togglePlay = (playing: boolean) => {
    setGameState(prev => ({ ...prev, isPlaying: playing }));
    EventBus.emit('toggle-play', playing);
  };
  
  const toggleSpeed = () => {
     const newSpeed = gameState.gameSpeed === 1 ? 2 : 1;
     setGameSpeed(newSpeed);
  };
  
  const setGameSpeed = (speed: number) => {
      setGameState(prev => ({ ...prev, gameSpeed: speed }));
      EventBus.emit('set-game-speed', speed);
  };

  const addCheatResource = (type: 'gold' | 'token', amount: number) => {
      if (type === 'gold') {
          setGameState(prev => ({ ...prev, gold: prev.gold + amount }));
      } else {
          setGameState(prev => ({ ...prev, tokens: prev.tokens + amount }));
      }
  };

  const restartGame = () => {
    setGameState({
      gold: 250,
      tokens: 3,
      summonCost: SUMMON_COST,
      wave: 1,
      waveTime: 0,
      isPlaying: true,
      isGameOver: false,
      gameTick: 0,
      gameSpeed: 1,
      upgradeLevels: {
        [Rarity.COMMON]: 0,
        [Rarity.RARE]: 0,
        [Rarity.EPIC]: 0,
        [Rarity.LEGENDARY]: 0,
        [Rarity.MYTHIC]: 0,
      }
    });
    setEnemyCount(0);
    setBossCooldown(0);
    setBossLevel(1);
    setSelectedUnit(null);
    EventBus.emit('restart-game');
  };

  // Evolution Logic Check
  const getEvolutionOption = () => {
    if (!selectedUnit || selectedUnit.rarity !== Rarity.LEGENDARY) return null;

    // Find Mythic recipes that use this unit
    const mythics = UNIT_TYPES[Rarity.MYTHIC];
    for (const mythic of mythics) {
        if (!mythic.recipe) continue;
        if (mythic.recipe.includes(selectedUnit.name)) {
            // Check if we have all ingredients
            // We need to find specific tower instances on the board
            const ingredients: string[] = [];
            let possible = true;
            
            const availableTowers = [...towersRef.current];
            const selectedIdx = availableTowers.findIndex(t => t.id === selectedUnit.id);
            if (selectedIdx === -1) return null; 
            
            ingredients.push(selectedUnit.id!);
            availableTowers.splice(selectedIdx, 1);
            
            const needed = [...mythic.recipe];
            const nameIdx = needed.indexOf(selectedUnit.name);
            if (nameIdx !== -1) needed.splice(nameIdx, 1);

            for (const reqName of needed) {
                const foundIdx = availableTowers.findIndex(t => t.type.name === reqName);
                if (foundIdx !== -1) {
                    ingredients.push(availableTowers[foundIdx].id);
                    availableTowers.splice(foundIdx, 1);
                } else {
                    possible = false;
                    break;
                }
            }

            if (possible) {
                return {
                    target: mythic,
                    ingredients: ingredients
                };
            }
        }
    }
    return null;
  };

  const evolutionOption = getEvolutionOption();

  const handleEvolve = () => {
      if (!evolutionOption || !selectedUnit) return;
      const tower = towersRef.current.find(t => t.id === selectedUnit.id);
      if (!tower) return;

      EventBus.emit('evolve-unit', {
          targetMythic: evolutionOption.target,
          ingredientIds: evolutionOption.ingredients,
          x: tower.x,
          y: tower.y
      });
  };
  
  const handleSell = () => {
      if (!selectedUnit || !selectedUnit.id) return;
      const price = SELL_PRICES[selectedUnit.rarity];
      setGameState(prev => ({ ...prev, gold: prev.gold + price }));
      EventBus.emit('sell-unit', selectedUnit.id);
      setSelectedUnit(null);
  };
  
  const handleExchange = () => {
      if (!selectedUnit || !selectedUnit.id) return;
      const cost = EXCHANGE_PRICES[selectedUnit.rarity];
      if (gameState.gold < cost) return;
      
      setGameState(prev => ({ ...prev, gold: prev.gold - cost }));
      EventBus.emit('exchange-unit', selectedUnit.id);
      // Don't deselect, just let the visual update
  };
  
  const handleChallengeBoss = () => {
      const now = Date.now();
      if (now < bossCooldown) return;
      
      setBossCooldown(now + CHALLENGE_BOSS_COOLDOWN_MS);
      EventBus.emit('summon-challenge-boss');
  };

  // Time formatting
  const remainingSec = Math.ceil(gameState.waveTime / 1000);
  
  // Boss Cooldown logic
  const now = Date.now();
  const bossRemainingMs = Math.max(0, bossCooldown - now);
  const bossRemainingSec = Math.ceil(bossRemainingMs / 1000);
  const isBossReady = bossRemainingMs <= 0;

  // Helper for Damage Display
  const getBonusDamage = (unit: UnitConfig) => {
      if (!unit) return 0;
      const baseDmg = unit.damage;
      const level = gameState.upgradeLevels[unit.rarity] || 0;
      const totalDmg = Math.floor(baseDmg * (1 + (level * 0.2)));
      return totalDmg - baseDmg;
  };

  const getTotalDamage = (unit: UnitConfig) => {
      if (!unit) return 0;
      return Math.floor(unit.damage * (1 + (gameState.upgradeLevels[unit.rarity] * 0.2)));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      
      {/* Header Stats */}
      <div className="w-full max-w-5xl bg-neutral-900 rounded-xl p-4 mb-4 shadow-2xl border border-neutral-800 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2 text-yellow-400 min-w-[80px]">
             <Coins size={24} />
             <span className="text-2xl font-bold">{gameState.gold}</span>
          </div>
           <div className="flex items-center gap-2 text-indigo-400 min-w-[80px]">
             <Ticket size={24} />
             <span className="text-2xl font-bold">{gameState.tokens}</span>
          </div>
          <div className={`flex items-center gap-2 min-w-[100px] ${enemyCount > 80 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
             <Users size={24} fill="currentColor" />
             <span className="text-2xl font-bold">{enemyCount} / {MAX_ENEMIES}</span>
          </div>
          <div className="flex flex-col min-w-[100px]">
              <div className="flex items-center gap-2 text-blue-400">
                <Skull size={20} />
                <span className="text-xl font-bold">WAVE {gameState.wave}</span>
              </div>
          </div>
          <div className="flex items-center gap-2 text-orange-400 min-w-[100px]">
              <Clock size={20} />
              <span className="text-2xl font-bold">{remainingSec}s</span>
          </div>
        </div>

        <div className="flex gap-2">
            <button 
               onClick={toggleSpeed}
               className={`px-4 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors ${gameState.gameSpeed > 2 ? 'bg-purple-600 text-white' : gameState.gameSpeed === 2 ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-gray-300'}`}
            >
               <FastForward size={16} /> {gameState.gameSpeed}x
            </button>
            {!gameState.isPlaying && !gameState.isGameOver ? (
                <button 
                  onClick={() => togglePlay(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-900/50"
                >
                  <Play size={20} /> 시작
                </button>
            ) : gameState.isGameOver ? (
                <button 
                  onClick={restartGame}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 animate-pulse shadow-lg shadow-red-900/50"
                >
                  <RefreshCcw size={20} /> 재시작
                </button>
            ) : (
                <button 
                   onClick={() => togglePlay(false)}
                   className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                   <Pause size={20} /> 일시정지
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-5xl items-start">
        {/* Main Game Area Column */}
        <div className="flex-1 w-full flex flex-col gap-4">
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-neutral-800 aspect-[5/3]">
                <PhaserGame />
                
                {gameState.isGameOver && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm pointer-events-none">
                        <h2 className="text-5xl font-black text-red-600 mb-4 tracking-tighter">GAME OVER</h2>
                        <p className="text-xl text-white mb-8">Wave {gameState.wave} Reached</p>
                    </div>
                )}
            </div>

            {/* Info Panel (Bottom Fixed) */}
            <div className="w-full bg-neutral-900 rounded-xl border border-neutral-800 p-4 min-h-40 flex items-center gap-6 shadow-xl relative overflow-hidden transition-all flex-wrap sm:flex-nowrap">
                {selectedUnit ? (
                    <>
                        <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-lg flex items-center justify-center text-4xl sm:text-6xl bg-neutral-800 border-2 shrink-0 ${
                             selectedUnit.rarity === Rarity.LEGENDARY ? 'border-yellow-500 shadow-yellow-500/20 shadow-lg' : 
                             selectedUnit.rarity === Rarity.MYTHIC ? 'border-purple-500 shadow-purple-500/20 shadow-lg' : 'border-neutral-600'
                        }`}>
                            {selectedUnit.visual}
                        </div>
                        <div className="flex-1 h-full flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-3">
                                <h3 className={`font-bold text-xl sm:text-2xl ${
                                    selectedUnit.rarity === Rarity.LEGENDARY ? 'text-yellow-400' :
                                    selectedUnit.rarity === Rarity.MYTHIC ? 'text-purple-400' :
                                    selectedUnit.rarity === Rarity.EPIC ? 'text-purple-300' :
                                    selectedUnit.rarity === Rarity.RARE ? 'text-blue-300' : 'text-gray-300'
                                }`}>{selectedUnit.name}</h3>
                                <span className="text-[10px] sm:text-xs text-gray-400 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 font-mono uppercase">
                                    {selectedUnit.rarity}
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs sm:text-sm italic line-clamp-2">"{selectedUnit.description}"</p>
                            <div className="flex flex-wrap gap-2 sm:gap-6 text-xs sm:text-sm mt-1">
                                <div className="flex gap-1 items-center text-gray-300">
                                    <span className="text-gray-500">DMG</span> 
                                    <span className="font-bold text-white">
                                        {getTotalDamage(selectedUnit)}
                                        {getBonusDamage(selectedUnit) > 0 && 
                                          <span className="text-green-500 text-xs ml-1">(+{getBonusDamage(selectedUnit)})</span>
                                        }
                                    </span>
                                </div>
                                <div className="flex gap-1 items-center text-gray-300">
                                    <span className="text-gray-500">SPD</span>
                                    <span className="font-bold text-white">{(30 / selectedUnit.attackSpeed).toFixed(1)}/s</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Buttons for Selected Unit */}
                        <div className="flex flex-col gap-2 shrink-0">
                             {/* Evolution Button (If applicable) */}
                             {evolutionOption ? (
                                <button 
                                    onClick={handleEvolve}
                                    className="px-4 py-2 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-lg flex flex-col items-center justify-center border-2 border-purple-400 shadow-lg shadow-purple-900/50 hover:brightness-110 active:scale-95 transition-all animate-pulse"
                                >
                                    <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-1"><Sparkles size={14} className="text-yellow-300" /> 신화 조합</span>
                                </button>
                             ) : (
                                 // Exchange Button (Uses Gold now)
                                 <button
                                    onClick={handleExchange}
                                    disabled={gameState.gold < EXCHANGE_PRICES[selectedUnit.rarity]}
                                    className="px-4 py-2 bg-neutral-800 rounded-lg border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-between gap-2"
                                 >
                                    <div className="flex items-center gap-1 text-xs text-indigo-300 font-bold">
                                        <RefreshCw size={14} /> 교환
                                    </div>
                                    <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">{EXCHANGE_PRICES[selectedUnit.rarity]} G</span>
                                 </button>
                             )}

                             {/* Sell Button */}
                             <button
                                onClick={handleSell}
                                className="px-4 py-2 bg-red-900/30 rounded-lg border border-red-800/50 hover:bg-red-900/50 active:scale-95 transition-all flex items-center justify-between gap-2"
                             >
                                <div className="flex items-center gap-1 text-xs text-red-300 font-bold">
                                    <Trash2 size={14} /> 판매
                                </div>
                                <span className="text-xs font-bold text-yellow-500">+{SELL_PRICES[selectedUnit.rarity]} G</span>
                             </button>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                        <Info size={32} />
                        <p>유닛을 선택하여 정보를 확인하세요</p>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3 shadow-xl">
             <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
               <Zap size={18} className="text-yellow-400"/> 소환 & 도박
             </h3>
             <div className="grid grid-cols-2 gap-2">
               {/* Enhanced Summon Button */}
               <button 
                 onClick={() => summonUnit()} 
                 className="col-span-2 relative group bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-xl border border-blue-400/30 shadow-[0_6px_0_#1e3a8a] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-between px-6 overflow-hidden mb-2"
               >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
                  
                  <div className="flex flex-col items-start relative z-10">
                      <span className="text-[10px] font-bold text-blue-200 tracking-widest uppercase mb-0.5">Basic Summon</span>
                      <span className="text-xl font-black text-white drop-shadow-md flex items-center gap-2">
                          일반 소환
                      </span>
                  </div>
                  <div className="relative z-10 bg-black/40 px-3 py-1 rounded-lg border border-white/10 flex flex-col items-end">
                      <span className="text-yellow-300 font-black text-xl">{gameState.summonCost} G</span>
                  </div>
               </button>

               <button 
                 onClick={gambleToken}
                 disabled={gameState.tokens < TOKEN_COST}
                 className="col-span-2 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 p-3 rounded-lg border border-purple-500/30 flex items-center justify-between px-6 hover:brightness-125 active:scale-95 transition-all disabled:opacity-50 group"
               >
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <Ticket size={16} className="text-purple-200 group-hover:rotate-12 transition-transform"/>
                      <span className="font-bold text-white">고급 도박</span>
                    </div>
                    <span className="text-[10px] text-purple-300">성공 50% / 실패 50%</span>
                  </div>
                  <div className="text-xl font-black text-white">{TOKEN_COST} 🎫</div>
               </button>
             </div>

             <button 
                 onClick={autoMerge}
                 className="w-full mt-2 bg-blue-900/50 p-2 rounded-lg border border-blue-700 hover:bg-blue-800 active:scale-95 transition-all flex items-center justify-center gap-2 group"
             >
                <Combine size={18} className="text-blue-300 group-hover:rotate-180 transition-transform duration-500"/>
                <span className="font-bold text-sm text-blue-200">같은 유닛 전체 합치기</span>
             </button>
             
             {/* Challenge Boss Button */}
             <button
                onClick={handleChallengeBoss}
                disabled={!isBossReady || !gameState.isPlaying || gameState.isGameOver}
                className="w-full mt-2 bg-red-950 p-3 rounded-lg border border-red-800 flex items-center justify-between gap-2 hover:bg-red-900 active:scale-95 transition-all group disabled:opacity-50 disabled:grayscale"
             >
                <div className="flex items-center gap-2">
                    <Swords size={20} className={`text-red-500 ${isBossReady ? 'group-hover:animate-bounce' : ''}`}/>
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-sm text-red-200">티켓 보스 도전</span>
                        <span className="text-[10px] text-red-400">Lv.{bossLevel} (보상: 1🎫)</span>
                    </div>
                </div>
                {!isBossReady && (
                     <div className="text-red-400 font-mono text-sm">{bossRemainingSec}s</div>
                )}
             </button>

             <button
                onClick={openEncyclopedia}
                className="w-full mt-1 bg-neutral-800 p-2 rounded-lg border border-neutral-700 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
             >
                <Library size={16} className="text-gray-400"/>
                <span className="font-bold text-sm text-gray-400">유닛 도감 & 조합법</span>
             </button>
          </div>

          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3 shadow-xl">
             <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
               <Hammer size={18} className="text-blue-400"/> 강화 ({Object.values(gameState.upgradeLevels).reduce((a: number, b: number)=>a+b,0)}Lv)
             </h3>
             <div className="flex flex-col gap-2">
                {[Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC].map((rarity) => (
                  <button 
                    key={rarity}
                    onClick={() => upgradeUnit(rarity)}
                    disabled={gameState.gold < UPGRADE_COSTS[rarity]}
                    className="flex justify-between items-center bg-neutral-950 p-2 rounded border border-neutral-800 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                  >
                     <div className="flex flex-col items-start gap-1">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${rarity === Rarity.COMMON ? 'bg-gray-400' : rarity === Rarity.RARE ? 'bg-blue-400' : rarity === Rarity.EPIC ? 'bg-purple-400' : rarity === Rarity.LEGENDARY ? 'bg-yellow-400' : 'bg-pink-500'}`}></div>
                         <span className="text-xs text-gray-300">{rarity} Lv.{gameState.upgradeLevels[rarity]}</span>
                       </div>
                       {gameState.upgradeLevels[rarity] > 0 && <span className="text-[10px] text-green-500 font-bold ml-4">+{Math.floor(20 * gameState.upgradeLevels[rarity])}% DMG</span>}
                     </div>
                     <span className="text-xs font-bold text-yellow-500">{UPGRADE_COSTS[rarity]} G</span>
                  </button>
                ))}
             </div>
          </div>

          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex flex-col shadow-xl flex-1">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-lg font-bold text-neutral-300 flex items-center gap-2">
                 <Bot size={18} className="text-green-400"/> AI 운빨 분석
               </h3>
               <button 
                 onClick={handleAiAnalysis}
                 disabled={isAiLoading}
                 className="text-xs bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded-full transition-colors disabled:opacity-50 border border-neutral-700"
               >
                 {isAiLoading ? '...' : '새로고침'}
               </button>
             </div>
             
             <div className="flex-1 bg-neutral-950 rounded-lg p-3 flex items-center justify-center text-center border border-neutral-800 relative overflow-hidden min-h-[100px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
                {isAiLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
                ) : (
                  <p className="text-neutral-300 text-xs leading-relaxed whitespace-pre-line">
                    "{aiComment}"
                  </p>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Encyclopedia Modal (Read-Only) */}
      {isEncyclopediaOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-neutral-900 w-full max-w-5xl max-h-[85vh] rounded-2xl border border-neutral-700 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
                      <h2 className="text-xl font-bold flex items-center gap-2"><Library className="text-purple-500"/> 유닛 도감 & 조합법 (Read Only)</h2>
                      <button onClick={() => setIsEncyclopediaOpen(false)} className="hover:bg-neutral-800 p-2 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {[Rarity.MYTHIC, Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON].map(rarity => (
                          <div key={rarity}>
                              <h3 className={`text-sm font-bold mb-3 border-b border-neutral-800 pb-1 ${
                                  rarity === Rarity.MYTHIC ? 'text-purple-400' : 
                                  rarity === Rarity.LEGENDARY ? 'text-yellow-400' : 'text-gray-400'
                              }`}>{rarity}</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                  {UNIT_TYPES[rarity].map((unit, idx) => (
                                      <div 
                                          key={idx}
                                          className="flex flex-col items-center bg-neutral-950/50 border border-neutral-800 p-3 rounded-lg transition-all group relative cursor-default"
                                      >
                                          <div className="text-4xl mb-2">{unit.visual}</div>
                                          <div className="font-bold text-sm text-gray-300">{unit.name}</div>
                                          
                                          {/* Recipe Display for Mythic */}
                                          {rarity === Rarity.MYTHIC && unit.recipe && (
                                              <div className="mt-3 flex items-center gap-1 bg-neutral-900 p-1 rounded-full border border-neutral-800">
                                                  {unit.recipe.map((reqName, rIdx) => (
                                                      <div key={rIdx} className="text-xs" title={reqName}>
                                                          {getUnitVisual(reqName)}
                                                      </div>
                                                  ))}
                                              </div>
                                          )}
                                          
                                          <div className="text-[10px] text-gray-600 mt-2">ATK {unit.damage}</div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Cheat HUD */}
      {isCheatOpen && (
          <div className="fixed top-4 left-4 z-[200] bg-black/90 backdrop-blur-md rounded-xl border border-neutral-700 p-4 shadow-2xl w-64 animate-in slide-in-from-left duration-300">
              <div className="flex justify-between items-center mb-4 border-b border-neutral-700 pb-2">
                  <h3 className="font-bold text-yellow-400 flex items-center gap-2"><Settings size={16}/> CHEAT HUD</h3>
                  <button onClick={() => setIsCheatOpen(false)} className="text-gray-400 hover:text-white"><X size={16}/></button>
              </div>

              <div className="space-y-4">
                  <div>
                      <label className="text-xs text-gray-400 block mb-2">Game Speed (Current: {gameState.gameSpeed}x)</label>
                      <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 5, 10].map(speed => (
                              <button 
                                key={speed}
                                onClick={() => setGameSpeed(speed)}
                                className={`text-xs p-1 rounded ${gameState.gameSpeed === speed ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'}`}
                              >
                                {speed}x
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="text-xs text-gray-400 block mb-2">Add Resources</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => addCheatResource('gold', 1000)}
                            className="text-xs bg-neutral-800 border border-neutral-700 p-2 rounded hover:bg-neutral-700 text-yellow-500 font-bold"
                          >
                            +1000 G
                          </button>
                           <button 
                            onClick={() => addCheatResource('gold', 10000)}
                            className="text-xs bg-neutral-800 border border-neutral-700 p-2 rounded hover:bg-neutral-700 text-yellow-400 font-bold"
                          >
                            +10k G
                          </button>
                           <button 
                            onClick={() => addCheatResource('token', 5)}
                            className="text-xs bg-neutral-800 border border-neutral-700 p-2 rounded hover:bg-neutral-700 text-indigo-400 font-bold"
                          >
                            +5 🎫
                          </button>
                           <button 
                            onClick={() => addCheatResource('token', 100)}
                            className="text-xs bg-neutral-800 border border-neutral-700 p-2 rounded hover:bg-neutral-700 text-indigo-300 font-bold"
                          >
                            +100 🎫
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;