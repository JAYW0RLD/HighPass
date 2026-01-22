# 🔏 OpenSeal 무결성 증명 가이드 (Code Integrity Guide)

HighStation 생태계에서 서비스를 등록하기 위해서는 **OpenSeal**을 통한 소스 코드 무결성 증명이 **필수**입니다. 이는 AI 에이전트가 신뢰할 수 있는 서비스만을 이용하도록 보장하는 플랫폼의 핵심 정책입니다.

## 🏗️ 3단계 통합 프로세스

### 1. 서비스 래핑 (Wrapping as API Server)
서비스의 핵심 로직을 HighStation 호환 API 서버로 래핑하여 게이트웨이와 통신할 준비를 합니다.

- **포트 설정**: 내부 서버는 기본적으로 `3000` 또는 커스텀 포트로 대기합니다.
- **표준 응답**: 에이전트의 요청을 처리하고 결과를 JSON 형태로 반환하는 엔드포인트를 구현합니다.
- **보안**: [Provider 가이드](./PROVIDER_GUIDE_KR.md)를 참고하여 IP 화이트리스트 및 HMAC 서명 검증을 적용하십시오.

### 2. OpenSeal SDK 적용 및 빌드 (Opensealing)
서비스 코드베이스에 OpenSeal을 적용하고 무결성 해시(Merkle Root)를 생성합니다.

- **CLI 설치**: OpenSeal CLI는 Rust로 작성되었습니다. `cargo`를 사용하여 설치합니다.
  ```bash
  # 방법 1: GitHub에서 직접 설치
  curl -L https://github.com/Gnomone/openseal/releases/latest/download/install.sh | bash

  # 방법 2: 로컬 클론 후 설치
  cd openseal
  cargo install --path ./crates/openseal-cli
  ```
- **해시 생성**: 프로젝트 루트에서 빌드 명령을 수행합니다. (실행 명령 `--exec`를 포함해야 합니다.)
  ```bash
  openseal build --source . --output ./dist --exec "your-run-command"
  ```
- **결과물**: 프로젝트 루트에 `openseal.json` 파일이 생성됩니다. 이 파일에는 프로젝트의 모든 소스 파일에 대한 암호학적 지문(Merkle Root)이 담겨 있습니다.

### 3. OpenSeal 태그 달기 및 푸시 (Tagging & Push)
빌드된 무결성 정보와 함께 깃허브(GitHub)에 업데이트를 반영합니다.

- **태그 추가**: `README.md` 상단에 OpenSeal 검증 뱃지를 추가하여 투명성을 강조합니다.
  - **마크다운 예시**:
    ```markdown
    [![OpenSeal Verified](https://img.shields.io/badge/OpenSeal-Verified-success?style=for-the-badge&logo=security)](https://highstation.io/verify/your-repo-address)
    ```
- **푸시 및 태그(Tagging)**: `openseal.json` 파일을 포함하여 깃허브 레포지토리에 푸시하고, **`openseal`로 시작하는 버전 태그**를 생성합니다. (HighStation 검증 엔진은 이 태그 명칭을 검색하여 무결성을 확인합니다.)
  ```bash
  git add openseal.json README.md
  git commit -m "chore: implement OpenSeal code integrity proof"
  git push origin main

  # GitHub Tag 생성 (반드시 'openseal' 접두어 사용)
  git tag -a openseal-v1.0.0 -m "Release v1.0.0 with OpenSeal Integrity Proof"
  git push origin openseal-v1.0.0
  ```
- **최종 등록**: HighStation 대시보드에서 깃허브 레포지토리의 해당 태그 URL(예: `.../releases/tag/openseal-v1.0.0`)을 등록하면 무결성 검증이 완료됩니다.

---

## 🏆 검증의 효과
- **L1 Integrity 보장**: 실행 중인 코드가 공개된 소스와 100% 일치함을 수학적으로 증명.
- **신뢰 점수 상승**: `openseal_verified: true` 플래그 획득.
- **에이전트 채택율 증가**: 보안에 민감한 기업용 에이전트들은 오직 OpenSeal 검증된 서비스만 호출하도록 세팅됩니다.
