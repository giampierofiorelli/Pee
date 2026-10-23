"""A-1 measure F: answer the sealed questions in a new process that can open no document.

The process installs a Python audit hook before importing Pee. Every file open is checked against an allowlist: the
Python installation, Pee's code and base knowledge, the snapshot and its manifest, the question file and the output.
Any other open is refused (PermissionError) and logged, so "no access to the document" is enforced and recorded, not
assumed. The answers are compared row by row with the answers of the assimilating process.

Usage: python3 independence.py <snapshot> <questions.json> <inprocess answers.json> <out.json>
"""
import json
import os
import pathlib
import sys
import sysconfig

HERE = pathlib.Path(__file__).resolve().parent
EXP = HERE.parent
ALLOWED_DIRS = [pathlib.Path(p).resolve() for p in {sysconfig.get_paths()[k] for k in ("stdlib", "platstdlib",
                                                                                         "purelib", "platlib")}]
ALLOWED_DIRS += [HERE, EXP / "universe", EXP / "s1core", pathlib.Path(sys.prefix).resolve(),
                 pathlib.Path(sys.base_prefix).resolve()]
opened, refused = set(), []


def _install(files):
    allowed = {pathlib.Path(f).resolve() for f in files}

    def hook(event, args):
        if event != "open" or not args or not isinstance(args[0], (str, bytes, os.PathLike)):
            return
        p = pathlib.Path(os.fsdecode(args[0])).resolve()
        if p in allowed or any(p == d or d in p.parents for d in ALLOWED_DIRS) or str(p).startswith("/dev/"):
            opened.add(str(p))
            return
        refused.append(str(p))
        raise PermissionError(f"A-1 independence run: {p} is outside the allowlist")

    sys.addaudithook(hook)


def main(snapshot, questions, inprocess, out):
    files = [snapshot, str(snapshot) + ".manifest.json", questions, out]
    _install(files)
    sys.path[:0] = [str(HERE), str(EXP / "universe"), str(EXP / "s1core")]
    import answer  # noqa: E402  (imported after the hook)
    res = answer.run(snapshot, questions, out)
    # probe: the documents named in A1_PROBE (working copies, originals) must be unreadable from this process
    probes = {}
    for f in filter(None, os.environ.get("A1_PROBE", "").split(":")):
        try:
            open(f, "rb").close()
            probes[pathlib.Path(f).name] = "READABLE"
        except PermissionError:
            probes[pathlib.Path(f).name] = "refused"
    res["probes"] = probes
    return res, files


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    snap, qs, inproc, out = sys.argv[1:]
    inproc_rows = json.loads(pathlib.Path(inproc).read_text())["rows"]  # read before the hook is installed
    res, files = main(snap, qs, inproc, out)
    key = ("id", "answer", "outcome")
    same = [all(a.get(k) == b.get(k) for k in key) for a, b in zip(res["rows"], inproc_rows)]
    res["independence"] = {"pid": os.getpid(), "refused_opens": refused,
                           "opened_outside_code": sorted(p for p in opened if p in {str(pathlib.Path(f).resolve())
                                                                                    for f in files}),
                           "rows": len(res["rows"]), "identical_to_inprocess": sum(same),
                           "differing": [r.get("id") for r, s in zip(res["rows"], same) if not s]}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=sorted))
    print(json.dumps({"counts": res["counts"], **res["independence"]}, indent=1))
