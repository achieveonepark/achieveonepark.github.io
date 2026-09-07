# About Me

## Profile

- 이름: 박성일
- 경력: 유니티 개발자 8년차

안녕하세요. 8년 차 Unity 개발자 박성일입니다. 게임 공용 시스템과 멀티플랫폼 대응, 그리고 팀 생산성을 높이는 툴·파이프라인을 만듭니다.

8년 동안 **PC와 모바일 게임의 개발, 런칭, 운영** 전 과정을 경험하며 기능 구현부터 서비스 안정화까지 폭넓게 담당해왔습니다. 최근에는 **기술 지원 조직**에서 공용 시스템 구축과 개발 환경 개선을 통해 팀이 더 빠르고 안정적으로 개발할 수 있는 기반을 만드는 데 집중하고 있습니다.

`C#`, `Unity`, `.NET` 환경에 익숙하며, 결제·데이터·저장·리소스 파이프라인처럼 여러 프로젝트에서 재사용할 수 있는 **공통 시스템 설계와 운영**을 강점으로 가지고 있습니다. 특히 반복 작업을 줄이고 동료들의 불편함을 해소하는 **툴 개발과 워크플로우 개선** 과정에서 가장 큰 보람을 느낍니다.

어릴 때부터 좋아했던 RPG 경험이 개발자의 출발점이었고, 지금도 플레이어 관점과 팀 관점을 함께 고려하며 게임을 만듭니다. 단순히 기능을 구현하는 데서 그치지 않고, 프로젝트가 더 건강하게 돌아갈 수 있도록 구조와 흐름을 함께 고민하는 개발자이고자 합니다.

**긴밀한 소통과 명확한 목표 공유가 좋은 결과를 만든다고 믿습니다.** 함께 일하는 사람들이 신뢰할 수 있는 개발자가 되기 위해 꾸준히 배우고 개선하며 성장하고 있습니다.

# Professional Experience

## 111% (111퍼센트)

- 기간: 2023.10 - NOW
- 링크: https://www.111percent.net
- 기술: C#, Unity, .NET, Android/iOS, Steam, WebGL, Firebase

사내 Unity 프로젝트에서 공통적으로 사용할 수 있는
**게임 공용 시스템 및 플랫폼 대응 인프라를 개발했습니다.**

### Internal Game Systems

#### Payment System

Unity 프로젝트에서 사용할 수 있는 공용 결제 모듈을 개발했습니다.

- 영수증 검증을 포함한 결제 모듈 제작
- 플랫폼별 결제 검증 로직을 통합하여 공용 모듈 형태로 제공

#### Data System

게임 데이터 관리와 로컬라이제이션을 위한 데이터 시스템을 개발했습니다.

- 데이터 테이블 기반 런타임 로드 시스템 구현
- TMP(TextMeshPro)와 데이터 테이블을 이용한 Localization 기능 구현

#### Serverless Save System

Firebase 기반 서버리스 저장 시스템을 구현했습니다.

- Google Firestore 기반 데이터 저장
- Firebase Auth를 이용한 인증 처리
- Security Rules를 통한 데이터 접근 제어
- 별도의 게임 서버 없이 데이터 저장 가능하도록 설계

#### Resource Pipeline

게임 리소스를 효율적으로 관리하기 위한 리소스 시스템을 구축했습니다.

- Unity Addressables 기반 리소스 로딩 시스템 제작
- Cloud Storage 기반 리소스 업로드 및 관리

### Platform Support

기존 모바일 중심 Unity 프로젝트를
**멀티 플랫폼에서도 동작하도록 확장했습니다.**

#### Steam Platform

Steam 플랫폼 대응을 위한 시스템 개발

- Steamworks.NET 기반 Steam 플랫폼 대응
- Steam IAP 모듈 제작
- Steam 빌드 및 배포 가이드 문서 제작

#### WebGL Platform

Unity 프로젝트의 WebGL 실행 환경 대응

- WebGL 환경에서 동작하도록 시스템 수정
- WebGL 빌드 및 운영 가이드 제작

### Development Infrastructure

개발자 생산성을 높이기 위한 개발 인프라 작업을 수행했습니다.

- NuGetForUnity 사용 자동화
- 사내 서버 사용 가이드 제작
- Unity / Xcode 빌드 이슈 대응
- 레거시 프로젝트 마켓 최신화 대응

### Technical Research

#### Photon Quantum3

Photon Quantum3 기반 ECS 게임 샘플 개발

- Deterministic Simulation 기반 멀티플레이 구조 분석
- ECS 기반 네트워크 게임 구조 연구

### Technology Stack

- Unity
- C#
- Firebase
  - Firestore
  - Authentication
  - Cloud Storage
- Steamworks.NET
- Unity Addressables
- Photon Quantum3
- NuGetForUnity

## Snowpipe (스노우파이프)

- 기간: 2023.06 - 2023.10
- 링크: https://www.snowpipe.co.kr
- 기술: Unity

신규 게임 프로젝트 개발

## Gridinc (그리드)

- 기간: 2022.05 - 2023.06
- 링크: https://www.gridinc.com
- 기술: Unity, Jenkins, Android, iOS, Windows, MacOS
- 분야: Metaverse, Cross-Platform

메타버스 앱 신규 개발 런칭 및 유지 보수 (Android, iOS, Win, MacOS)

### Contents

#### 캐릭터 이동 동기화

[캐릭터 이동 동기화 영상](public/parkachieveone/portfolio/experience/character_move_sync.mp4)

- 매 프레임이 아닌 특정 시점에 Sync 패킷 주고 받아 이동 처리

#### Login

- Google / Apple Sign In 구현 (Android, iOS, Windows, MacOS)

|  | Android | iOS | Windows | MAC |
| --- | --- | --- | --- | --- |
| Google | [네이티브 API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) 에셋 | [네이티브 API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) 에셋 | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |
| Apple | X | AppleLogin SDK | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |

- Mobile: 기존에 존재하는 Google Sign In의 aar 및 플러그인을 의존하지 않음
- Desktop: 딥링크 기능을 활용하여 로그인

#### ETC

- Socket.IO + Rest API를 사용하여 채팅 기능 구현
- Desktop WebView: 3D WebView 활용 개발
- 아트팀 협업 파이프라인 효율화 작업
- 동남아 쪽 지원을 위한 Chrome Book 대응

## Snowballs (스노우볼스)

- 기간: 2021.09 - 2022.04

https://www.youtube.com/watch?v=qKEeqTkbvn0

- '기사 키우기 : 데미갓' 런칭 및 라이브 서비스
- 퍼즐 게임 신규 개발 및 인게임 스테이지 제작 툴(Level Editor) 개발
- 전체 프로젝트 Android/iOS 빌드 파이프라인 관리

## Dalcomsoft (달콤소프트)

- 기간: 2018.12 - 2021.08
- 링크: https://www.dalcomsoft.com
- 분야: Rhythm Game, SDK Integration

### 개발 및 런칭 프로젝트

- SuperStar Starship
- SuperStar YG
- SuperStar KangDaniel

### 유지보수 프로젝트

- SuperStar BTS
- SuperStar JYP

### SDK 연동

- Google AdManager
- Tapjoy
- AudienceNetwork 광고 SDK
- Firebase 연동

### Contents

- 업데이트 피쳐 제작
- 인게임 UI 폴리싱 및 컨텐츠 구현 (Native Java/Obj-C 활용)
