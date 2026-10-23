"""Tests of the capability-preservation check. Run from preservation/: python3 -m unittest test_check"""
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
import check as C  # noqa: E402

READER = "experiments/universe/universe/propositions.py"
AREAS = json.loads((HERE / "crawler-capabilities.json").read_text())["gated_paths"][READER]


def area(aid, overlap="partial"):
    return {"id": aid, "overlap": overlap, "engine_ts_considered": ["src/table_interpreter1g.ts"],
            "used_operationally_before": "none", "demonstrated_before": "V1 §3.5, qualitative",
            "preserved": "compared below"}


def record(**kw):
    r = {"schema": "pee.preservation.v1", "id": "T-1", "authorisation": "owner, test", "changed_paths": [READER],
         "areas": [area(a) for a in AREAS],
         "comparison": {"status": "done", "inputs": "the same 20 tables", "arms": ["old", "new", "selective"],
                        "metrics": ["fidelity", "coverage", "conditions"], "results": ["results/cmp.json"],
                        "summary": "s"},
         "decision": "integrate_selectively", "justification": "j"}
    r.update(kw)
    return r


class Gate(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        (self.tmp / "preservation/records").mkdir(parents=True)
        shutil.copy(HERE / "crawler-capabilities.json", self.tmp / "preservation")
        os.symlink(ROOT / "engine-ts", self.tmp / "engine-ts")
        (self.tmp / "results").mkdir()
        (self.tmp / "results/cmp.json").write_text("{}")

    def run_with(self, rec, extra=()):
        changes = [("M", READER), *extra]
        if rec is not None:
            (self.tmp / "preservation/records/r.json").write_text(json.dumps(rec))
            changes.append(("A", "preservation/records/r.json"))
        return C.check(self.tmp, changes)["violations"]

    def test_simulated_violation_reader_change_without_record(self):
        v = self.run_with(None)
        self.assertEqual(v, [f"{READER}: reading-path change without a preservation record in preservation/records/ "
                             "naming it"])

    def test_compliant_change_is_accepted(self):
        self.assertEqual(self.run_with(record()), [])

    def test_every_overlapping_area_must_be_addressed(self):
        r = record(areas=[area(AREAS[0])])
        self.assertTrue(any("is not addressed" in x for x in self.run_with(r)))

    def test_new_tests_alone_are_not_a_comparison(self):
        r = record()
        r["comparison"]["results"] = ["experiments/d2/test_d2.py"]
        (self.tmp / "experiments/d2").mkdir(parents=True)
        (self.tmp / "experiments/d2/test_d2.py").write_text("")
        self.assertTrue(any("only test files" in x for x in self.run_with(r)))

    def test_the_three_arms_are_required(self):
        r = record()
        r["comparison"]["arms"] = ["new"]
        self.assertTrue(any("old, new and selective" in x for x in self.run_with(r)))

    def test_crawler_modules_must_be_identified_and_exist(self):
        r = record()
        r["areas"][0]["engine_ts_considered"] = []
        r["areas"][1]["engine_ts_considered"] = ["src/no_such_reader.ts"]
        v = self.run_with(r)
        self.assertTrue(any("engine_ts_considered is empty" in x for x in v))
        self.assertTrue(any("does not exist" in x for x in v))

    def test_no_overlap_needs_no_comparison(self):
        r = record(decision="extend_without_overlap", comparison={"status": "not_needed"},
                   areas=[area(a, "none") for a in AREAS])
        self.assertEqual(self.run_with(r), [])

    def test_a_blocked_replacement_cannot_change_the_reader(self):
        self.assertTrue(any("blocked" in x for x in self.run_with(record(decision="blocked"))))

    def test_a_replacement_states_its_advantage(self):
        v = self.run_with(record(decision="replace_with_demonstrated_advantage"))
        self.assertTrue(any("advantage" in x for x in v))

    def test_unrelated_change_is_not_gated(self):
        res = C.check(self.tmp, [("M", "experiments/d2/REPORT.md")])
        self.assertEqual((res["violations"], res["gated"]), ([], {}))

    def test_a_new_reader_module_is_gated(self):
        res = C.check(self.tmp, [("A", "experiments/universe/universe/table_reader.py")])
        self.assertEqual(len(res["violations"]), 1)


class ImportedCode(unittest.TestCase):
    def test_a_changed_imported_engine_ts_file_is_a_violation(self):
        tmp = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, tmp)
        (tmp / "preservation").mkdir()
        shutil.copy(HERE / "crawler-capabilities.json", tmp / "preservation")
        (tmp / "engine-ts/src").mkdir(parents=True)
        shutil.copy(ROOT / "engine-ts/PROVENANCE.json", tmp / "engine-ts")
        f = "src/table_acquisition1f.ts"
        shutil.copy(ROOT / "engine-ts" / f, tmp / "engine-ts" / f)
        self.assertEqual(C.check(tmp, [("M", "engine-ts/" + f)])["violations"], [])  # unchanged bytes
        with open(tmp / "engine-ts" / f, "a") as h:
            h.write("\n// rewritten\n")
        self.assertEqual(len(C.check(tmp, [("M", "engine-ts/" + f)])["violations"]), 1)


class Hook(unittest.TestCase):
    def hook(self, payload):
        p = subprocess.run([sys.executable, str(HERE / "check.py"), "--hook"], input=json.dumps(payload),
                           capture_output=True, text=True)
        return p.returncode, p.stderr

    def test_other_commands_pass_through(self):
        self.assertEqual(self.hook({"tool_input": {"command": "ls -la"}, "cwd": str(ROOT)})[0], 0)

    def test_a_commit_of_an_unrecorded_reader_change_is_blocked(self):
        tmp = pathlib.Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, tmp)

        def g(*a):
            subprocess.run(["git", "-C", str(tmp), *a], capture_output=True, check=True)
        g("init", "-q")
        g("config", "user.email", "t@example.org")
        g("config", "user.name", "t")
        (tmp / "preservation").mkdir()
        shutil.copy(HERE / "crawler-capabilities.json", tmp / "preservation")
        (tmp / "engine-ts").mkdir()
        shutil.copy(ROOT / "engine-ts/PROVENANCE.json", tmp / "engine-ts")
        reader = tmp / READER
        reader.parent.mkdir(parents=True)
        reader.write_text("# reader\n")
        g("add", "-A")
        g("commit", "-q", "-m", "base")
        reader.write_text("# reader, changed\n")
        g("add", "-A")
        code, err = self.hook({"tool_input": {"command": f"cd {tmp} && git commit -m x"}, "cwd": "/"})
        self.assertEqual(code, 2)
        self.assertIn("without a preservation record", err)
        code, _ = self.hook({"tool_input": {"command": f"git -C {tmp} commit -m x"}, "cwd": "/"})
        self.assertEqual(code, 2)
        g("reset", "-q")  # unstaged: `git add -A && git commit` is still checked
        code, _ = self.hook({"tool_input": {"command": f"cd {tmp} && git add -A && git commit -m x"}, "cwd": "/"})
        self.assertEqual(code, 2)


class History(unittest.TestCase):
    def test_the_d2_implementation_commit_would_have_been_flagged(self):
        """53ee50f changed propositions.py, recognition.py, language.json and metrology.json with no comparison
        against engine-ts: the gate reports it."""
        try:
            out = C._git(ROOT, "diff", "--name-status", "--no-renames", "0ba208d", "53ee50f")
        except subprocess.CalledProcessError:
            self.skipTest("history not available")
        changes = [(s[0], p) for s, p in (line.split("\t", 1) for line in out.splitlines())]
        res = C.check(ROOT, changes)
        self.assertIn(READER, res["gated"])
        self.assertTrue(any(READER in v for v in res["violations"]))


if __name__ == "__main__":
    unittest.main()
