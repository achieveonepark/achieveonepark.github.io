# Gridinc

- Period: 2022.05 - 2023.06
- Website: https://www.gridinc.com
- Technologies: Unity, Jenkins, Android, iOS, Windows, MacOS
- Focus: Metaverse, Cross-Platform

Developed, launched, and maintained a metaverse application for Android, iOS, Windows, and macOS.

## Contents

### Character Movement Synchronization
![character_move_sync](./character_move_sync.mp4)
- Synchronized character movement by exchanging packets at specific intervals rather than every frame.

### Login
- Implemented Google and Apple sign-in for Android, iOS, Windows, and macOS.
- |  | Android | iOS | Windows | MAC |
  | --- | --- | --- | --- | --- |
  | Google | [Native API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) asset | [Native API](https://assetstore.unity.com/packages/tools/integration/google-login-ios-android-94517) asset | Rest API + [deep links](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [deep links](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |
  | Apple | X | AppleLogin SDK | Rest API + [deep links](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) | Rest API + [deep links](https://assetstore.unity.com/packages/tools/integration/legacy-universal-deep-linking-seamless-deep-link-and-web-link-as-125172) |
- Mobile: Implemented Google sign-in without relying on existing Google Sign-In AARs or plugins.
- Desktop: Used deep links for sign-in.

### ETC
- Implemented chat using Socket.IO and REST APIs.
- Desktop WebView: Built integrations using 3D WebView.
- Streamlined collaboration pipelines with the art team.
- Added Chromebook support for Southeast Asian markets.
