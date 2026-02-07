# Project Hades: Development Log

## 1. 개요
Project Hades는 텍스트 어드벤처와 탑다운 액션 로그라이크가 결합된 하이브리드 웹 게임입니다.
Google Gemini API를 활용하여 역동적인 내러티브와 상황에 맞는 대사를 생성하며, HTML5 Canvas를 통해 부드러운 액션을 구현했습니다.

## 2. 기술 스택
- **Frontend**: React 19, TypeScript, TailwindCSS
- **Rendering**: HTML5 Canvas (Action), DOM (UI/Text)
- **AI Integration**: @google/genai (Gemini 1.5/3.0 Models)
- **State Management**: React Hooks + Refs (Performance Optimization)

## 3. 핵심 기능 구현 현황

### 3.1. 게임 루프 & 엔진 (`useGameLoop.ts`)
- **무한 맵 시스템**: 캔버스 크기(`800x600`)보다 큰 월드(`2000x2000`)를 구현하고, 카메라가 플레이어를 추적하는 시스템 구축.
- **최적화**: React State 렌더링을 최소화하고 `useRef`와 `requestAnimationFrame`을 사용하여 60FPS 유지.
- **자동 공격 시스템**: 플레이어 사거리(`ATTACK_RANGE`) 내 가장 가까운 적을 자동 타겟팅하여 공격.

### 3.2. 적 & 전투 시스템
- **난이도 스케일링**: 깊이(Depth)가 증가할 때마다 적의 수가 1.5배씩 증가 (기본 10마리).
- **보스 몬스터**: 각 웨이브의 마지막 적은 크기가 크고 체력이 높은 보스로 등장.
- **물리 엔진**: 적들 간의 겹침 방지(Soft Collision) 및 투사체 충돌 처리.

### 3.3. 능력(Boon) 시스템
- Gemini AI가 신의 성격(Zeus, Poseidon 등)에 맞춰 능력 이름과 대사를 실시간 생성.
- **구현된 메커니즘**:
  - `multishot`: 발사체 +3 (부채꼴 발사)
  - `rapid`: 공격 속도 1.5배 증가
  - `homing`: 적을 추적하는 유도탄
  - `orbital`: 플레이어 주변을 도는 보호체
  - `lightning`: 주기적으로 무작위 적 타격
  - `heal`: 즉시 체력 회복

### 3.4. 모바일 지원
- **반응형 UI**: 데스크탑 및 모바일 뷰포트 대응.
- **가상 컨트롤러**: 터치 디바이스를 위한 조이스틱(이동) 및 대시 버튼 구현.

## 4. AI 연동 (Gemini)
- **내러티브 생성**: 게임 시작, 사망, 방 입장 등 상황에 따른 분위기 있는 텍스트 생성.
- **방 선택지 생성**: 전투, 이벤트, 상점 등 다양한 선택지를 AI가 한국어로 생성.
- **로딩 시퀀스**: API 호출 대기 시간을 자연스러운 로딩 상태로 처리.

## 5. 향후 계획
- 사운드 및 BGM 효과 추가.
- 더 다양한 적 패턴 및 보스 패턴 구현.
- 상점 및 재화 시스템 고도화.
