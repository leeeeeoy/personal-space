# Go HTTP concurrency lab

## 공개 저장소 포함 범위

코드·실행 전 계획·실행/분석 도구는 커밋 준비 대상이다. **2026-10-14 결과 전체와 첫 Lab 초안은 사용자 결정으로 커밋을 보류하며 ignore한다.** 원본은 로컬에서 그대로 보존한다. pprof에는 사용자/빌드 절대 경로가, checkpoint에는 로컬 도구·출력 경로가 들어 있다. 수치를 바꾸거나 원본을 재생성하지 않았다.

따라서 아래 결과·그래프·checkpoint·프로파일 경로와 당시 검증 설명은 로컬 실행 기록을 가리키며 공개 checkout에 해당 파일이 모두 있다는 뜻은 아니다. `resume.py`·`analyze.py`는 기존 로컬 자료를 필요로 한다. 새 환경 재현은 별도 빈 출력 디렉터리와 새 승인 범위에서 수행한다. 공개용 사본·근거 링크·그래프 경로 확정은 별도 검토 사항이다.

표준 라이브러리로 만든 localhost 전용 서버와 고정 동시성 부하 도구다. 과거 Go Load Lab 원본/측정값을 복원한 프로젝트가 아니다. 실행 전 가설은 [PLAN.md](PLAN.md), 수치 원본은 results/2026-10-14 (로컬 보류: `labs/go-load-test/results/2026-10-14`), 분석은 ANALYSIS.md (로컬 보류: `labs/go-load-test/results/2026-10-14/ANALYSIS.md`)에 둔다. 첫 Lab 글은 `../../content/lab/go-http-concurrency.md`이며 검토 전까지 draft:true다.

## 구조

```text
cmd/server/main.go          # loopback 서버·종료·선택적 CPU profile
cmd/load/main.go            # CLI flags·JSON 결과
internal/lab/server.go      # /fast, /slow, /cpu
internal/lab/load.go        # Worker·Transport·bounded histogram
internal/lab/lab_test.go    # endpoint·분위수·종료/실패/연결 회귀
scripts/run.py             # 전체 실험 runner; 측정 당시 원문은 로컬 결과에 보존
scripts/resume.py          # 이번 누락 7회만 재개, atomic JSON·checkpoint
scripts/analyze.py         # 원본 검증·CSV/표/그래프 생성
scripts/test_*.py           # 저장·분석의 작은 자체 검사
results/2026-10-14/         # 35개 기존 결과 + 7개 재개 결과, 기존 파일 보존
  resume-2026-10-15/        # 재개 환경/손상 기록/자원/보조 실험/pprof
  plots/                   # rps / p95 / p99 PNG·SVG
```

## 빌드·실행

Go 1.27.2, macOS arm64에서 실행했다. Go 모듈에는 외부 의존성이 없다. rusage를 사용하는 Unix 도구이며 Windows는 검증하지 않았다. 실험 코드의 실행은 웹/Node에 의존하지 않는다.

```sh
go test ./...
go test -race ./...
go vet ./...
mkdir -p bin
go build -o bin/server ./cmd/server
go build -o bin/load ./cmd/load
GOMAXPROCS=12 ./bin/server -addr 127.0.0.1:8087
# 다른 터미널
GOMAXPROCS=12 ./bin/load -url http://127.0.0.1:8087/slow \
  -workers 10 -duration 10s -timeout 2s > result.json
```

- `/fast`: 작은 JSON. `/slow`: context 취소를 고려한 100ms timer. `/cpu`: seed의 SHA-256 이후 결과를 다시 SHA-256 하는 의존 연산 20,000회, digest를 JSON에 포함.
- URL은 숫자 loopback IP의 http만 허용하고 프록시·redirect를 사용하지 않는다. 외부 사이트는 대상이 될 수 없다.
- CLI 옵션: `-url`, `-workers`, `-duration`, `-timeout`, `-keep-alive`(기본 true), `-cpu-profile`(선택).
- server 옵션: `-addr`(기본 127.0.0.1:8087), `-cpu-profile`(선택). Ctrl-C로 종료한다.

## 측정 정의

Worker는 한 요청의 body를 끝까지 읽고 닫은 다음 다음 요청을 보낸다. Client/Transport를 공유하고 per-host 연결 한도를 Worker 수에 맞춘다. 공통 gate 후 10초 동안 요청을 시작하고 이미 시작한 요청은 완료/2초 timeout까지 drain한다. 따라서 `requested_seconds`와 `elapsed_seconds`는 다르다.

- `rps = total / elapsed_seconds`; `success_rps = success / elapsed_seconds`.
- `total = success + http_failures + transport_failures`. 2xx만 성공이다. body 읽기 실패도 transport 실패이고 `timeouts_subset`은 transport 실패에 포함된다.
- 응답시간은 요청 준비/Do/body read/close까지다. 성공·실패 모두 집계한다. 고정 도착률이 아니므로 overload 중 도착해야 했을 요청의 대기 시간은 측정하지 않는다.
- p50/p95/p99는 nearest-rank와 1µs부터 1.02배 간격의 histogram **bucket 상한**이다. 1µs 초과 구간 양자화 오차 <2%; raw bins 2048개를 저장한다. per-worker histogram 고정 크기라 요청 수에 비례해 메모리가 늘지 않는다. 개별 요청 목록은 보존하지 않았다.
- `new_connections`/`reused_connections`는 GotConn trace 집계다. histogram/trace 자체 비용도 부하 발생기의 일부다.
- client CPU는 rusage 차분/CLI elapsed, peak RSS는 해당 프로세스 lifetime의 high-water mark(KiB)다. server CPU는 ps 누적 CPU time 차분/자원 sampling wall이며 요청 구간보다 최대 약 1초 길 수 있다. server RSS는 1초 간격 샘플 최대이므로 진짜 peak를 보장하지 않는다. 두 CPU 백분율은 분모가 다르며 100%=CPU 한 개의 사용 시간에 해당한다.

## 이번 실행의 조건과 재개

Apple M2 Pro(8P+4E), 메모리 32GiB, macOS 27.0.1, Go 1.27.2. 서버/클라이언트는 같은 머신의 별도 프로세스이고 각각 GOMAXPROCS=12다. 코드/도구 버전과 hash는 environment JSON에 있다. 동일한 설정이어도 세션·온도·다른 프로그램 상태는 같다고 보장하지 않는다.

- fast c=1,10,50,100,200; slow c=1,10,50,100; cpu c=1,2,4,8,16.
- 각 조건 10초×3회. 본 측정 전 2초 warm-up + 2초 휴식, 측정 후 2초 휴식. warm-up은 별도 CLI 프로세스라 연결 pool은 본 측정에 이어지지 않는다.
- 기존 35회 결과를 그대로 두고 2026-10-15에 부족한 r3 7회만 채웠다. 재개 순서는 resume.py의 MISSING 순서다. 세션 표시는 runs.csv에 보존한다. 손상된 0바이트 slow-c1-r3는 resume 폴더의 `.empty` 파일로 보존했다.
- resumer는 `.partial`에 stdout을 쓰고 fsync·집계/조건 검증 후 os.replace한다. 완료 JSON은 재측정하지 않는다. 전체 완료 후에는 completion.json의 원본 hash만 확인하고 프로세스를 시작하지 않는다. 실제 측정에 사용한 runner 원문과 이후 저장 보호 변경/검사 오류도 resume 폴더에 보존했다. `.partial`이 남으면 자동 덮어쓰지 않고 중단하므로 실패 이유를 검토한 뒤 별도로 보존해야 한다. profile 파일 자체는 프로세스 종료 후 pprof로 읽어 유효성을 확인한다.

```sh
# 기존 디렉터리에서 누락분만 채우는 명령(완료한 이번 자료에는 재실행 불필요)
python3 scripts/resume.py
# 처음부터 새 환경에서 재현할 때만 비어 있는 별도 출력 디렉터리 사용
python3 scripts/run.py --out results/new-run --hey
# 기존 원본에서 분석만 재생성
python3 -m unittest discover -s scripts -p 'test_*.py'
python3 scripts/analyze.py
```

`--out`은 이 Lab의 `results/` 내부 새 디렉터리만 허용한다. `--hey`는 PATH에 설치한 `hey`만 사용하며 임의 실행 파일 경로를 받지 않는다. resumer도 고정된 공용 임시 경로의 실행 파일을 자동 실행하지 않는다. 변경된 runner로 기존 측정 결과를 재생성하지 않았으며, 당시 원문·도구 경로·수치는 로컬 결과에 보존한다.

분석 스크립트는 matplotlib가 필요하다. 이번에는 저장소 밖 임시 venv의 matplotlib 3.11.2를 사용했다. Go 실행에는 plotting 의존성이 필요 없다. p50/p95/p99 요약은 **각 반복의 분위수 산술평균**이며 모든 요청을 합친 분위수로 오해하지 않는다. CV는 표본 표준편차/평균×100이며 3회만으로 신뢰구간이나 원인을 주장하지 않는다.

## 보조 검증과 글 미리보기

이번에는 fast c50의 연결 on/off 각 1회, hey v0.1.4의 fast c50/slow c10/cpu c8 각 1회, cpu c16의 server/client 동시 CPU profile 1회만 수행했다. 본 42회와 합산하지 않는다. 보조 실험은 반복 통계가 아니며 본 세션 c16 r3의 원인을 소급 확정할 수 없다.

```sh
go tool pprof -top results/2026-10-14/resume-2026-10-15/server-cpu.pprof
go tool pprof -top results/2026-10-14/resume-2026-10-15/client-cpu.pprof
```

그래프는 results/plots에만 보존하고 실제 앱 public에는 복사하지 않는다. draft 렌더 검증은 임시 앱 복사본에서 parsed 글을 주입하고 그래프를 임시 public에 복사하는 방법을 사용한다. 원문/복사본 frontmatter는 모두 true로 유지하고 실제 빌드의 초안 필터는 변경하지 않는다. 공개 전에 이미지 경로·근거 링크·표현을 사용자가 검토해야 한다. Public Git에 올라간 글/결과는 draft와 무관하게 공개될 수 있다.

## 참고

- [Go net/http](https://pkg.go.dev/net/http): Client/Transport 재사용과 body 처리
- [Go runtime.GOMAXPROCS](https://pkg.go.dev/runtime#GOMAXPROCS): 동시 실행 CPU 수의 런타임 한도
- [Go diagnostics](https://go.dev/doc/diagnostics): 프로파일의 목적과 측정 비용
- [HTTP/1.1 RFC 9112 §9.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-9.3): persistent connection과 메시지 body 소비
- [hey v0.1.4 requester](https://github.com/rakyll/hey/blob/v0.1.4/requester/requester.go), [report](https://github.com/rakyll/hey/blob/v0.1.4/requester/report.go): 실행·분위수 집계 방식
