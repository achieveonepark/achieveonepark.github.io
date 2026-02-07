import { GodName } from '../constants';
import { RunState, RoomOption, NarrativeBlock, BoonMechanic } from '../types';

const NARRATIVE_SPEAKERS = ['해설자', '자그레우스', '하데스'] as const;

const ROOM_DESCRIPTIONS = {
  combat: ['핏빛 횃불이 흔들리는 전투의 회랑', '창백한 망령의 울음이 새어 나오는 전당', '깨진 석상이 널린 폐허의 원형실'],
  event: ['안개가 가득한 선택의 제단', '메마른 분수와 오래된 계약문이 남은 정원', '낡은 배를 닮은 스틱스의 쉼터'],
  shop: ['카론의 작은 상점, 금화 냄새가 진동한다', '황금 저울이 매달린 거래의 방', '등불만 켜진 조용한 교역소']
} as const;

const BOON_FLAVOR: Record<BoonMechanic, string> = {
  multishot: '화살이 세 갈래로 찢어지며 적을 꿰뚫습니다.',
  rapid: '숨결처럼 빠른 연격이 전장을 지배합니다.',
  homing: '의지를 가진 탄환이 적의 심장을 추적합니다.',
  orbital: '신성한 수호체가 주위를 돌며 위협을 밀어냅니다.',
  lightning: '정해진 박자마다 번개가 낙하해 적을 태웁니다.',
  heal: '올림포스의 축복이 상처를 봉합합니다.'
};

const withDelay = async <T>(value: T, ms = 80): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
};

const clampMood = (hp: number): NarrativeBlock['mood'] => {
  if (hp <= 25) return 'ominous';
  if (hp >= 75) return 'heroic';
  return 'neutral';
};

export const generateNarrative = async (
  context: RunState,
  situation: 'intro' | 'victory' | 'death' | 'enter_room'
): Promise<NarrativeBlock> => {
  const speaker = NARRATIVE_SPEAKERS[context.depth % NARRATIVE_SPEAKERS.length];

  const textBySituation: Record<typeof situation, string> = {
    intro: '지하 세계의 문이 열립니다. 첫걸음부터 피의 대가를 각오하세요.',
    victory: `깊이 ${context.depth}의 수호자를 넘어섰습니다. 아직 끝이 아닙니다.`,
    death: '스틱스의 강물은 다시 당신을 부릅니다. 죽음은 잠깐의 정지일 뿐입니다.',
    enter_room: '다음 문이 흔들립니다. 그 너머에는 새로운 시험이 기다립니다.'
  };

  return withDelay({
    speaker,
    text: textBySituation[situation],
    mood: situation === 'death' ? 'ominous' : clampMood(context.hp)
  });
};

export const generateRoomOptions = async (depth: number): Promise<RoomOption[]> => {
  const types: RoomOption['type'][] = ['combat', 'event', 'shop'];
  const firstType = types[depth % types.length];
  const secondType = types[(depth + 1) % types.length];

  const createOption = (id: string, type: RoomOption['type'], offset: number): RoomOption => {
    const descriptions = ROOM_DESCRIPTIONS[type];
    const description = descriptions[(depth + offset) % descriptions.length];

    if (type === 'combat') {
      return {
        id,
        type,
        description,
        rewardType: depth % 2 === 0 ? 'Boon' : 'Health',
        difficulty: depth > 6 ? 'Hard' : depth > 2 ? 'Medium' : 'Easy'
      };
    }

    if (type === 'shop') {
      return {
        id,
        type,
        description,
        rewardType: 'Wealth',
        difficulty: 'Easy'
      };
    }

    return {
      id,
      type,
      description,
      rewardType: 'Boon',
      difficulty: 'Medium'
    };
  };

  return withDelay([
    createOption(`room-${depth}-a`, firstType, 0),
    createOption(`room-${depth}-b`, secondType, 1)
  ]);
};

export const generateGodDialogue = async (god: GodName, playerHp: number): Promise<string> => {
  const tone = playerHp < 35 ? '버텨라. 네 고통이 곧 힘이 된다.' : '좋다. 그 기세를 내 제단까지 끌고 와라.';
  return withDelay(`${god}: ${tone}`);
};

export const generateBoonName = async (
  god: GodName,
  mechanic: BoonMechanic
): Promise<{ name: string; description: string }> => {
  const nameMap: Record<BoonMechanic, string> = {
    multishot: '삼중의 화살',
    rapid: '질주의 맥동',
    homing: '추적자의 눈',
    orbital: '회전의 방패',
    lightning: '낙뢰의 맹세',
    heal: '회복의 가호'
  };

  return withDelay({
    name: `${god}의 ${nameMap[mechanic]}`,
    description: BOON_FLAVOR[mechanic]
  });
};
