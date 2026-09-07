# Gridinc (그리드)

- 기간: 2022.05 - 2023.06
- 링크: https://www.gridinc.com
- 기술: Unity, Jenkins, Android, iOS, Windows, MacOS
- 분야: Metaverse, Cross-Platform

메타버스 앱 신규 개발 런칭 및 유지 보수 (Android, iOS, Win, MacOS)

## Contents

### 캐릭터 이동 동기화
![character_move_sync](./character_move_sync.mp4)
- 매 프레임이 아닌 특정 시점에 Sync 패킷 주고 받아 이동 처리

### Login
- Google / Apple Sign In 구현 (Android, iOS, Windows, MacOS)
- |  | Android | iOS | Windows | MAC |
  | --- | --- | --- | --- | --- |
  | Google | [네이티브 API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) 에셋 | [네이티브 API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) 에셋 | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |
  | Apple | X | AppleLogin SDK | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [딥링크](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |
- Mobile: 기존에 존재하는 Google Sign In의 aar 및 플러그인을 의존하지 않음
- Desktop: 딥링크 기능을 활용하여 로그인

### ETC
- Socket.IO + Rest API를 사용하여 채팅 기능 구현
- Desktop WebView: 3D WebView 활용 개발
- 아트팀 협업 파이프라인 효율화 작업
- 동남아 쪽 지원을 위한 Chrome Book 대응
