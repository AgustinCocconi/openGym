import importlib.util
import json
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("observation", pathlib.Path(__file__).with_name("observe-production.py"))
observation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observation)


def samples(days=8):
    first = 1700000000
    result = []
    for index in range(days * 288 + 1):
        result.append({
            "epoch": first + index * 300, "boot_id": "fixture-boot", "errors": [],
            "cpu": {"total": 10000 + index * 1000, "idle": 9000 + index * 900},
            "network": {"received_bytes": index * 100, "sent_bytes": index * 200},
            "memory_used_percent": 35, "swap_used_kib": 1024, "oom_kill": 3,
            "health_ok": True, "containers": {
                name: {"id": name, "status": "running", "health": "healthy", "restarts": 0, "oom": False, "started_at": "fixture-start"}
                for name in ("api", "web")
            },
        })
    return result


class ObservationTests(unittest.TestCase):
    def test_eight_days_and_historical_oom_baseline(self):
        report = observation.summarize(samples())
        self.assertTrue(report["eight_days_complete"])
        self.assertEqual(report["oom_kills"], 0)
        self.assertEqual(report["cpu_interval_p95_percent"], 10)
        self.assertEqual(report["network_received_bytes"], 230400)

    def test_seven_days_missing_sample_and_collection_failure_do_not_pass(self):
        self.assertFalse(observation.summarize(samples(7))["eight_days_complete"])
        incomplete = samples()
        incomplete.pop(100)
        self.assertEqual(observation.summarize(incomplete)["gaps_over_6_minutes"], 1)
        self.assertFalse(observation.summarize(incomplete)["eight_days_complete"])
        missing = samples()
        missing[100]["containers"].pop("web")
        self.assertFalse(observation.summarize(missing)["eight_days_complete"])
        missing[100]["errors"].append("web_sin_metricas")
        self.assertEqual(observation.summarize(missing)["samples_missing_metrics"], 1)

    def test_requested_window_cannot_credit_unobserved_deployment_time(self):
        data = samples()
        self.assertFalse(observation.summarize(data, data[0]["epoch"] - 300)["eight_days_complete"])
        self.assertFalse(observation.summarize(data, until=data[-1]["epoch"] + 300)["eight_days_complete"])
        with self.assertRaises(ValueError):
            observation.summarize(data, until=observation.time.time() + 3600)

    def test_oom_restarts_replacement_and_boot_are_distinct(self):
        data = samples()
        data[-1]["oom_kill"] += 1
        data[-1]["containers"]["api"]["restarts"] = 2
        data[-1]["containers"]["api"]["started_at"] = "fixture-new-start"
        data[-1]["containers"]["api"]["oom"] = True
        data[-1]["containers"]["web"]["id"] = "replacement"
        data[-1]["health_ok"] = False
        report = observation.summarize(data)
        self.assertEqual(report["container_start_changes"], 1)
        self.assertEqual((report["oom_kills"], report["container_restarts"],
                          report["container_replacements"], report["health_failures"]), (1, 2, 1, 1))
        data[-1]["boot_id"] = "reboot"
        data[-1]["cpu"] = {"total": 10, "idle": 9}
        data[-1]["oom_kill"] = 1
        self.assertEqual(observation.summarize(data)["oom_kills"], 1)
        self.assertEqual(observation.summarize(data)["boot_changes"], 1)
        self.assertEqual(observation.summarize(data)["counter_resets"], 0)

    def test_counter_reset_cannot_be_treated_as_activity(self):
        data = samples()
        data[-1]["network"]["received_bytes"] = 0
        report = observation.summarize(data)
        self.assertEqual(report["counter_resets"], 1)
        self.assertFalse(report["eight_days_complete"])

    def test_resource_parsers_exclude_guest_double_count_and_virtual_network(self):
        self.assertEqual(observation.cpu_counters("cpu 10 0 5 70 5 1 2 3 4 0\n"),
                         {"total": 96, "idle": 75})
        memory = "MemTotal: 1000 kB\nMemAvailable: 700 kB\nSwapTotal: 100 kB\nSwapFree: 40 kB\n"
        self.assertEqual(observation.memory_counters(memory),
                         {"memory_used_percent": 30, "swap_used_kib": 60})
        network = "header\nheader\neth0: 100 0 0 0 0 0 0 0 200 0\nveth0: 900 0 0 0 0 0 0 0 800 0\n"
        self.assertEqual(observation.network_counters(network, {"eth0"}),
                         {"received_bytes": 100, "sent_bytes": 200})

    def test_collector_records_failed_docker_without_reading_credentials(self):
        with patch.object(observation, "command", side_effect=OSError("fixture failure")), patch.object(
                observation.urllib.request, "urlopen", side_effect=OSError("fixture unavailable")):
            result = observation.collect(pathlib.Path("/nonexistent-fixture"), 12345)
        self.assertFalse(result["health_ok"])
        self.assertIn("api_sin_metricas", result["errors"])
        self.assertIn("web_sin_metricas", result["errors"])
        self.assertNotIn("fixture failure", json.dumps(result))


if __name__ == "__main__":
    unittest.main()