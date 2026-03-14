# 111% (111퍼센트)

- 기간: 2023.10 - NOW
- 링크: https://www.111percent.net
- 기술: C#, Unity, .NET, Android/iOS, Steam, WebGL, Firebase

사내 Unity 프로젝트에서 공통적으로 사용할 수 있는  
**게임 공용 시스템 및 플랫폼 대응 인프라를 개발했습니다.**

# Internal Game Systems

## Payment System

Unity 프로젝트에서 사용할 수 있는 공용 결제 모듈을 개발했습니다.

- 영수증 검증을 포함한 결제 모듈 제작
- 플랫폼별 결제 검증 로직을 통합하여 공용 모듈 형태로 제공

## Data System

게임 데이터 관리와 로컬라이제이션을 위한 데이터 시스템을 개발했습니다.

- 데이터 테이블 기반 런타임 로드 시스템 구현
- TMP(TextMeshPro)와 데이터 테이블을 이용한 Localization 기능 구현

## Serverless Save System

Firebase 기반 서버리스 저장 시스템을 구현했습니다.

- Google Firestore 기반 데이터 저장
- Firebase Auth를 이용한 인증 처리
- Security Rules를 통한 데이터 접근 제어
- 별도의 게임 서버 없이 데이터 저장 가능하도록 설계

## Resource Pipeline

게임 리소스를 효율적으로 관리하기 위한 리소스 시스템을 구축했습니다.

- Unity Addressables 기반 리소스 로딩 시스템 제작
- Cloud Storage 기반 리소스 업로드 및 관리

# Platform Support

기존 모바일 중심 Unity 프로젝트를  
**멀티 플랫폼에서도 동작하도록 확장했습니다.**

## Steam Platform

Steam 플랫폼 대응을 위한 시스템 개발

- Steamworks.NET 기반 Steam 플랫폼 대응
- Steam IAP 모듈 제작
- Steam 빌드 및 배포 가이드 문서 제작

## WebGL Platform

Unity 프로젝트의 WebGL 실행 환경 대응

- WebGL 환경에서 동작하도록 시스템 수정
- WebGL 빌드 및 운영 가이드 제작

# Development Infrastructure

개발자 생산성을 높이기 위한 개발 인프라 작업을 수행했습니다.

- NuGetForUnity 사용 자동화
- 사내 서버 사용 가이드 제작
- Unity / Xcode 빌드 이슈 대응
- 레거시 프로젝트 마켓 최신화 대응

# Technical Research

## Photon Quantum3

Photon Quantum3 기반 ECS 게임 샘플 개발

- Deterministic Simulation 기반 멀티플레이 구조 분석
- ECS 기반 네트워크 게임 구조 연구

# Technology Stack

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