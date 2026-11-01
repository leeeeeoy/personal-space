import contextlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import run


class RunnerSafetyTest(unittest.TestCase):
    def test_output_stays_inside_results_including_symlink_resolution(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(run, "ROOT", Path(directory)):
            root = Path(directory).resolve()
            (root / "results").mkdir()
            (root / "outside").mkdir()
            self.assertEqual(run.result_directory("results/new-run"), root / "results/new-run")
            for value in ["results", "results/../outside/new", str(root / "outside/new"), "results-other/new"]:
                with self.assertRaises(ValueError):
                    run.result_directory(value)
            (root / "results/link").symlink_to(root / "outside", target_is_directory=True)
            with self.assertRaises(ValueError):
                run.result_directory("results/link/new")

    def test_cli_does_not_accept_an_arbitrary_executable_or_start_tools_when_hey_is_missing(self):
        for args in [["--hey", "/private/tmp/untrusted-command"], ["--hey"]]:
            with patch("sys.argv", ["run.py", *args]), patch.object(run.shutil, "which", return_value=None), patch.object(run, "output") as output, patch.object(run, "start_server") as start, contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    run.main()
                self.assertEqual(error.exception.code, 2)
                output.assert_not_called()
                start.assert_not_called()

    def test_optional_hey_uses_only_the_installed_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root / "PLAN.md").write_text("synthetic plan")
            with patch.object(run, "ROOT", root), patch("sys.argv", ["run.py", "--out", "results/new-run", "--hey"]), patch.object(run.shutil, "which", return_value="/trusted/bin/hey"), patch.object(run, "output", return_value="synthetic tool metadata") as output, patch.object(run, "start_server", side_effect=RuntimeError("stop before execution")):
                with self.assertRaisesRegex(RuntimeError, "stop before execution"):
                    run.main()
                self.assertIn((["go", "version", "-m", "/trusted/bin/hey"],), [call.args for call in output.call_args_list])


if __name__ == "__main__":
    unittest.main()
