import { Rarity, UnitConfig, AttackType } from './types';

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 6;
export const TILE_SIZE = 60;
export const BASE_FPS = 30;
export const MAX_ENEMIES = 100; // Game Over limit
export const WAVE_DURATION_SEC = 40; // 40 seconds per wave

// Costs & Rates
export const SUMMON_COST = 50;
export const SUMMON_COST_INCREASE = 10;
export const TOKEN_COST = 1; // Gamble Cost

export const TICKET_DROP_RATE = 0.0005; // 0.05% Chance from normal mobs
export const CHALLENGE_BOSS_COOLDOWN_MS = 60000; // 1 Minute

export const SELL_PRICES: Record<Rarity, number> = {
  [Rarity.COMMON]: 30,
  [Rarity.RARE]: 80,
  [Rarity.EPIC]: 300,
  [Rarity.LEGENDARY]: 1000,
  [Rarity.MYTHIC]: 5000,
};

export const EXCHANGE_PRICES: Record<Rarity, number> = {
  [Rarity.COMMON]: 50,
  [Rarity.RARE]: 150,
  [Rarity.EPIC]: 500,
  [Rarity.LEGENDARY]: 2000,
  [Rarity.MYTHIC]: 10000, // Very expensive
};

export const UPGRADE_COSTS: Record<Rarity, number> = {
  [Rarity.COMMON]: 100,
  [Rarity.RARE]: 200,
  [Rarity.EPIC]: 400,
  [Rarity.LEGENDARY]: 1000,
  [Rarity.MYTHIC]: 2000,
};

// Map Path: Rectangular Loop
// (1,1) -> (8,1) -> (8,4) -> (1,4) -> (1,1)
export const PATH_COORDINATES: { x: number; y: number }[] = [
  // Top edge: Left to Right
  { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 }, { x: 8, y: 1 },
  // Right edge: Down
  { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 },
  // Bottom edge: Right to Left
  { x: 7, y: 4 }, { x: 6, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }, { x: 1, y: 4 },
  // Left edge: Up (Closing the loop back to 1,1)
  { x: 1, y: 3 }, { x: 1, y: 2 }
];

export const isPathCell = (x: number, y: number): boolean => {
  return PATH_COORDINATES.some(coord => coord.x === x && coord.y === y);
};

export const UNIT_TYPES: Record<Rarity, UnitConfig[]> = {
  [Rarity.COMMON]: [
    {
      name: '훈련병 삐약이',
      visual: '🐤',
      range: 2.5,
      damage: 8,
      attackSpeed: 20,
      color: 'bg-stone-500',
      rarity: Rarity.COMMON,
      attackType: 'SINGLE',
      description: '기본적인 훈련병입니다. 귀엽습니다.'
    },
    {
      name: '돌맹이 투척병',
      visual: '🪨',
      range: 2.0,
      damage: 12,
      attackSpeed: 25,
      color: 'bg-stone-600',
      rarity: Rarity.COMMON,
      attackType: 'SINGLE',
      description: '돌을 던져 적을 공격합니다.'
    },
    {
      name: '견습 궁수',
      visual: '🏹',
      range: 3.5,
      damage: 10,
      attackSpeed: 18,
      color: 'bg-emerald-600',
      rarity: Rarity.COMMON,
      attackType: 'SINGLE',
      description: '사거리가 조금 긴 궁수입니다.'
    },
    {
      name: '창병',
      visual: '🔱',
      range: 1.8,
      damage: 15,
      attackSpeed: 22,
      color: 'bg-slate-500',
      rarity: Rarity.COMMON,
      attackType: 'SINGLE',
      description: '사거리는 짧지만 찌르기가 강력합니다.'
    }
  ],
  [Rarity.RARE]: [
    {
      name: '화염 마법사',
      visual: '🔥',
      range: 3.5,
      damage: 25,
      attackSpeed: 25,
      color: 'bg-rose-600',
      rarity: Rarity.RARE,
      attackType: 'SPLASH',
      splashRadius: 1.5,
      description: '작은 범위에 화염 피해를 입힙니다.'
    },
    {
      name: '빙결사',
      visual: '❄️',
      range: 3.0,
      damage: 15,
      attackSpeed: 20,
      color: 'bg-cyan-500',
      rarity: Rarity.RARE,
      attackType: 'SINGLE',
      effect: 'slow',
      description: '적을 0.1초 얼립니다.'
    },
    {
      name: '저격수',
      visual: '🔭',
      range: 6.0,
      damage: 80,
      attackSpeed: 50,
      color: 'bg-teal-700',
      rarity: Rarity.RARE,
      attackType: 'SINGLE',
      description: '매우 긴 사거리와 강력한 한 방을 가집니다.'
    },
    {
      name: '대포',
      visual: '💣',
      range: 4.0,
      damage: 40,
      attackSpeed: 40,
      color: 'bg-gray-800',
      rarity: Rarity.RARE,
      attackType: 'SPLASH',
      splashRadius: 2.0,
      description: '폭발적인 광역 피해를 입힙니다.'
    },
    {
      name: '맹독 사냥꾼',
      visual: '🐍',
      range: 3.0,
      damage: 35,
      attackSpeed: 18,
      color: 'bg-lime-600',
      rarity: Rarity.RARE,
      attackType: 'SINGLE',
      description: '치명적인 독(강력한 피해)으로 적을 공격합니다.'
    },
    {
      name: '투석기',
      visual: '🪵',
      range: 5.0,
      damage: 60,
      attackSpeed: 50,
      color: 'bg-amber-800',
      rarity: Rarity.RARE,
      attackType: 'SPLASH',
      splashRadius: 2.2,
      description: '멀리서 큰 돌을 날려 광역 피해를 줍니다.'
    },
    {
      name: '정예 검사',
      visual: '⚔️',
      range: 1.5,
      damage: 55,
      attackSpeed: 15,
      color: 'bg-slate-400',
      rarity: Rarity.RARE,
      attackType: 'INSTANT',
      description: '빠른 검술로 근접 적을 제압합니다.'
    },
    {
      name: '부메랑 헌터',
      visual: '🪃',
      range: 3.5,
      damage: 28,
      attackSpeed: 22,
      color: 'bg-orange-400',
      rarity: Rarity.RARE,
      attackType: 'SPLASH',
      splashRadius: 1.5,
      description: '튕기는 부메랑을 던집니다.'
    }
  ],
  [Rarity.EPIC]: [
    {
      name: '닌자',
      visual: '🥷',
      range: 2.0,
      damage: 80,
      attackSpeed: 8, 
      color: 'bg-violet-700',
      rarity: Rarity.EPIC,
      attackType: 'INSTANT',
      description: '보이지 않는 속도로 적을 베어버립니다.'
    },
    {
      name: '헤비 메카',
      visual: '🤖',
      range: 4.0,
      damage: 120,
      attackSpeed: 35,
      color: 'bg-fuchsia-600',
      rarity: Rarity.EPIC,
      attackType: 'SINGLE',
      effect: 'stun',
      description: '강력한 미사일로 적을 0.1초 기절시킵니다.'
    },
    {
      name: '버서커',
      visual: '🩸',
      range: 1.5,
      damage: 200,
      attackSpeed: 15,
      color: 'bg-red-700',
      rarity: Rarity.EPIC,
      attackType: 'SINGLE',
      description: '근접해서 무자비하게 공격합니다.'
    },
    {
      name: '암흑 사제',
      visual: '🔮',
      range: 4.5,
      damage: 90,
      attackSpeed: 20,
      color: 'bg-purple-900',
      rarity: Rarity.EPIC,
      attackType: 'SPLASH',
      splashRadius: 1.8,
      description: '어둠의 힘으로 지속적인 피해를 줍니다.'
    },
    {
      name: '레이저 탱크',
      visual: '🚨',
      range: 5.0,
      damage: 150,
      attackSpeed: 40,
      color: 'bg-red-500',
      rarity: Rarity.EPIC,
      attackType: 'INSTANT',
      description: '강력한 레이저 빔을 즉시 발사합니다.'
    },
    {
      name: '스톰 콜러',
      visual: '⛈️',
      range: 4.5,
      damage: 100,
      attackSpeed: 25,
      color: 'bg-sky-700',
      rarity: Rarity.EPIC,
      attackType: 'SPLASH',
      splashRadius: 2.2,
      effect: 'stun',
      description: '폭풍을 불러 적들을 감전(스턴)시킵니다.'
    },
    {
      name: '공허의 눈',
      visual: '👁️',
      range: 7.0,
      damage: 180,
      attackSpeed: 35,
      color: 'bg-indigo-900',
      rarity: Rarity.EPIC,
      attackType: 'SINGLE',
      description: '초장거리에서 적을 응시하여 큰 피해를 줍니다.'
    },
    {
      name: '마그마 골렘',
      visual: '🌋',
      range: 3.0,
      damage: 220,
      attackSpeed: 45,
      color: 'bg-orange-800',
      rarity: Rarity.EPIC,
      attackType: 'SPLASH',
      splashRadius: 3.0,
      description: '주변을 용암으로 뒤덮어 강력한 광역 피해를 줍니다.'
    }
  ],
  [Rarity.LEGENDARY]: [
    {
      name: '드래곤 로드',
      visual: '🐲',
      range: 4.5,
      damage: 300,
      attackSpeed: 20,
      color: 'bg-yellow-500',
      rarity: Rarity.LEGENDARY,
      attackType: 'SPLASH',
      splashRadius: 2.5,
      description: '넓은 범위에 강력한 화염 브레스를 뿜습니다. [조합재료]'
    },
    {
      name: '대천사',
      visual: '👼',
      range: 5.0,
      damage: 400,
      attackSpeed: 15,
      color: 'bg-amber-400',
      rarity: Rarity.LEGENDARY,
      attackType: 'SINGLE',
      description: '신의 징벌을 내립니다. 공속이 빠릅니다. [조합재료]'
    },
    {
      name: '마신',
      visual: '👹',
      range: 3.5,
      damage: 450,
      attackSpeed: 25,
      color: 'bg-red-800',
      rarity: Rarity.LEGENDARY,
      attackType: 'SPLASH',
      splashRadius: 2.0,
      effect: 'slow',
      description: '지옥의 불길로 적을 태우고 얼립니다. [조합재료]'
    },
    {
      name: '포세이돈',
      visual: '🔱',
      range: 4.0,
      damage: 350,
      attackSpeed: 22,
      color: 'bg-blue-600',
      rarity: Rarity.LEGENDARY,
      attackType: 'SPLASH',
      splashRadius: 2.0,
      effect: 'slow',
      description: '바다의 힘으로 광역 슬로우를 겁니다. [조합재료]'
    },
    {
      name: '워로드',
      visual: '⚔️',
      range: 2.5,
      damage: 800,
      attackSpeed: 30,
      color: 'bg-orange-700',
      rarity: Rarity.LEGENDARY,
      attackType: 'INSTANT',
      description: '압도적인 무력으로 적을 분쇄합니다. [조합재료]'
    },
    {
      name: '제우스',
      visual: '⚡',
      range: 5.5,
      damage: 380,
      attackSpeed: 18,
      color: 'bg-yellow-300',
      rarity: Rarity.LEGENDARY,
      attackType: 'SPLASH',
      splashRadius: 2.5,
      effect: 'stun',
      description: '번개를 내려 적들을 감전(스턴)시킵니다. [조합재료]'
    },
    {
      name: '피닉스',
      visual: '🦅',
      range: 5.0,
      damage: 320,
      attackSpeed: 12,
      color: 'bg-orange-500',
      rarity: Rarity.LEGENDARY,
      attackType: 'SPLASH',
      splashRadius: 2.0,
      description: '엄청난 속도로 불꽃을 난사합니다.'
    },
    {
      name: '팔라딘',
      visual: '🛡️',
      range: 2.0,
      damage: 1200,
      attackSpeed: 40,
      color: 'bg-indigo-300',
      rarity: Rarity.LEGENDARY,
      attackType: 'INSTANT',
      description: '성스러운 일격으로 적 하나를 소멸시킵니다.'
    }
  ],
  [Rarity.MYTHIC]: [
    {
      name: '운빨의 신',
      visual: '👑',
      range: 6.0,
      damage: 2000,
      attackSpeed: 10,
      color: 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      splashRadius: 3.5,
      description: '전설 3종 융합체. 전장을 지배합니다.',
      recipe: ['드래곤 로드', '대천사', '마신']
    },
    {
      name: '타이탄',
      visual: '🗿',
      range: 5.0,
      damage: 2500,
      attackSpeed: 25,
      color: 'bg-gradient-to-br from-stone-500 via-blue-800 to-gray-900',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      splashRadius: 4.0,
      effect: 'stun',
      description: '거대한 힘으로 적을 기절시킵니다.',
      recipe: ['포세이돈', '워로드', '제우스']
    },
    {
      name: '헬파이어 드래곤',
      visual: '🌋',
      range: 5.5,
      damage: 2800,
      attackSpeed: 20,
      color: 'bg-red-900',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      splashRadius: 3.0,
      description: '지옥불로 모든 것을 태워버립니다.',
      recipe: ['드래곤 로드', '마신', '피닉스']
    },
    {
      name: '세라핌',
      visual: '✨',
      range: 6.5,
      damage: 3000,
      attackSpeed: 15,
      color: 'bg-yellow-200',
      rarity: Rarity.MYTHIC,
      attackType: 'SINGLE',
      description: '가장 고귀한 천사. 빛의 속도로 공격합니다.',
      recipe: ['대천사', '팔라딘', '제우스']
    },
    {
      name: '드래곤 슬레이어',
      visual: '🗡️',
      range: 3.0,
      damage: 5000,
      attackSpeed: 30,
      color: 'bg-slate-800',
      rarity: Rarity.MYTHIC,
      attackType: 'INSTANT',
      description: '용을 잡는 영웅. 단일 대상에게 치명적입니다.',
      recipe: ['워로드', '팔라딘', '드래곤 로드']
    },
    {
      name: '엘리멘탈 로드',
      visual: '🌀',
      range: 5.0,
      damage: 2200,
      attackSpeed: 18,
      color: 'bg-indigo-500',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      effect: 'slow',
      splashRadius: 4.0,
      description: '원소의 힘으로 적들을 느리게 만듭니다.',
      recipe: ['포세이돈', '피닉스', '대천사']
    },
    {
      name: '카오스 엠페러',
      visual: '🌌',
      range: 4.0,
      damage: 3500,
      attackSpeed: 22,
      color: 'bg-purple-900',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      effect: 'stun',
      splashRadius: 3.0,
      description: '혼돈의 힘으로 적을 파괴하고 기절시킵니다.',
      recipe: ['마신', '워로드', '제우스']
    },
    {
      name: '뇌신 토르',
      visual: '🔨',
      range: 5.0,
      damage: 2700,
      attackSpeed: 20,
      color: 'bg-blue-400',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      effect: 'stun',
      splashRadius: 3.5,
      description: '묠니르로 강력한 번개를 내리꽂습니다.',
      recipe: ['제우스', '워로드', '포세이돈']
    },
    {
      name: '심판자',
      visual: '⚖️',
      range: 7.0,
      damage: 1800,
      attackSpeed: 8,
      color: 'bg-gray-200',
      rarity: Rarity.MYTHIC,
      attackType: 'INSTANT',
      description: '먼 거리에서 적을 즉결 심판합니다.',
      recipe: ['대천사', '팔라딘', '워로드']
    },
    {
      name: '아크메이지',
      visual: '🧙‍♂️',
      range: 5.5,
      damage: 2400,
      attackSpeed: 18,
      color: 'bg-violet-500',
      rarity: Rarity.MYTHIC,
      attackType: 'SPLASH',
      splashRadius: 3.0,
      description: '궁극의 마법을 구사합니다.',
      recipe: ['마신', '드래곤 로드', '제우스']
    }
  ]
};

// Fix logic for recipe uniqueness in Archmage/Judge
UNIT_TYPES[Rarity.MYTHIC][8].recipe = ['대천사', '팔라딘', '워로드'];

export const PROBABILITIES = {
  [Rarity.COMMON]: 0.85,
  [Rarity.RARE]: 0.12,
  [Rarity.EPIC]: 0.025,
  [Rarity.LEGENDARY]: 0.005,
  [Rarity.MYTHIC]: 0,
};