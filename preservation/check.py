"""Capability-preservation check (owner decision 2026-10-23; skill pee-scientific-learning §0).

A change to a Pee reader, parser, extractor or assimilation path (``gated_paths`` of crawler-capabilities.json) must
come with a preservation record in preservation/records/*.json, changed in the same change set, that:
- names the Crawler capabilities in engine-ts/ it overlaps (every register area of every touched path);
- states what was used operationally and what was demonstrated before;
- compares the old path, the new path and a selective integration on the same inputs, with results on file, whenever
  any overlap exists;
- ends in a decision. A "blocked" decision cannot come with a change to the reader.
Imported engine-ts files can never change (PROVENANCE.json).

What this check enforces: presence, structure, coverage of areas, existence of the files named, the old/new/selective
arms, and that a comparison is more than new tests. What it cannot judge: whether the comparison is fair (same inputs,
comparable metrics, no reinterpretation of results from another evaluation), and whether the decision follows. Those
need human review; the check prints them as a checklist.

Usage (from anywhere inside the Pee work tree):
  python3 preservation/check.py --staged          # the index against HEAD (what a commit would contain)
  python3 preservation/check.py --base <ref>      # the work tree against <ref> (a branch, before pushing)
  python3 preservation/check.py --hook            # Claude Code PreToolUse hook: blocks a `git commit` that fails
Exit status: 0 compliant (or nothing gated), 1 violations (2 in hook mode, which blocks the tool call).
"""
import fnmatch
import hashlib
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
REGISTER = "preservation/crawler-capabilities.json"
RECORDS = "preservation/records/"
DECISIONS = {"reuse_engine_ts", "integrate_selectively", "extend_without_overlap",
             "replace_with_demonstrated_advantage", "blocked"}
OVERLAPS = {"none", "partial", "full"}
ARMS = {"old", "new", "selective"}

REVIEW = [
    "Same inputs for every arm, and the inputs are named (no figure carried over from another evaluation).",
    "Metrics cover fidelity, coverage, errors, conditions, attribution and conserved knowledge, as relevant.",
    "Old-path results are not reinterpreted across capabilities (prose results say nothing about tables).",
    "The decision follows from the results; a replacement shows an advantage and preserves the old capabilities.",
    "Order kept: original structure -> reading and interpretation -> fidelity check -> representation in S0/MS1.",
]


def _git(root, *args):
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, check=True).stdout


def changes_from_git(root, staged=False, base=None):
    """[(status, path)] of the change set: the index against HEAD, or the work tree against ``base``."""
    out = _git(root, "diff", "--cached" if staged else base or "HEAD", "--name-status", "--no-renames")
    rows = [tuple(line.split("\t", 1)) for line in out.splitlines() if line.strip()]
    if not staged:  # untracked files are part of the work tree
        rows += [("A", p) for p in _git(root, "ls-files", "--others", "--exclude-standard").splitlines() if p]
    return [(s[0], p) for s, p in rows]


def _sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _area_map(register, path, status):
    gp = register["gated_paths"]
    if path in gp:
        return list(gp[path])
    if status == "A":
        for d, areas in register.get("gated_new_files", {}).items():
            if d != "about" and path.startswith(d) and path.endswith(".py"):
                return list(areas)
    return None


def _exists(root, ref):
    """A results reference: a repository path, or private:<path>@<sha256> for material kept in pee-knowledge."""
    if ref.startswith("private:"):
        return bool(re.fullmatch(r"private:[^@\s]+@[0-9a-f]{64}", ref))
    return (root / ref).exists()


def _engine_file(root, ref):
    return (root / "engine-ts" / ref.split(" ")[0]).exists()


def validate_record(root, rec, register, needed):
    """Problems of one record. ``needed`` maps each gated path it must cover to the areas it must address."""
    p = []
    if rec.get("schema") != "pee.preservation.v1":
        p.append("schema must be pee.preservation.v1")
    for k in ("id", "authorisation", "justification"):
        if not str(rec.get(k) or "").strip():
            p.append(f"'{k}' is empty")
    known = {a["id"] for a in register["areas"]}
    areas = {a.get("id"): a for a in rec.get("areas") or () if isinstance(a, dict)}
    for path, want in needed.items():
        for w in want:
            if w not in areas:
                p.append(f"{path}: register area '{w}' is not addressed")
    overlap = False
    for aid, a in areas.items():
        if aid not in known:
            p.append(f"area '{aid}' is not in the register")
            continue
        if a.get("overlap") not in OVERLAPS:
            p.append(f"area '{aid}': overlap must be one of {sorted(OVERLAPS)}")
        overlap |= a.get("overlap") in ("partial", "full")
        cons = a.get("engine_ts_considered") or []
        if not cons:
            p.append(f"area '{aid}': engine_ts_considered is empty (identify the Crawler modules first)")
        for m in cons:
            if not _engine_file(root, m):
                p.append(f"area '{aid}': engine-ts/{m} does not exist")
        for k in ("used_operationally_before", "demonstrated_before"):
            if not str(a.get(k) or "").strip():
                p.append(f"area '{aid}': '{k}' is empty")
    c = rec.get("comparison") or {}
    dec = rec.get("decision")
    if dec not in DECISIONS:
        p.append(f"decision must be one of {sorted(DECISIONS)}")
    if overlap and dec != "blocked":
        if c.get("status") != "done":
            p.append("an overlapping capability exists: comparison.status must be 'done' (or the decision 'blocked')")
        if not ARMS <= set(c.get("arms") or ()):
            p.append("comparison.arms must include old, new and selective, on the same inputs")
        if not str(c.get("inputs") or "").strip():
            p.append("comparison.inputs is empty")
        if not c.get("metrics"):
            p.append("comparison.metrics is empty")
        res = c.get("results") or []
        if not res:
            p.append("comparison.results is empty")
        for r in res:
            if not _exists(root, r):
                p.append(f"comparison result '{r}' does not exist")
        if res and all(not r.startswith("private:") and re.search(r"(^|/)(tests?/|test_[^/]*\.py$)", r) for r in res):
            p.append("comparison results are only test files: passing new tests is not a preservation comparison")
    if c.get("status") == "not_needed" and overlap:
        p.append("comparison 'not_needed' is allowed only when every overlap is 'none'")
    if dec == "replace_with_demonstrated_advantage" and not str(rec.get("advantage") or "").strip():
        p.append("a replacement must state the demonstrated advantage")
    if dec == "blocked" and needed:
        p.append("decision 'blocked': the reader may not change in this change set; report the blocker instead")
    return p


def check(root, changes):
    """{'violations': [...], 'gated': {path: areas}, 'records': [...]} for a change set [(status, path)]."""
    root = pathlib.Path(root)
    register = json.loads((root / REGISTER).read_text())
    out = {"violations": [], "gated": {}, "records": []}
    prov = {f["path"]: f["sha256"] for f in json.loads((root / "engine-ts/PROVENANCE.json").read_text())["files"]}
    for st, path in changes:
        rel = path[len("engine-ts/"):] if path.startswith("engine-ts/") else None
        if rel in prov:
            f = root / path
            if not f.exists() or _sha(f) != prov[rel]:
                out["violations"].append(f"{path}: imported Crawler file changed; engine-ts code is imported unchanged")
        areas = _area_map(register, path, st)
        if areas:
            out["gated"][path] = areas
    recs = []
    for st, path in changes:
        if fnmatch.fnmatch(path, RECORDS + "*.json") and st != "D":
            try:
                recs.append((path, json.loads((root / path).read_text())))
            except (OSError, ValueError) as e:
                out["violations"].append(f"{path}: unreadable record ({e})")
    out["records"] = [p for p, _ in recs]
    covered = set()
    for path, rec in recs:
        needed = {g: a for g, a in out["gated"].items() if g in (rec.get("changed_paths") or ())}
        covered |= set(needed)
        for prob in validate_record(root, rec, register, needed):
            out["violations"].append(f"{path}: {prob}")
    for g in sorted(set(out["gated"]) - covered):
        out["violations"].append(f"{g}: reading-path change without a preservation record in {RECORDS} naming it")
    return out


def report(res):
    if not res["gated"] and not res["violations"]:
        return "preservation check: no reading-path change; nothing to check."
    lines = ["VIOLATION " + v for v in res["violations"]]
    if res["gated"]:
        lines.append("Reading paths changed: " + ", ".join(sorted(res["gated"])))
        lines.append("Human review still required (the check cannot judge these):")
        lines += [f"  - {x}" for x in REVIEW]
    lines.append("preservation check: " + ("FAILED" if res["violations"] else "passed (structure only)"))
    return "\n".join(lines)


def _hook():
    """PreToolUse hook for Bash: block a `git commit` of this repository whose change set fails."""
    try:
        data = json.load(sys.stdin)
    except ValueError:
        return 0
    cmd = (data.get("tool_input") or {}).get("command") or ""
    if not re.search(r"\bgit\b[^;&|]*\bcommit\b", cmd):
        return 0
    m = re.search(r"\bgit\s+-C\s+([^\s;&|]+)", cmd) or re.search(r"\bcd\s+([^\s;&|]+)", cmd)
    where = pathlib.Path(m.group(1)) if m else pathlib.Path(data.get("cwd") or ".")
    try:
        top = pathlib.Path(_git(where, "rev-parse", "--show-toplevel").strip())
    except (subprocess.CalledProcessError, OSError):
        return 0
    if not (top / REGISTER).exists():
        return 0  # another repository
    staged = changes_from_git(top, staged=True)
    if re.search(r"\bcommit\b[^;&|]*\s(?:--all|-[a-zA-Z]*a[a-zA-Z]*)(?:\s|$)", cmd) or \
            re.search(r"\bgit\s+add\b", cmd):  # `commit -a`, or files added in the same command
        staged += [c for c in changes_from_git(top) if c not in staged]
    res = check(top, staged)
    if res["violations"] or res["gated"]:
        print(report(res), file=sys.stderr)
    return 2 if res["violations"] else 0


def main(argv):
    if "--hook" in argv:
        return _hook()
    if "--staged" in argv:
        changes = changes_from_git(ROOT, staged=True)
    elif "--base" in argv:
        changes = changes_from_git(ROOT, base=argv[argv.index("--base") + 1])
    else:
        print(__doc__)
        return 1
    res = check(ROOT, changes)
    print(report(res))
    return 1 if res["violations"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
