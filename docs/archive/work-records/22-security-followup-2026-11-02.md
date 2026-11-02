# 보안 후속 개선과 관측 — 2026-11-02

[21번 릴리스 기록](21-security-release-2026-10-31.md)의 남은 항목을 우선순위에 따라 보완했다. 사용자 승인 범위에서 코드 커밋·배포와 main 필수 검사 적용을 진행했다. 이 기록은 후속 개선과 검증 결과이며, [19번 부분 감사](19-harness-security-review-2026-10-31.md)를 전체 감사 완료로 바꾸지 않는다.

## 반영한 변경

| 커밋 | 변경과 이유 |
| --- | --- |
| `b98678f` | 분석 동의를 문서 간 storage 이벤트와 저장소 clear에 동기화했다. 철회 시 Clarity denied와 stop을 함께 실행하고, 재동의 때 start한다. 저장 실패 시 오래된 허용값이 재활성화되지 않게 했다. |
| `ff8fa3a` | 초기 테마를 동기 외부 파일로 이동하고 script-src 허용 목록을 Report-Only로 관측한다. 기존 강제 CSP는 유지한다. |
| `ea0588a` | Go 실험 출력 경로를 해당 results 하위로 제한하고, 임의 실행 파일 인자·고정 공개 임시 경로의 hey 자동 실행을 제거했다. 설치된 PATH의 hey만 선택적으로 사용한다. |
| `35509c3` | Web/API CI의 네 npm 설치를 --ignore-scripts로 바꿨다. 배포 검사 URL은 프로젝트 HTTPS 호스트 또는 숫자 HTTP loopback으로 제한하고 redirect를 따라가지 않게 했다. |
| `4349ad3` ([PR #7](https://github.com/leeeeeoy/personal-space/pull/7)) | 세 workflow의 PR 경로 필터를 제거했다. 문서 PR도 Web/API/Harness QA를 모두 실행한다. 마지막 URL 검사 변경의 format 실패도 수정했다. push 경로별 배포 정책은 유지했다. |

`35509c3`의 첫 Web CI는 format 단계에서 실패했고 test/build는 실행되지 않았다. 이를 통과로 집계하지 않았다. 수정 후 PR #7에서 세 QA와 실제 test/build 단계가 성공했고 PR 배포 두 개는 skip이었다. main 병합 후 [Frontend](https://github.com/leeeeeoy/personal-space/actions/runs/41428468957), [Backend](https://github.com/leeeeeoy/personal-space/actions/runs/41428468832), [Harness](https://github.com/leeeeeoy/personal-space/actions/runs/41428468906) CI가 모두 성공했다.

## main 필수 검사

사용자의 명시적 승인으로 기존 `Protect main history` ruleset `22192618`에 아래 세 검사를 추가했다.

- `Frontend Quality`, `Backend Quality`, `documentation`: GitHub Actions app `15368`에 고정
- 최신 main 기준 통과 요구(`strict_required_status_checks_policy: true`)
- 삭제·강제 push 방지·선형 이력 규칙 유지, bypass actor 없음

적용 후 effective main rules를 읽어 확인했고 PR #7을 우회 옵션 없이 squash merge했다. 검사 실패·누락 커밋은 main 반영이 차단된다. 후속 변경은 브랜치와 PR을 사용한다. 실제 기준은 [품질 가이드](../../guides/06-quality-and-safety.md)와 원격 ruleset이다.

## 실행한 검증과 증거의 경계

| 범위 | 관측 결과 | 증명하지 않는 범위 |
| --- | --- | --- |
| 새 설치 | 추적 소스 복사본에서 설치 hook 없이 Web 23개 테스트·빌드, API 17개 테스트·typecheck 통과 | 패키지 전체 소스 감사, 공급망 공격 부재 |
| 호스팅 Web | PR #7 Node 26.13.0 로그에서 23 pass / 0 fail / 0 skip, test/build 단계 성공 | 실제 운영 사용자 세션 전부 |
| 동의 회귀 | 실제 Chrome의 로컬 격리 fixture 7개: 변경 전 4 pass / 3 fail → 변경 후 7 pass | 운영 집계 등록 POST, Microsoft 수집 서버 전달 |
| 실제 Clarity 런타임 | 공식 공개 SDK 0.8.77-beta 복사본으로 stop/restart와 로딩 중 철회 2개 통과. 수집 목적지는 로컬이며 본문은 보관하지 않음 | 외부 분석 파이프라인·서버 보존 정책 |
| CSP | 실제 Chrome에서 base·inline event·form 차단과 dialog 닫기를 확인. 정책 없는 대조군은 해당 동작을 허용. Report-Only 위반 시 inline script는 실행됨 | Report-Only script-src의 차단 효과 |
| 운영 브라우저·HTTP | 운영에서 동의 배너·거절 후 reload·구조 dialog 확인. 최신 배포의 경로·헤더·cache·정적 자산 3개 해시 검사 통과. Preview 비인증 Access 보호 확인 | 인증된 Preview UI, 실제 장비 전체, 운영 rate exhaustion |
| Lab 실행 도구 | Python 6개 테스트 통과. 출력 탈출·symlink와 임의 hey 인자 거절 검증 | 과거 성능 실험의 재측정 |
| Lab DB | 네트워크 없는 별도 PostgreSQL에서 integration root 1개·subtest 3개 통과, skip 0·잔여 schema 0 | 운영 DB 동작 |
| 예약 보상 Lab | 새 프로젝트·볼륨·이미지, 내부 네트워크와 loopback relay로 21/21 판정 유효. HTTP와 독립 SQL·의도적 실패를 검사 | 실서비스 PG/Slack·자동 복구·운영 부하 |

Lab의 callback-loss/refund-failure는 상태 불일치, compensation-blocked는 remote-only 활성 상태를 **예상대로 재현**했다. 21개 통과를 이 결함들이 해결됐다는 뜻으로 사용하지 않는다. relay의 첫 실행은 자원 제한으로 미완료였고, 제한을 조정한 재실행의 완결 결과만 집계했다. 기존 Lab 추적 소스·이미지 태그·과거 원본 결과는 보존했고 작업용 컨테이너·볼륨은 제거했다.

문서 링크 검사는 Entry/Guide 15개를 대상으로 하며 Archive 전체의 링크·외부 URL·보안성을 검증하지 않는다. 하네스 자체 테스트는 6개다.

## 배포 상태

2026-11-02 조회 시 아래 버전이 각각 100% 활성이다. API 소스·원격 SQL/스키마·Secret 값·도메인/Access 정책은 이번 후속 작업에서 변경하지 않았다.

| 대상 | 활성 버전 |
| --- | --- |
| Production Web | `2d9ab1c4-9d2f-43ca-afda-fb006446e7a6` |
| Preview Web | `a5a60a2b-3e28-44a1-9ab8-0bf9df13ecc4` |
| Production API | `8512d689-4d6d-4025-8b5f-d294ec2821d7` |
| Preview API | `d5f9d6e8-0dd2-4717-bc2a-c0471281edda` |

## 운영 관측과 남은 우선순위

2026-11-02 10:31 UTC 조회에서 D1의 반환된 일별 행은 10월 31일 read 6건, 11월 1일 read 4건이며 두 행의 write는 0건이었다. 11월 2일 행은 반환되지 않아 0건으로 간주하지 않았다. 저장 크기는 128 KiB다. 같은 조회 기간의 `/api/visits` HTTP adaptive 집계는 200 10건·204 4건·504 4건·403 2건이고 429 그룹은 반환되지 않았다. 서로 다른 집계의 표본·지연을 고려해야 하며 낮은 사용량을 비용 공격 방어의 증거로 삼지 않는다.

1. **API 504 원인 관측:** 10월 31일 02:09/03:04/03:05 UTC의 GET 504 총 4건은 원인 미확인이다. 같은 구간 Worker 집계의 success 13 / errors 0만으로 원인을 단정할 수 없다. 11월 1일 GET 3회와 11월 2일 최신 배포 후 curl GET 3회는 모두 200·no-store·no-cookie였다. 단, 기본 Python urllib 요청은 Cloudflare 1010(browser signature) 403으로 차단됐다. 이를 API 애플리케이션 오류나 통과로 집계하지 않았으며 보호 설정을 완화하지 않았다. 재발 시 기존 요청 시각·상태와 Worker/D1 지표를 대조하고, 보존 범위를 정한 뒤 필요한 observability를 검토한다. 운영 부하·집계 증가를 만드는 실험은 하지 않았다.
2. **배포 token 최소 권한:** 현재 인증에서 권한 조회가 403으로 거절되어 실제 CI token의 account/zone·scope를 확인하지 못했다. 배포 성공과 최소 권한은 별개다. 권한 있는 경로로 정책을 확인한 뒤 필요하면 별도 승인으로 교체한다. token 값 조회·Secret 변경은 하지 않았다.
3. **CSP 강제 적용:** 운영에 Cloudflare inline JavaScript Detections가 nonce 없이 주입되어 엄격한 script-src와 충돌한다. nonce/edge 호환성을 먼저 검증한다. 이를 피하려고 unsafe-inline을 추가하거나 보안 감지를 끄지 않았다. Report-Only에는 별도 보고 수집기를 추가하지 않았다.
4. **정적 분석 맥락 검토:** Sonar의 OPEN VULNERABILITY 분류는 10개에서 2개로 줄었지만 main `4349ad3`의 전체 Quality Gate는 ERROR다. new security rating C, new duplicated lines 11.39%다. 남은 두 항목은 내부 Lab HTTP 더블(`python:S5332`)과 실험 순서 재현용 seeded PRNG(`python:S2245`)다. 외부 분류를 독립 확인된 취약점 수로 치환하지 않는다. 예외 처리·임계값 하향·제외 설정은 하지 않았다. 독립 Lab 코드를 점수 때문에 합치지 않고 맥락과 중복의 유지 비용을 별도로 검토한다.
5. **외부 경로 검증:** 인증된 Preview UI와 Microsoft 서버 전달은 미검증이다. 지역별 근사 rate limit은 전역 비용 상한이 아니며 공유 한도에 따른 정상 방문자 거절 가능성도 남는다.

로컬 상세 증거는 작업 산출물 `outputs/portfolio-followup-2026-10-31/`에 보관한다. 브라우저·배포·운영 관측·정적 분석은 서로 다른 증거이며, 비밀 정보나 실험 원본을 이 공개 기록에 복제하지 않는다.
