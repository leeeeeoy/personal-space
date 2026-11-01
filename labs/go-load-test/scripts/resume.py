"""Resume missing baseline runs only; publish validated outputs atomically."""
import csv
import hashlib
import json
import os
from pathlib import Path
import signal
import shutil
import re
import subprocess
import time
import run

ROOT = run.ROOT
RESULTS = ROOT / "results/2026-10-14"
AUDIT = RESULTS / "resume-2026-10-15"
MISSING = [("fast", 1), ("fast", 10), ("fast", 50), ("fast", 200), ("slow", 1), ("slow", 50), ("cpu", 4)]


def atomic_json(path, value):
    temporary = path.with_name(path.name + ".tmp")
    with open(temporary, "w") as stream:
        json.dump(value, stream, indent=2); stream.write("\n"); stream.flush(); os.fsync(stream.fileno())
    os.replace(temporary, path)


def validate(path, endpoint, workers, duration):
    value = json.loads(path.read_text())
    assert value["url"] == f"http://127.0.0.1:8087/{endpoint}"
    assert value["workers"] == workers and value["requested_seconds"] == duration
    assert value["total"] > 0 and not value["interrupted"]
    assert value["elapsed_seconds"] >= duration
    assert value["total"] == value["success"] + value["http_failures"] + value["transport_failures"]
    assert value["total"] == sum(value["latency_bins"])
    assert abs(value["rps"] - value["total"] / value["elapsed_seconds"]) < 1e-8
    return value


def measure(directory, label, cmd, server, writer, phase, endpoint, workers, duration=10):
    destination = directory / (label + (".txt" if phase == "hey" else ".json"))
    if destination.exists():
        if phase != "hey": validate(destination, endpoint, workers, duration)
        else: assert "Requests/sec:" in destination.read_text() and "[200]" in destination.read_text()
        print("preserved", label, flush=True); return
    temporary = destination.with_name(destination.name + ".partial")
    if temporary.exists(): raise RuntimeError(f"preserve incomplete file before retry: {temporary}")
    progress = json.loads((AUDIT / "progress.json").read_text()) if (AUDIT / "progress.json").exists() else {}
    progress[label] = {"state": "running", "phase": phase, "argv": cmd, "env": {"GOMAXPROCS": "12"}}
    atomic_json(AUDIT / "progress.json", progress)
    before = run.sample([server.pid])[server.pid]; begin = time.monotonic()
    with open(temporary, "x") as stdout, open(directory / (label + ".stderr.txt"), "a") as stderr:
        process = subprocess.Popen(cmd, cwd=ROOT, env=run.ENV, stdout=stdout, stderr=stderr)
        try:
            while process.poll() is None:
                for pid, state in run.sample([server.pid, process.pid]).items():
                    writer.writerow({"label": label, "phase": phase, "role": "server" if pid == server.pid else "client", "elapsed_s": round(time.monotonic()-begin, 6), **state})
                time.sleep(1)
            if process.returncode: raise RuntimeError(f"{label} exited {process.returncode}; partial retained")
            stdout.flush(); os.fsync(stdout.fileno())
        finally:
            if process.poll() is None: process.terminate(); process.wait()
    after = run.sample([server.pid])[server.pid]
    metadata = {"label": label, "server_cpu_seconds_delta": after["cpu_seconds"]-before["cpu_seconds"], "sampling_wall_seconds": time.monotonic()-begin}
    if phase != "hey":
        value = validate(temporary, endpoint, workers, duration)
        print(f'{label}: {value["rps"]:.2f} RPS p95={value["p95_ms_upper_bound"]:.3f}ms p99={value["p99_ms_upper_bound"]:.3f}ms', flush=True)
    else:
        text = temporary.read_text()
        assert "Requests/sec:" in text and "[200]" in text and "Error distribution:" not in text
        print(label, "hey complete", flush=True)
    atomic_json(directory / (label + ".resources.json"), metadata)
    os.replace(temporary, destination)
    progress[label]["state"] = "complete"; atomic_json(AUDIT / "progress.json", progress)


def main():
    AUDIT.mkdir(exist_ok=True)
    if (AUDIT / "completion.json").exists():
        completed = json.loads((AUDIT / "completion.json").read_text())
        for name, checksum in completed["raw_sha256"].items():
            assert hashlib.sha256((RESULTS/name).read_bytes()).hexdigest() == checksum, name
        print("Already complete; verified raw hashes, no processes started or files replaced", flush=True)
        return
    env = json.loads((RESULTS / "environment.json").read_text())
    for path, checksum in env["source_sha256"].items():
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest() == checksum, path
    assert run.output(["go", "version"]) == env["go"]
    manifest_path = AUDIT / "preserved-sha256.json"
    if not manifest_path.exists():
        manifest = {str(p.relative_to(RESULTS)): hashlib.sha256(p.read_bytes()).hexdigest() for p in RESULTS.rglob("*") if p.is_file() and AUDIT not in p.parents}
        atomic_json(manifest_path, manifest)
    corrupt = RESULTS / "slow-c1-r3.json"
    if corrupt.exists() and corrupt.stat().st_size == 0:
        os.replace(corrupt, AUDIT / "slow-c1-r3.json.empty")
        atomic_json(AUDIT / "corrupt-record.json", {"original": "slow-c1-r3.json", "bytes": 0, "reason": "interrupted previous run; not a valid measurement", "preserved_as": "slow-c1-r3.json.empty"})
    if not (AUDIT / "environment.json").exists():
        atomic_json(AUDIT / "environment.json", {"date": "2026-10-15", "go": run.output(["go","version"]), "os": run.output(["sw_vers"]), "cpu": run.output(["sysctl","-n","machdep.cpu.brand_string"]), "memory_bytes": run.output(["sysctl","-n","hw.memsize"]), "gomaxprocs": 12, "same_machine": True, "resume_script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "note": "Continuation in a later session; ambient temperature/frequency/background load not controlled. Request/CPU/connection settings unchanged; validated atomic storage added."})
    sample_path = AUDIT / "resource-samples.csv"
    with open(sample_path, "a", newline="") as stream:
        writer=csv.DictWriter(stream,fieldnames=["label","phase","role","elapsed_s","ps_cpu_percent","rss_kib","cpu_seconds"])
        if sample_path.stat().st_size == 0: writer.writeheader()
        server, stderr, _ = run.start_server(AUDIT)
        try:
            for endpoint, workers in MISSING:
                label=f"{endpoint}-c{workers}-r3"
                if (RESULTS/(label+".json")).exists(): validate(RESULTS/(label+".json"),endpoint,workers,10); continue
                measure(AUDIT,"warm-"+label,run.load_cmd(endpoint,workers,"2s"),server,writer,"warmup",endpoint,workers,2)
                stream.flush();time.sleep(2)
                measure(RESULTS,label,run.load_cmd(endpoint,workers),server,writer,"main-resumed",endpoint,workers)
                stream.flush();time.sleep(2)
            for keep in [True,False]:
                label="aux-fast-c50-"+("reuse" if keep else "no-reuse")
                measure(AUDIT,label,run.load_cmd("fast",50,keep=keep),server,writer,"connection-comparison","fast",50)
                stream.flush();time.sleep(2)
            hey=shutil.which("hey")
            if hey:
                for endpoint,workers in [("fast",50),("slow",10),("cpu",8)]:
                    command=[str(hey),"-z","10s","-c",str(workers),"-t","2",f"http://127.0.0.1:8087/{endpoint}"]
                    measure(AUDIT,f"hey-{endpoint}-c{workers}",command,server,writer,"hey",endpoint,workers)
                    stream.flush();time.sleep(2)
        finally:
            server.send_signal(signal.SIGINT);server.wait(timeout=5);stderr.close()
        server, stderr, _ = run.start_server(AUDIT,profile=True)
        try:
            cmd=run.load_cmd("cpu",16)+["-cpu-profile",str(AUDIT/"client-cpu.pprof")]
            measure(AUDIT,"profile-cpu-c16",cmd,server,writer,"profile","cpu",16)
        finally:
            server.send_signal(signal.SIGINT);server.wait(timeout=5);stderr.close()
        for role in ["server","client"]:
            text=run.output(["go","tool","pprof","-top","-nodecount=15",str(AUDIT/(role+"-cpu.pprof"))])
            (AUDIT/(role+"-pprof-top.txt")).write_text(text+"\n")
    raw = {str(p.relative_to(RESULTS)): hashlib.sha256(p.read_bytes()).hexdigest()
           for p in RESULTS.rglob("*") if p.is_file() and (p.name.endswith(".pprof") or re.fullmatch(r"(?:fast|slow|cpu)-c\d+-r\d+\.json", p.name))}
    atomic_json(AUDIT / "completion.json", {"baseline_count": 42, "raw_sha256": raw})
    print("Missing baseline and representative auxiliary checks complete",flush=True)


if __name__ == "__main__": main()
