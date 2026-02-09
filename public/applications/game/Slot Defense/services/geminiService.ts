import { GoogleGenAI } from "@google/genai";
import { Tower, Rarity, GameState } from '../types';
import { MAX_ENEMIES } from '../constants';

const apiKey = process.env.API_KEY;
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getGameCommentary = async (
  towers: Tower[],
  gameState: GameState,
  enemyCount: number
): Promise<string> => {
  if (!aiClient) {
    return "AI 해설 비활성화 상태입니다.";
  }

  const towerCounts = towers.reduce((acc, t) => {
    acc[t.type.rarity] = (acc[t.type.rarity] || 0) + 1;
    return acc;
  }, {} as Record<Rarity, number>);

  const prompt = `
    당신은 "운빨 디펜스" 게임의 시니컬하고 재미있는 한국인 해설자입니다.
    현재 플레이어의 상황을 보고 짧고 굵은 한마디(반말 모드)를 해주세요.
    
    [게임 상황]
    - 현재 웨이브: ${gameState.wave}
    - 현재 적 수: ${enemyCount} / ${MAX_ENEMIES} (가득 차면 패배)
    - 보유 골드: ${gameState.gold}
    
    [보유 유닛]
    - 전설(1% 확률): ${towerCounts[Rarity.LEGENDARY] || 0}마리
    - 에픽(9% 확률): ${towerCounts[Rarity.EPIC] || 0}마리
    - 희귀(30% 확률): ${towerCounts[Rarity.RARE] || 0}마리
    - 일반(60% 확률): ${towerCounts[Rarity.COMMON] || 0}마리

    [요청 사항]
    1. 전설 유닛이 많으면 "오늘 로또 사야겠는데?" 같이 과하게 칭찬하세요.
    2. 전설이 없고 일반만 많으면 "운이 없어도 실력으로... 안되나?" 처럼 놀리세요.
    3. 적이 많이 쌓여있다면 위급함을 알리세요.
    4. 100자 이내로 짧게 답변하세요.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "해설을 생성하지 못했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI가 현재 휴식 중입니다...";
  }
};
