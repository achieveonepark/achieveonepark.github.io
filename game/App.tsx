import React, { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { BoonSelector } from './components/BoonSelector';
import { NarrativeView } from './components/NarrativeView';
import { RoomSelector } from './components/RoomSelector';
import { GameState, COLORS } from './constants';
import { generateNarrative } from './services/geminiService';
import { Skull, Play, Shield, Trophy, Loader2, ArrowLeft } from 'lucide-react';
import { NarrativeBlock, RoomOption, RunState, BoonMechanic } from './types';

// Extended Game State to support new Text-Based phases
enum ExtendedGameState {
    MENU = 'MENU',
    NARRATIVE = 'NARRATIVE',
    ROOM_SELECT = 'ROOM_SELECT',
    PLAYING = 'PLAYING',
    BOON_SELECT = 'BOON_SELECT',
    GAME_OVER = 'GAME_OVER',
    LOADING = 'LOADING' // New state for transitions
}

export default function App() {
  const [gameState, setGameState] = useState<ExtendedGameState>(ExtendedGameState.MENU);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = '../../index.html';
  };
  
  // Run State
  const [runState, setRunState] = useState<RunState>({
      depth: 0,
      hp: 100,
      maxHp: 100,
      boons: [],
      kills: 0
  });

  // Transient Data for Pagers
  const [currentNarrative, setCurrentNarrative] = useState<NarrativeBlock | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomOption | null>(null);

  // --- State Transitions ---

  const startGame = async () => {
    // 0. Set Loading immediately
    setGameState(ExtendedGameState.LOADING);

    // 1. Reset Run
    const initialState = { depth: 0, hp: 100, maxHp: 100, boons: [], kills: 0 };
    setRunState(initialState);
    
    // 2. Generate Intro Text
    const intro = await generateNarrative(initialState, 'intro');
    setCurrentNarrative(intro);
    setGameState(ExtendedGameState.NARRATIVE);
  };

  const handleNarrativeComplete = () => {
    // After text, usually go to Room Select or Action depending on context
    if (runState.hp <= 0) {
        setGameState(ExtendedGameState.MENU);
    } else if (runState.depth === 0) {
        setGameState(ExtendedGameState.ROOM_SELECT);
    } else {
        // If we just had a story event mid-run
        setGameState(ExtendedGameState.ROOM_SELECT);
    }
  };

  const handleRoomSelect = async (room: RoomOption) => {
    setSelectedRoom(room);
    // Skip loading text, go straight to play for snappiness
    setGameState(ExtendedGameState.PLAYING);
  };

  const handleGameOver = async () => {
    // Immediately stop the game loop by switching state
    setGameState(ExtendedGameState.LOADING);
    
    // Generate Death Text
    const deathText = await generateNarrative(runState, 'death');
    setCurrentNarrative(deathText);
    setRunState(prev => ({...prev, hp: 0})); // Ensure dead
    setGameState(ExtendedGameState.NARRATIVE); 
  };

  const handleRoomClear = (playerHp: number) => {
      // Room cleared, update depth AND sync HP from game
      const newDepth = runState.depth + 1;
      setRunState(prev => ({ ...prev, depth: newDepth, hp: playerHp }));
      
      // Determine Reward
      setGameState(ExtendedGameState.BOON_SELECT);
  };

  const handleBoonSelected = (mechanic: BoonMechanic, name: string) => {
    setRunState(prev => {
        let newHp = prev.hp;
        const newBoons = [...prev.boons];

        if (mechanic === 'heal') {
            newHp = Math.min(prev.maxHp, prev.hp + 30);
        } else {
            newBoons.push({
                id: Math.random().toString(),
                god: 'Zeus', // Placeholder, visualized in Selector
                name: name,
                description: mechanic,
                mechanic: mechanic,
                rarity: 'Common'
            });
        }
        
        return {
            ...prev,
            hp: newHp,
            boons: newBoons
        };
    });
    setGameState(ExtendedGameState.ROOM_SELECT);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-0 md:p-4 relative overflow-hidden font-sans">
        <button
            onClick={handleBack}
            className="absolute top-3 left-3 z-[60] inline-flex items-center gap-2 px-3 py-2 text-xs md:text-sm bg-slate-900/80 border border-slate-700 hover:border-sky-500 hover:bg-slate-800 text-slate-200 rounded-md backdrop-blur transition-colors"
            aria-label="뒤로 가기"
        >
            <ArrowLeft className="w-4 h-4" />
            <span>뒤로가기</span>
        </button>

        {/* Background Ambient Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="scanlines absolute inset-0 z-50 pointer-events-none" />

        {/* Main Pager Container */}
        <div className="w-full h-full md:max-w-4xl md:h-[700px] relative z-10 flex flex-col transition-all duration-500">
            
            {/* Header / Top Bar (KOREAN) - Hidden in game play on mobile to save space, shown otherwise */}
            <div className={`flex justify-between items-center px-4 py-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur md:rounded-t-lg ${gameState === ExtendedGameState.PLAYING ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex items-center gap-2">
                    <Skull className="text-red-500 w-6 h-6" />
                    <h1 className="text-xl md:text-2xl font-display font-bold text-slate-100 tracking-wider">PROJECT HADES</h1>
                </div>
                <div className="flex items-center gap-4 text-xs md:text-sm font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                         <span className="text-red-500 font-bold">HP {Math.ceil(runState.hp)}</span>
                    </div>
                    <span>깊이 {runState.depth}</span>
                </div>
            </div>

            {/* Viewport (The "Page") */}
            <div className="flex-1 relative bg-slate-900/80 backdrop-blur-md border-x border-b border-slate-800 md:rounded-b-lg shadow-2xl overflow-hidden flex flex-col">
                
                {/* 1. MENU (KOREAN) */}
                {gameState === ExtendedGameState.MENU && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in p-8 text-center bg-[url('https://images.unsplash.com/photo-1634988770288-667104d55301?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center bg-blend-multiply bg-slate-900">
                        <div className="space-y-2 backdrop-blur-sm p-8 rounded-xl border border-white/10">
                            <h2 className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 drop-shadow-lg">
                                NO ESCAPE
                            </h2>
                            <p className="text-slate-300 font-serif italic text-lg">
                                "죽은 자는 말이 없고, 무기만이 진실을 말한다."
                            </p>
                        </div>
                        
                        <button 
                            onClick={startGame}
                            className="group relative px-12 py-4 bg-red-900/80 border border-red-800 hover:bg-red-800 hover:border-red-500 transition-all duration-300 rounded-sm shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                        >
                            <span className="flex items-center gap-3 text-xl font-bold text-red-100 uppercase tracking-[0.2em] group-hover:scale-105 transition-transform">
                                <Play className="w-6 h-6 fill-current" /> 탈출 시작
                            </span>
                        </button>
                    </div>
                )}

                 {/* LOADING STATE (KOREAN) */}
                 {gameState === ExtendedGameState.LOADING && (
                    <div className="flex-1 flex flex-col items-center justify-center text-red-500 gap-4 bg-black/50">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <span className="font-display tracking-widest text-slate-400">지하 세계로 진입 중...</span>
                    </div>
                )}

                {/* 2. NARRATIVE (CONTENT: KOREAN) */}
                {gameState === ExtendedGameState.NARRATIVE && currentNarrative && (
                    <NarrativeView 
                        data={currentNarrative} 
                        onComplete={handleNarrativeComplete} 
                    />
                )}

                {/* 3. ROOM SELECTION (CONTENT: KOREAN) */}
                {gameState === ExtendedGameState.ROOM_SELECT && (
                    <RoomSelector 
                        depth={runState.depth} 
                        onSelect={handleRoomSelect} 
                    />
                )}

                {/* 4. ACTION (Canvas) */}
                {gameState === ExtendedGameState.PLAYING && (
                    <GameCanvas 
                        active={true} 
                        initialHp={runState.hp} // Pass current HP
                        boons={runState.boons}
                        depth={runState.depth}
                        onGameOver={handleGameOver}
                        onRoomClear={handleRoomClear}
                    />
                )}

                {/* 5. BOON SELECT (CONTENT: KOREAN) */}
                {gameState === ExtendedGameState.BOON_SELECT && (
                     <div className="flex-1 flex flex-col justify-center bg-slate-900/95 absolute inset-0 z-20 backdrop-blur-xl">
                        <BoonSelector onSelect={handleBoonSelected} />
                     </div>
                )}
            </div>
            
             {/* Footer Status (KOREAN) */}
             <div className="hidden md:flex mt-4 justify-between text-xs text-slate-600 font-mono uppercase">
                <span>시스템: 온라인</span>
                <span>시드: {Math.floor(Math.random() * 999999)}</span>
                <span>프로토콜: Hades-9</span>
            </div>
        </div>
    </div>
  );
}
