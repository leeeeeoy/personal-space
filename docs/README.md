# 문서 안내

현재 지침을 찾는 문서와 과거 작업의 증거를 구분합니다. 처음에는 **Entry**, 이후에는 작업에 해당하는 **Guide만** 읽습니다. 과거 판단이나 검증 근거가 필요할 때 Archive를 엽니다.

## Entry — 프로젝트와 문서 탐색

| 파일                                  | 역할                                                |
| ------------------------------------- | --------------------------------------------------- |
| [프로젝트 README](../README.md)       | 사이트 소개, 실행 명령, 배포 경계                   |
| [AGENTS.md](../AGENTS.md)             | 에이전트 공통 원칙과 선택적 읽기 순서               |
| [CLAUDE.md](../CLAUDE.md)             | Claude Code 진입점. 공통 규칙은 AGENTS를 참조       |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | 구조·의존 관계·라우트 요약. 상세 설계의 탐색 진입점 |
| 이 파일                               | 작업별 현행 지침, 기록, 템플릿 안내                 |

## Guides — 현재 유효한 기준

| 하려는 작업                                      | 읽을 지침                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 사이트의 목적·구현 범위 판단                     | [00 목적과 범위](guides/00-vision-and-scope.md)                                                                        |
| 현재 코드와 과거 상태 구분                       | [01 현재 상태](guides/01-current-state.md)                                                                             |
| 라우트·디렉터리·의존 관계 변경                   | [02 상세 아키텍처](guides/02-target-architecture.md)                                                                   |
| 글 작성·Markdown 검증·Draft 정책                 | [03 콘텐츠 계약](guides/03-content-and-writing.md)                                                                     |
| 이전·릴리스 승인·복구                            | [04 마이그레이션 기준](guides/04-migration-plan.md), [진행 중인 계획](exec-plans/active/site-migration.md)의 해당 단계 |
| Lab 운영·실험 신뢰성                             | [05 Lab 운영 기준](guides/05-lab-practices.md)                                                                         |
| 테스트·CI·보안·개인정보                          | [06 품질과 안전](guides/06-quality-and-safety.md)                                                                      |
| 향후 기능 검토                                   | [07 향후 고려사항](guides/07-future-considerations.md) — 현재 구현 승인이 아님                                         |
| 문서·하네스 수정, 진단·리뷰·보안 점검 절차 선택 | [08 에이전트 작업과 검증](guides/08-agent-workflow.md) |
| 새 연구 계획·승인·실행·분석·Brief·이해 대화·재개 | [14 Understanding-First Lab Workflow](guides/14-engineering-lab-workflow.md)                                           |

Guides는 현재 규칙의 원본입니다. 현재 구현 사실은 실제 소스·설정을 기준으로 판단합니다. 운영 상태는 배포 시점에 별도로 확인하며 로컬 검사를 운영 검증으로 대체하지 않습니다.

## Archive — 설계 경위와 작업·검증 기록

과거 시점의 사실·제안·승인·실패·미검증을 보존합니다. **Archive 전체가 현재 실행 지침은 아닙니다.** 유효한 결정은 Guides가 참조하고, superseded 제안은 재실행하지 않습니다.

- [08 Phase 0 감사](archive/work-records/08-migration-audit-2026-10-14.md), [09 당시 실행안과 승인 경위](archive/work-records/09-migration-execution-plan-2026-10-14.md)
- [10 Phase 1 구조 이전](archive/work-records/10-phase1-migration-record-2026-10-14.md), [11 Phase 2 페이지](archive/work-records/11-phase2-pages-record-2026-10-14.md)
- [12 Phase 3 콘텐츠](archive/work-records/12-phase3-content-record-2026-10-14.md), [13 Phase 4 Go 실험](archive/work-records/13-phase4-go-lab-record-2026-10-15.md)
- [15 Harness 적용 검토](archive/work-records/15-engineering-lab-harness-review-2026-10-15.md), [16 공개·커밋 준비 점검](archive/work-records/16-precommit-review-2026-10-15.md)
- [17 Git 이력·산출물 감사](archive/work-records/17-git-artifact-audit-2026-10-24.md) — 결과 로컬 보존·브랜치 이력 정리 범위와 한계
- [18 운영 후 공개 이력·설정 감사](archive/work-records/18-post-release-privacy-audit-2026-10-25.md) — 개인정보 정리·Pages 해제·저장소 이름 변경과 잔여 한계
- [19 문서·하네스와 보안 소스 점검](archive/work-records/19-harness-security-review-2026-10-31.md) — 변경 범위별 검증·문서 CI·부분 보안 감사와 후속 개선
- [20 보안 개선과 검증](archive/work-records/20-security-improvements-2026-10-31.md) — API 자원 제한·의존성·CI/CSP·Lab 로컬 경계와 릴리스 전 잔여 검증
- [21 보안 개선 릴리스](archive/work-records/21-security-release-2026-10-31.md) — 운영/Preview 버전·CI·HTTP 확인·롤백 기준과 잔여 검증
- [22 보안 후속 개선과 관측](archive/work-records/22-security-followup-2026-11-02.md) — 동의 철회·설치 hook·Lab 경계·main 필수 검사와 잔여 관측
- [기존 포트폴리오 개편 문서](archive/portfolio-renewal/README.md) — 과거 Pages·단일 페이지 제안 포함
- [최초 모노레포 제안 진입 문서](archive/migration-proposal/00-READ-ME-FIRST.md)

기록의 로컬 산출물 경로가 원격 파일을 뜻하지는 않습니다. 공개 보류 자료와 과거 검사 범위는 각 기록의 설명을 따릅니다.

## Templates — 반복 작업 양식

| 필요한 양식                                                         | 파일                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| 승인 전 연구 계획                                                   | [research-plan.md](../templates/research-plan.md)     |
| Brief·선택적 이해 대화·근거 네 분류·진행/재개·후속 후보·사용자 회고 | [research-record.md](../templates/research-record.md) |
| 실험 기반 Lab 글 초안                                               | [experiment.md](../templates/experiment.md)           |
| 이론·학습 Lab 글 초안                                               | [lab-note.md](../templates/lab-note.md)               |
| 개인 Writing 초안                                                   | [writing.md](../templates/writing.md)                 |

계획·근거 기록은 labs에, 요청받은 글은 content에 둡니다. 글 템플릿의 날짜를 실제 날짜로 채우고 draft:true를 유지합니다. Public Git의 Draft는 비공개가 아닙니다.

## 유지 원칙

문서 하나에 하나의 역할을 둡니다. 규칙을 복제하기보다 원본을 링크하고, 이동할 때 상대 링크와 루트 기준 참조를 함께 갱신합니다. 과거 결정·실패·검증 기록은 삭제하지 않습니다. 진행 중인 계획은 `exec-plans/active/`에 유지하며 완료·보류 상태를 구분합니다.

기존 문서 체계가 참고한 외부 글은 [OpenAI의 Harness engineering](https://openai.com/index/harness-engineering/)입니다. 작은 진입점·선택적 탐색·검증·중단 기준을 채택하며 별도 에이전트 서비스를 만들지는 않습니다.
