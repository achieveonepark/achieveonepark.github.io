# 111%

- 기간: 2023.10 - NOW
- 링크: https://www.111percent.net
- 기술: C#, Unity, .NET, Android/iOS, Steam, WebGL, Electron

사내 Unity 프로젝트에서 공통적으로 사용할 수 있는  
**게임 공용 시스템 및 플랫폼 대응 인프라를 개발하며, 유니티 최신기술을 R&amp;D하여 사내에 도입하였습니다.**

## AI

- Codex, Claude에서 Unity CLI 이용하는 방법 가이드
- 사내 시스템을 Skill로 만들어 에이전트가 구현하도록 하는 스킬 제공
- 사내에서 제공하는 시스템들을 한 곳에 모으는 Skill Hub 기능 제작

## 결제 모듈

- 영수증 검증을 포함한 결제 모듈 제작
- 플랫폼별 결제 검증 로직을 통합하여 공용 모듈 형태로 제공
  - Mobile (Android, iOS)
  - Steam
  - WebGL



## 데이터 관리

게임 데이터 관리와 Localization을 위한 데이터 시스템을 개발했습니다.

- 데이터 테이블 기반 런타임 로드 시스템 구현
- TMP(TextMeshPro)와 데이터 테이블을 이용한 Localization 기능 구현



## 클라이언트 내 DB 관리

Firebase 기반 서버리스 저장 시스템을 구현했습니다.

- Google Firestore 기반 데이터 저장
- Firebase Auth를 이용한 인증 처리
- Security Rules를 통한 데이터 접근 제어
- 별도의 게임 서버 없이 데이터 저장 가능하도록 설계



## 리소스 관리

게임 리소스를 효율적으로 관리하기 위한 리소스 시스템을 구축했습니다.

- Unity Addressables 기반 리소스 다운로드 / 로드 시스템
- Cloud Storage + CDN 기반 리소스 업로드 및 관리



# 플랫폼

기존 모바일 중심 Unity 프로젝트를
**멀티 플랫폼에서도 동작하도록 확장했습니다.**

## Steam

Steam 플랫폼 대응을 위한 시스템 개발

- Steamworks.NET 기반 Steam 플랫폼 대응
- Steam IAP 모듈 제작
- Steam 빌드 간소화
- 배포 가이드 문서 제작

## WebGL

Unity 프로젝트의 WebGL 실행 환경 대응

- WebGL 환경에서 동작하도록 시스템 수정
- WebGL 빌드 및 운영 가이드 제작



# 개발 인프라

개발자 생산성을 높이기 위한 개발 인프라 작업을 수행했습니다.

- NuGetForUnity 사용 자동화
- 사내 서버 사용 가이드 제작
- Unity / Xcode 빌드 이슈 대응
- 레거시 프로젝트 마켓 최신화 대응



# R&amp;D

## Photon Quantum3

Photon Quantum3 기반 ECS 게임 샘플 개발

- Deterministic Simulation 기반 멀티플레이 구조 분석
- ECS 기반 네트워크 게임 구조 연구



# Technology Stack

- Unity
- C#
- Steamworks.NET
- Unity Addressables
- Photon Quantum3
- NuGetForUnity
- Firebase
- Electron
- Avalonia
