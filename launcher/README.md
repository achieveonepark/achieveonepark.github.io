# Achieveone Studio

Windows용 Electron 콘텐츠 편집기입니다. `achieveonepark/achieveonepark.github.io`의 `main`에 연결해 소개, 경력, 프로젝트, 기술 스택, 링크와 프로필 사진을 폼으로 편집합니다.

## 설치와 사용

1. `release/Achieveone-Studio-Setup-0.1.0.exe`를 실행해 설치합니다.
2. [Git for Windows](https://gitforwindows.org/)가 설치되어 있어야 합니다. 기본 설치에 포함된 Git Credential Manager로 GitHub에 로그인합니다.
3. **GitHub로 시작하기**를 누릅니다. 기존 `achieveonepark` 로그인이 있으면 사용하고, 없으면 브라우저 로그인으로 연결합니다.
4. 한글·영문 콘텐츠를 폼과 서식 편집기로 수정합니다. 초안은 자동으로 PC에 저장되고 다음 실행에서 복원됩니다.
5. **게시하기**에서 변경 항목과 기록을 확인한 뒤 게시합니다. `main`에 커밋을 만들고 기존 GitHub Pages 워크플로가 사이트를 배포합니다.

다른 곳에서 같은 콘텐츠를 수정했다면 게시를 중단하고 초안을 유지합니다. **최신 내용**으로 새 내용을 불러오면 서로 다른 항목은 합치고, 겹치는 항목은 사용할 내용을 선택할 수 있습니다.

## 이력서와 경력기술서

**문서 만들기**에서 이력서 또는 경력기술서를 선택합니다. 기존 콘텐츠에서 이름, 경력, 소개, 기술과 프로젝트를 가져와 문서로 재구성합니다.

- 이력서: 회사별 주요 항목을 추려 간결하게 구성합니다.
- 경력기술서: 선택한 회사의 상세 업무와 표, 프로젝트를 포함합니다.
- 포함할 회사와 프로젝트, 문서용 소개·연락처·학력, 사진 포함 여부와 강조색을 바꿀 수 있습니다.
- A4, 선택 가능한 텍스트와 페이지 번호로 PDF를 저장합니다. 사이트 캡처가 아닙니다.
- 원문을 바탕으로 구성하며 경력이나 성과를 새로 만들어 넣지 않습니다. 제출 전에 요약과 선택 항목을 확인하세요.

문서용 전화번호, 거주 지역과 학력 등은 사이트 콘텐츠와 분리해 PC에 저장합니다. 한글·영문 설정은 각각 보관합니다. PDF 저장 자체는 GitHub에 게시하지 않습니다. 저장한 초안이 있으면 GitHub 연결 없이도 문서를 만들 수 있으며, 기존 프로필 사진을 포함하려면 연결하거나 새 사진을 선택해야 합니다.

## 개발

런처의 콘텐츠와 사진은 인증된 GitHub API로 읽으므로 private 저장소도 접근 권한이 있으면 편집할 수 있습니다. GitHub Pages는 별도 조건을 따릅니다. 개인 계정에서 private 저장소를 Pages로 배포하려면 GitHub Pro 이상이 필요하며, 저장소가 private여도 배포된 사이트와 사이트에 포함한 콘텐츠는 공개됩니다. [GitHub Pages 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)를 확인하세요.

Node.js 22 이상을 사용합니다. 사이트와 의존성을 분리했습니다.

```powershell
cd launcher
npm ci
npm start
npm test
npm run package
```

저장소 루트에서는 `npm run studio`로 시작할 수 있습니다. 처음에는 `npm --prefix launcher ci`로 런처 의존성을 설치합니다.

`npm run package`는 Windows x64 설치 파일을 `release/`에 만듭니다. 설치 파일은 로컬 빌드이며 코드 서명과 자동 업데이트는 설정되어 있지 않습니다. 앱 아이콘은 기존 사이트의 `public/icons/favicon.svg`에서 만들었습니다.

## 저장과 인증

- 초안: `%APPDATA%/achieveone-studio/draft.json`
- 문서 설정: `%APPDATA%/achieveone-studio/document-settings.json`
- 인증: Windows의 Git Credential Manager에 있는 `achieveonepark` 계정을 명시해 사용합니다. 런처는 토큰을 렌더러나 초안 파일에 저장하지 않습니다.
- 로그아웃은 런처의 연결을 해제합니다. 다른 도구의 GitHub 로그인이나 전역 Git 설정은 바꾸지 않습니다.
- 게시 작성자와 커미터: `achieveonepark <park_achieveone@naver.com>`
- 원격 수정은 허용된 콘텐츠 파일로 제한하며, 다른 파일과 이력을 유지하고 강제 푸시하지 않습니다.

테스트는 실제 한글·영문 콘텐츠의 무변경 왕복, 개별 파일 수정, 잘못된 링크·사진, 동시 수정 충돌, 게시 작성자, PDF 문서 구성과 표 렌더링을 검증합니다. GitHub 쓰기 테스트는 모의 API를 사용합니다.
