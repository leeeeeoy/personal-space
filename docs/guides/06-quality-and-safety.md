# Quality, CI & Safety

## 기본 검증 범위

변경한 영역과 실제 파급 범위에 맞춰 아래 검사를 선택한다. 문서 전용 변경 때문에 앱 전체 빌드나 원격 접속을 자동으로 시작하지 않는다. 의존성 설치는 일반 개발의 준비 단계이며, 보안 감사 중에는 스킬의 실행 격리·오프라인 조건을 먼저 따른다.

### 문서·에이전트 하네스만 변경

저장소 루트에서 실행한다. 추가 패키지는 필요 없다.

```bash
python3 scripts/check_docs.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py'
git diff --check
```

링크 검사는 현재 Entry·Guide의 인라인 Markdown 링크에 대해 로컬 파일 존재와 저장소 내부 경계를 확인한다. 외부 URL·앵커·코드 예시·reference형 링크·Archive 내부의 역사적 링크는 검사하지 않는다. 앱의 실제 동작이나 비밀정보 부재를 증명하는 검사는 아니다. `.github/workflows/harness-ci.yml`이 링크 검사와 하네스 테스트를 실행하며 배포 job은 없다. `git diff --check`는 로컬 변경을 마무리할 때 실행한다.

### Web (`apps/web/`)

```bash
cd apps/web
npm ci
npm run content:check
npm run lint
npm run format:check
npm test
npm run typecheck
npm run build
```

Node 버전은 `apps/web/.nvmrc`(26)과 일치시킨다. 명령의 원본은 `apps/web/package.json`이다. root 통합 npm 명령은 없다.

### API (`apps/api/`, CI Node 22)

```bash
cd apps/api
npm ci
npm test
npm run typecheck
```

API는 웹의 Node 버전을 강제하지 않는다. 다른 Node에서 검사하면 해당 결과와 CI Node 22 미검증 여부를 분리해 보고한다. API에는 기존 루트 테스트와 실제 로컬 D1의 방문 집계 테스트가 있다. 동시성·롤백·동의·IP/쿠키 중복·자정/시간 경계를 검사하지만 운영 Cloudflare 경로·헤더·R2를 검증한 결과는 아니다.

### Go Lab (독립 신규 실험; 해당 실험만)

```bash
cd labs/go-load-test
go test ./...
go test -race ./...  # race 분석이 가능한 플랫폼/설정에서
```

과거 원본은 없어서 Phase 4에서 새로 구현한 Go 소스에 대해 위 명령과 go vet를 실행했다. 수행하지 않은 검사에 '통과'를 표기하지 않는다.

## 최소 자동 검사

- Markdown frontmatter 필수 필드, 날짜 형식, 중복 slug, 초안 제외 확인
- 웹 라우트: `/`, `/portfolio/`, `/lab/`, `/writing/`, 글 상세 및 404/호환 route
- Portfolio 기존 경력/프로젝트 자료 회귀 검사
- 개인정보·토큰 커밋 방지(`.gitignore` + git diff 검토; 향후 필요 시 secret scan)
- 변경 경로별 CI 트리거: `apps/web/**` + `content/lab/**` + `content/writing/**` → Web QA/배포, `apps/api/**` → Backend QA/배포. Entry·Guide·하네스 검사 변경 → Harness QA만 실행한다. `labs/**`·docs/templates-only는 두 앱 workflow 대상이 아니다. Lab 전용 CI는 현재 없으므로 실험별 로컬 검사를 기록한다.
- GitHub Actions에서는 PR에 배포하지 않는다. 기존 main=Production, develop=Preview 의미 유지.

## 의존성과 CI 유지

2026-10-31 Web lockfile의 개발 도구 경로에서 [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)가 확인되어 `<11.0.1`에만 정확한 `11.0.1` override를 적용했다. 브라우저 런타임 취약점이나 실제 공격 가능성을 확인했다는 뜻은 아니다. 상위 ESLint/TypeScript ESLint의 `^10.2.x` 범위를 넘으므로 lint·전체 Web 검사로 호환성을 확인하고, 상위가 패치 범위를 수용하면 override를 제거한다. `npm audit fix --force`의 구버전 downgrade 제안은 적용하지 않는다.

`npm audit --package-lock-only --ignore-scripts` 결과는 조회 시점의 공개 권고 정보이며 취약점 부재를 보장하지 않는다. API와 Web lockfile을 각각 조회한다. 기존 Undici/Zod override도 같은 원칙으로 유지한다.

세 workflow의 외부 Actions는 2026-10-31 공식 저장소 major ref를 조회한 40자리 commit SHA로 고정했다. 주석의 major는 갱신 참고용이다. 갱신할 때 공식 ref/commit과 변경 내용을 검토한 뒤 SHA를 함께 바꾼다. checkout은 `persist-credentials: false`, workflow 권한은 `contents: read`를 유지하며 배포 Secret은 push 전용 deploy job에서만 사용한다. 서명 메타데이터 확인이나 SHA 고정은 Action 소스 전체 감사·호스팅 CI 실행을 대신하지 않는다.

Web/API의 공유 `CLOUDFLARE_FRONTEND_API_TOKEN`은 기존 통합 결정을 유지한다. 실제 권한은 로컬 Wrangler OAuth와 다른 인증이므로 로컬 `whoami` 결과로 최소 권한을 주장하지 않는다. 다음 승인된 릴리스 전 배포 토큰의 정확한 account/zone 제한, Workers 배포·route 편집·기존 R2 설정 읽기 외 불필요한 권한, GitHub required checks/Secret 접근 범위를 확인한다. 토큰 재발급·Secret 교체·원격 보호 규칙 변경은 별도 승인 범위다.

## 수동 품질 점검

- 모바일/데스크톱, 라이트/다크, reduced motion, keyboard 접근성과 heading 순서
- Markdown의 코드 블록/긴 표/이미지 대체 텍스트/외부 링크
- 새 글 deep link 직접 접근과 브라우저 새로고침
- `?lang=en` UI에서 한국어 글만 있는 경우 언어 표시/폴백
- 기존 Cloudflare Access Preview 보호, `workers.dev`/preview URL 공개 범위
- Clarity 동의(동의 전 미로딩), R2 이미지, 리다이렉션/SEO 경로
- `apps/web/scripts/check-deployment.mjs` 사용 시 경로와 검사 주소를 실제 구성에 맞게 확인

## 브라우저 보안 헤더

Static Assets의 `_headers`는 frame/object 차단과 함께 `base-uri 'none'`, `form-action 'none'`, `script-src-attr 'none'`를 적용한다. 현재 UI는 네트워크 form 제출·HTML inline event 속성·base 태그가 필요 없다. 구조 안내의 `form method="dialog"`는 문서 이동 없이 대화상자만 닫는다. 배포 검증 스크립트도 세 directive를 확인한다.

`script-src`는 먼저 **Report-Only**로 관찰한다. 자기 출처, `www.clarity.ms`, `scripts.clarity.ms`, `static.cloudflareinsights.com`만 허용한 관찰 정책이며 추가 보고 서버는 두지 않는다. 초기 테마는 `public/theme.js`를 동기 로딩해 적용한다. 배포 검사는 관찰 정책 유지와 테마 파일 해시·캐시도 확인한다. Report-Only는 스크립트 실행을 막지 않으므로 XSS 방어 완료로 보고하지 않는다.

운영 HTML에는 Cloudflare의 Web Analytics와 inline JavaScript Detections가 주입된다. 후자의 nonce 없는 inline bootstrap은 엄격한 `script-src`에서 차단된다. 강제 적용 전 동적 nonce 등 주입 스크립트와의 호환 경로를 검증하며, 통과시키기 위해 `unsafe-inline`을 추가하거나 보안 감지를 끄지 않는다. [Cloudflare의 CSP 제약](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/), [Web Analytics CSP](https://developers.cloudflare.com/web-analytics/faq/)를 따른다. 로컬 대조군·헤더 검사를 실제 edge 주입 또는 Clarity 수집 검증으로 대체하지 않는다.

분석 동의는 `src/analytics.ts`가 저장·동기화한다. 다른 문서의 localStorage 변경·삭제도 반영하며, 철회 시 Clarity에 `consentv2` denied와 `stop`을 전달하고 방문 API 쿠키를 철회한다. 저장이 실패하면 이전 허용값 제거를 시도하고 현재 페이지 선택을 적용한다. 저장된 허용값은 저장소에 쓸 수 있을 때만 자동 적용한다. [Clarity ConsentV2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)의 denied는 제한된 무쿠키 추적을 허용하므로 그것만으로 분석 종료를 주장하지 않는다.

## 콘텐츠 보안/개인정보

- [기존 공개 승인 원칙](../archive/portfolio-renewal/05-privacy-and-content-policy.md)을 계승한다. 역사 문서의 이메일 전면 금지와 달리 이번 기능 보존 범위는 기존 공개 연락처를 그대로 유지한다. 새 주소 공개·원본 이력서 수입은 승인하지 않는다.
- 원본 이력서·전화번호·상세주소·생년월일·사내 비공개 자료·API 키·OAuth 토큰을 커밋하지 않는다.
- 개인 이메일은 기존 공개 포트폴리오와 테스트에 허용된 값은 보존하지만, **새 파일에 무심코 복제하지 않는다**.
- Public repo의 Markdown 초안과 커밋 이력은 사이트의 `draft` 설정과 무관하게 공개된다.
- Markdown 렌더러에서 raw HTML/스크립트 실행을 기본 차단하고 사용자 입력·URL을 안전하게 처리한다.
- Lab 실험 데이터가 사용자/회사 내부 정보를 포함하면 완전히 합성한 데이터로 재현한다.
- 댓글·회원 기능이 들어오기 전에는 신뢰되지 않은 방문자 데이터 저장 경로를 만들지 않는다.

## 에이전트 작업 계약

각 단계 완료 보고에 다음 네 항목이 반드시 있어야 한다.

```text
1. 변경: 파일 및 요약
2. 검증: 실행 명령과 결과(실행하지 못한 항목 포함)
3. 위험: 남은 문제, 운영 영향, 개인정보/비밀정보 점검
4. 다음: 다음 승인 게이트 또는 작업
```

검증 실패 시 성공이라고 요약하지 않고 원인과 복구 방법을 먼저 제시한다. CI 또는 문서 검증이 반복적으로 깨지는 규칙만 실행 가능한 검사로 승격한다.

## 현재 작업과 과거 이전 단계의 배포 경계

Phase 1~4의 로컬 작업 제한은 당시 승인 범위다. 이후 모노레포가 운영에 반영된 상태는 [이전 기록의 후속 상태](04-migration-plan.md)에 구분했다. 현재 작업은 사용자 요청과 AGENTS를 따르며 과거의 일회성 배포 승인을 재사용하지 않는다. PR에는 배포하지 않고, docs/templates/labs-only 변경은 앱 workflow 대상이 아니다. Web/API 변경을 main/develop에 push하면 해당 배포 workflow가 실행될 수 있으므로 push·배포 승인과 영향을 함께 확인한다. 배포 조건을 임의로 바꾸거나 테스트를 비활성화하지 않는다.

Phase 2에서 기본 경로·Notes·없는 경로 UI와 양언어 App 렌더링 검사를 구현했다. 실제 Chrome 검증과 Phase 1에서 이어지는 미검증 범위는 [Phase 2 기록](../archive/work-records/11-phase2-pages-record-2026-10-14.md)에 구분했다. Phase 3에서 Markdown 계약·글 상세·초안 dist 제외·실패 빌드 검사를 추가했다. [Phase 3 기록](../archive/work-records/12-phase3-content-record-2026-10-14.md)에 로컬 검사와 잔여 위험을 구분한다.
