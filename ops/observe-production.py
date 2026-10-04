#!/usr/bin/env python3
"""Registro acotado del host; no lee datos, credenciales ni logs de usuarios."""
import argparse
import datetime as dt
import fcntl
import json
import os
import pathlib
import subprocess
import time
import urllib.request

UTC = dt.timezone.utc
DAY = 86400


def utc(epoch):
    return dt.datetime.fromtimestamp(epoch, UTC).isoformat().replace("+00:00", "Z")


def cpu_counters(text):
    values = list(map(int, text.splitlines()[0].split()[1:]))
    # guest/guest_nice ya estan incluidos en user/nice.
    return {"total": sum(values[:8]), "idle": values[3] + values[4]}


def memory_counters(text):
    values = {line.split(":")[0]: int(line.split()[1]) for line in text.splitlines()}
    return {
        "memory_used_percent": round(100 * (1 - values["MemAvailable"] / values["MemTotal"]), 2),
        "swap_used_kib": values["SwapTotal"] - values["SwapFree"],
    }


def network_counters(text, interfaces):
    result = {"received_bytes": 0, "sent_bytes": 0}
    for line in text.splitlines()[2:]:
        name, counters = line.split(":", 1)
        if name.strip() in interfaces:
            values = counters.split()
            result["received_bytes"] += int(values[0])
            result["sent_bytes"] += int(values[8])
    return result


def command(args):
    return subprocess.check_output(args, text=True, timeout=15, stderr=subprocess.DEVNULL).strip()


def collect(repo, port):
    proc = pathlib.Path("/proc")
    sample = {"epoch": int(time.time()), "boot_id": (proc / "sys/kernel/random/boot_id").read_text().strip(),
              "cpu": cpu_counters((proc / "stat").read_text()), "errors": []}
    sample.update(memory_counters((proc / "meminfo").read_text()))
    interfaces = {p.name for p in pathlib.Path("/sys/class/net").iterdir() if (p / "device").exists()}
    sample["network"] = network_counters((proc / "net/dev").read_text(), interfaces)
    if not interfaces:
        sample["errors"].append("red_sin_interfaz_fisica")
    sample["oom_kill"] = next(int(line.split()[1]) for line in (proc / "vmstat").read_text().splitlines()
                              if line.startswith("oom_kill "))
    sample["containers"] = {}
    template = ("{{.Id}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}"
                "{{else}}none{{end}}|{{.RestartCount}}|{{.State.OOMKilled}}|{{.State.StartedAt}}")
    for service in ("api", "web"):
        try:
            container = command(["docker", "compose", "-f", str(repo / "docker-compose.yml"),
                                 "ps", "-a", "-q", service])
            if not container or "\n" in container:
                raise ValueError("contenedor ausente/ambiguo")
            identity, status, health, restarts, oom, started = command(
                ["docker", "inspect", "--format", template, container]).split("|")
            sample["containers"][service] = {
                "id": identity, "status": status, "health": health,
                "restarts": int(restarts), "oom": oom == "true", "started_at": started,
            }
        except (OSError, ValueError, subprocess.SubprocessError):
            sample["errors"].append(service + "_sin_metricas")
    try:
        with urllib.request.urlopen("http://127.0.0.1:" + str(port) + "/api/health", timeout=5) as response:
            sample["health_ok"] = response.status == 200 and json.load(response).get("ok") is True
    except (OSError, ValueError):
        sample["health_ok"] = False
    sample["checked_utc"] = utc(sample["epoch"])
    return sample


def summarize(samples, since=None, until=None):
    if not samples:
        raise ValueError("no hay muestras")
    samples = sorted(samples, key=lambda sample: sample["epoch"])
    since = samples[0]["epoch"] if since is None else since
    until = samples[-1]["epoch"] if until is None else until
    if until < since or until > time.time():
        raise ValueError("intervalo invalido o futuro")
    selected = [sample for sample in samples if since <= sample["epoch"] <= until]
    if not selected:
        raise ValueError("no hay muestras en el intervalo")
    gaps = sum(b["epoch"] - a["epoch"] > 360 for a, b in zip(selected, selected[1:]))
    bad_health = sum(not sample["health_ok"] or any(
        c["status"] != "running" or c["health"] != "healthy"
        for c in sample["containers"].values()) for sample in selected)
    missing = sum(bool(sample["errors"]) or set(sample["containers"]) != {"api", "web"}
                  for sample in selected)
    cpus, boots, oom, restarts, replaced, starts, resets = [], 0, 0, 0, 0, 0, 0
    received, sent = 0, 0
    for previous, current in zip(selected, selected[1:]):
        if previous["boot_id"] != current["boot_id"]:
            boots += 1
            oom += current["oom_kill"]
            continue
        total = current["cpu"]["total"] - previous["cpu"]["total"]
        idle = current["cpu"]["idle"] - previous["cpu"]["idle"]
        if total > 0 and 0 <= idle <= total:
            cpus.append(100 * (1 - idle / total))
        else:
            resets += 1
        kills = current["oom_kill"] - previous["oom_kill"]
        if kills < 0:
            resets += 1
        else:
            oom += kills
        for key in ("received_bytes", "sent_bytes"):
            delta = current["network"][key] - previous["network"][key]
            if delta < 0:
                resets += 1
            elif key == "received_bytes":
                received += delta
            else:
                sent += delta
        for name, container in current["containers"].items():
            old = previous["containers"].get(name)
            if old and old["id"] != container["id"]:
                replaced += 1
            elif old:
                if container.get("started_at") != old.get("started_at"):
                    starts += 1
                delta = container["restarts"] - old["restarts"]
                if delta < 0:
                    resets += 1
                else:
                    restarts += delta
    cpus.sort()
    span = until - since
    complete = (span >= 8 * DAY and selected[0]["epoch"] == since
                and selected[-1]["epoch"] == until and gaps == 0 and missing == 0
                and resets == 0 and len(cpus) + boots == len(selected) - 1)
    return {
        "since_utc": utc(since), "until_utc": utc(until), "days": round(span / DAY, 4),
        "samples": len(selected), "gaps_over_6_minutes": gaps, "samples_missing_metrics": missing,
        "eight_days_complete": complete, "health_failures": bad_health,
        "boot_changes": boots, "oom_kills": oom,
        "samples_with_container_oom": sum(any(c["oom"] for c in s["containers"].values()) for s in selected),
        "container_restarts": restarts, "container_replacements": replaced,
        "container_start_changes": starts, "counter_resets": resets,
        "peak_memory_used_percent": max(s["memory_used_percent"] for s in selected),
        "peak_swap_used_kib": max(s["swap_used_kib"] for s in selected),
        "cpu_interval_p95_percent": round(cpus[max(0, (95 * len(cpus) + 99) // 100 - 1)], 2) if cpus else None,
        "network_received_bytes": received, "network_sent_bytes": sent,
        "oracle_idle_eligibility": "requiere metricas OCI y decision del propietario",
    }


def parse_epoch(value):
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("usar fecha UTC o con zona horaria")
    return int(parsed.timestamp())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("sample", "report"))
    parser.add_argument("--directory", default="/srv/opengym-observation")
    parser.add_argument("--repo", default="/srv/opengym")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--since", type=parse_epoch)
    parser.add_argument("--until", type=parse_epoch)
    args = parser.parse_args()
    repo, directory = pathlib.Path(args.repo).resolve(), pathlib.Path(args.directory).resolve()
    if directory == repo or repo in directory.parents or not 1 <= args.port <= 65535:
        parser.error("directorio fuera del checkout y puerto valido requeridos")
    os.umask(0o077)
    if args.action == "report":
        samples = []
        for path in sorted(directory.glob("samples-????????.jsonl")):
            samples.extend(json.loads(line) for line in path.read_text().splitlines() if line)
        result = summarize(samples, args.since, args.until)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["eight_days_complete"] else 2
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (directory / ".sample.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        sample = collect(repo, args.port)
        path = directory / ("samples-" + time.strftime("%Y%m%d", time.gmtime(sample["epoch"])) + ".jsonl")
        with path.open("a") as output:
            output.write(json.dumps(sample, separators=(",", ":")) + "\n")
            output.flush()
            os.fsync(output.fileno())
    return 1 if sample["errors"] or not sample["health_ok"] or any(
        c["status"] != "running" or c["health"] != "healthy" for c in sample["containers"].values()) else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, StopIteration) as error:
        raise SystemExit("Observacion fallida: " + str(error))