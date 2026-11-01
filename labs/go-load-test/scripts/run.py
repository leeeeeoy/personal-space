"""Sequential localhost experiment runner. Python stdlib; macOS ps sampling."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import random
import signal
import shutil
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENV = {**os.environ, "GOMAXPROCS": "12"}
CONDITIONS = [("fast", w) for w in [1, 10, 50, 100, 200]] + [("slow", w) for w in [1, 10, 50, 100]] + [("cpu", w) for w in [1, 2, 4, 8, 16]]


def output(cmd):
    return subprocess.check_output(cmd, text=True).strip()


def cpu_time(value):
    parts = value.split(":")
    return sum(float(v) * 60 ** i for i, v in enumerate(reversed(parts)))


def sample(pids):
    text = output(["ps", "-p", ",".join(map(str, pids)), "-o", "pid=,%cpu=,rss=,time="])
    return {int(row[0]): {"ps_cpu_percent": float(row[1]), "rss_kib": int(row[2]), "cpu_seconds": cpu_time(row[3])} for line in text.splitlines() if (row := line.split())}


def start_server(result_dir, profile=False):
    cmd = ["./bin/server"]
    if profile:
        cmd += ["-cpu-profile", str(result_dir / "server-cpu.pprof")]
    stderr = open(result_dir / ("profile-server.stderr.txt" if profile else "server.stderr.txt"), "w")
    server = subprocess.Popen(cmd, cwd=ROOT, env=ENV, stdout=subprocess.DEVNULL, stderr=stderr)
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError("server exited; inspect stderr")
            try:
                with urllib.request.urlopen("http://127.0.0.1:8087/fast", timeout=.2) as response:
                    if response.status == 200:
                        return server, stderr, cmd
            except OSError:
                time.sleep(.05)
        raise RuntimeError("localhost server did not start")
    except BaseException:
        server.terminate(); server.wait(); stderr.close(); raise


def measure(result_dir, label, cmd, server, monitor, commands, phase, endpoint, workers):
    before = sample([server.pid])[server.pid]
    commands.append({"label": label, "phase": phase, "endpoint": endpoint, "workers": workers, "env": {"GOMAXPROCS": "12"}, "argv": cmd})
    (result_dir / "commands.json").write_text(json.dumps(commands, indent=2) + "\n")
    suffix = ".txt" if phase == "hey" else ".json"
    with open(result_dir / (label + suffix), "w") as stdout, open(result_dir / (label + ".stderr.txt"), "w") as stderr:
        process = subprocess.Popen(cmd, cwd=ROOT, env=ENV, stdout=stdout, stderr=stderr)
        begin = time.monotonic()
        try:
            while process.poll() is None:
                states = sample([server.pid, process.pid])
                for pid, state in states.items():
                    monitor.writerow({"label": label, "phase": phase, "role": "server" if pid == server.pid else "client", "elapsed_s": round(time.monotonic() - begin, 6), **state})
                time.sleep(1)
            if process.returncode:
                raise RuntimeError(f"{label} exited {process.returncode}; retained raw outputs")
        finally:
            if process.poll() is None:
                process.terminate(); process.wait()
    after = sample([server.pid])[server.pid]
    metadata = {"label": label, "server_cpu_seconds_delta": after["cpu_seconds"] - before["cpu_seconds"], "sampling_wall_seconds": time.monotonic() - begin}
    (result_dir / (label + ".resources.json")).write_text(json.dumps(metadata, indent=2) + "\n")
    if phase != "hey":
        result = json.loads((result_dir / (label + suffix)).read_text())
        assert result["total"] == result["success"] + result["http_failures"] + result["transport_failures"]
        assert result["total"] == sum(result["latency_bins"])
        assert abs(result["rps"] - result["total"] / result["elapsed_seconds"]) < 1e-8
        print(f'{label}: {result["rps"]:.1f} RPS, p95 {result["p95_ms_upper_bound"]:.3f}ms, errors {result["http_failures"]+result["transport_failures"]}', flush=True)
    else:
        print(f"{label}: hey completed", flush=True)


def load_cmd(endpoint, workers, duration="10s", keep=True):
    return ["./bin/load", "-url", f"http://127.0.0.1:8087/{endpoint}", "-workers", str(workers), "-duration", duration, "-timeout", "2s", f"-keep-alive={str(keep).lower()}"]


def result_directory(value):
    directory = (ROOT / value).resolve()
    results = (ROOT / "results").resolve()
    if directory == results or not directory.is_relative_to(results):
        raise ValueError("output must be a new directory under this Lab's results/")
    return directory


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="results/2026-10-14")
    parser.add_argument("--hey", action="store_true", help="also run the installed hey command from PATH")
    args = parser.parse_args()
    hey = shutil.which("hey") if args.hey else None
    if args.hey and not hey:
        parser.error("--hey requires the installed hey command on PATH")
    try:
        result_dir = result_directory(args.out)
    except ValueError as error:
        parser.error(str(error))
    result_dir.mkdir(parents=True, exist_ok=False)
    environment = {
        "os": output(["sw_vers"]), "go": output(["go", "version"]), "python": output(["python3", "--version"]),
        "cpu": output(["sysctl", "-n", "machdep.cpu.brand_string"]), "logical_cpus": output(["sysctl", "-n", "hw.ncpu"]),
        "memory_bytes": output(["sysctl", "-n", "hw.memsize"]), "gomaxprocs_server_client": 12,
        "same_machine": True, "transport": "HTTP/1.1 loopback, no proxy/TLS/redirect", "cpu_iterations": 20000,
        "seed": 20261014, "warmup_s_per_condition": 2, "rest_s": 2, "admission_s": 10, "repeats": 3,
        "source_sha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ROOT.rglob("*.go"))},
        "plan_sha256": hashlib.sha256((ROOT / "PLAN.md").read_bytes()).hexdigest(),
        "hey": output(["go", "version", "-m", hey]).replace(hey, "hey") if hey else None,
    }
    (result_dir / "environment.json").write_text(json.dumps(environment, indent=2) + "\n")
    commands = []
    with open(result_dir / "resource-samples.csv", "w", newline="") as samples:
        writer = csv.DictWriter(samples, fieldnames=["label", "phase", "role", "elapsed_s", "ps_cpu_percent", "rss_kib", "cpu_seconds"])
        writer.writeheader()
        server, stderr, server_cmd = start_server(result_dir)
        commands.append({"label": "baseline-server", "argv": server_cmd, "env": {"GOMAXPROCS": "12"}})
        try:
            for round_number in range(1, 4):
                # Seeded order is experiment input, not a security token.
                order = CONDITIONS.copy(); random.Random(20261014 + round_number).shuffle(order)
                for endpoint, workers in order:
                    key = f"{endpoint}-c{workers}-r{round_number}"
                    measure(result_dir, "warm-" + key, load_cmd(endpoint, workers, "2s"), server, writer, commands, "warmup", endpoint, workers)
                    time.sleep(2)
                    measure(result_dir, key, load_cmd(endpoint, workers), server, writer, commands, "main", endpoint, workers)
                    samples.flush(); time.sleep(2)
            for repeat in range(1, 4):
                measure(result_dir, f"no-reuse-fast-c50-r{repeat}", load_cmd("fast", 50, keep=False), server, writer, commands, "no-reuse", "fast", 50)
                samples.flush(); time.sleep(2)
            if hey:
                for endpoint, workers in [("fast", 50), ("slow", 10), ("cpu", 8)]:
                    measure(result_dir, f"warm-hey-{endpoint}", load_cmd(endpoint, workers, "2s"), server, writer, commands, "warmup", endpoint, workers)
                    time.sleep(2)
                    for repeat in range(1, 4):
                        cmd = [hey, "-z", "10s", "-c", str(workers), "-t", "2", f"http://127.0.0.1:8087/{endpoint}"]
                        measure(result_dir, f"hey-{endpoint}-c{workers}-r{repeat}", cmd, server, writer, commands, "hey", endpoint, workers)
                        samples.flush(); time.sleep(2)
        finally:
            server.send_signal(signal.SIGINT); server.wait(timeout=5); stderr.close()
        server, stderr, cmd = start_server(result_dir, profile=True)
        commands.append({"label": "profile-server", "argv": cmd, "env": {"GOMAXPROCS": "12"}})
        try:
            cmd = load_cmd("cpu", 16) + ["-cpu-profile", str(result_dir / "client-cpu.pprof")]
            measure(result_dir, "profile-cpu-c16", cmd, server, writer, commands, "profile", "cpu", 16)
        finally:
            server.send_signal(signal.SIGINT); server.wait(timeout=5); stderr.close()
        for role in ["server", "client"]:
            text = output(["go", "tool", "pprof", "-top", str(result_dir / (role + "-cpu.pprof"))])
            (result_dir / (role + "-pprof-top.txt")).write_text(text + "\n")
    print("Experiment complete; raw outputs preserved in", args.out, flush=True)


if __name__ == "__main__":
    main()
