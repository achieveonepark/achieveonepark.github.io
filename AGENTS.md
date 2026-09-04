# 저장소 작업 규칙

## Git 작성자와 인증 계정

이 규칙은 `achieveonepark/achieveonepark.github.io` 저장소와 그 하위 폴더에 적용한다.

사용자가 Fork를 통해 관리하는 작업이 아니라, 이번처럼 저장소 URL을 직접 전달하여 Git CLI로 받아오고 커밋·푸시를 요청하는 경우에는 다음 계정을 사용한다.

- Author 및 Committer 이름: `achieveonepark`
- Author 및 Committer 이메일: `park_achieveone@naver.com`
- GitHub 푸시 인증 계정: `achieveonepark`

작성자 설정은 반드시 이 저장소의 로컬 설정(`.git/config`)에만 적용한다. 기존 Fork 계정과 전역 Git 설정은 변경하지 않는다.

```bash
git config --local user.name achieveonepark
git config --local user.email park_achieveone@naver.com
```

사용자가 요청한 커밋을 만들기 전에 다음 명령으로 설정의 출처와 실제 Author·Committer가 위 정보와 일치하는지 확인한다. 환경 변수 등으로 다른 정보가 적용되면 이 작업 범위에서 바로잡은 뒤 커밋한다.

```bash
git config --show-origin --show-scope --get-regexp '^user\.(name|email)$'
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

커밋 작성자와 GitHub 인증 계정은 별개다. 푸시할 때는 이 저장소에 설정된 `achieveonepark` 전용 인증을 사용한다. 인증 설정을 복구해야 한다면 저장소 로컬 credential helper에서 `gh auth token --hostname github.com --user achieveonepark`로 해당 계정을 명시하여 선택하고, 토큰은 대화·로그에 노출하거나 문서·저장소 파일에 기록하지 않는다. Fork나 GitHub CLI의 공통 활성 계정을 전환하여 맞추지 않는다.

이 규칙을 적용하기 위해 기존 커밋의 작성자나 이력을 다시 쓰지 않는다.
