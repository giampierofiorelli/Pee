"""Run X2 arms B2-flat, B2 or B2S over a question file and the adapter export.

Usage: python3 run_b.py <records.json> <questions.json> <answers.json> --mode flat|struct|seg [--revisions file.json]
--revisions: a JSON list (or {"newRevisions": [...]}) restricting the records to those revisions.
Inputs and output are private (they hold retained third-party values); keep them outside this repository.
"""
import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from pee_x2.service import ArmB, Records  # noqa: E402

HIDDEN = ("author_note", "expect")  # fields an arm must never see
NAMES = {"flat": "B2-flat", "struct": "B2", "seg": "B2S"}


def _opt(argv, name):
    return argv[argv.index(name) + 1] if name in argv else None


def main(argv):
    mode = _opt(argv, "--mode")
    if len(argv) < 4 or mode not in NAMES:
        sys.exit(__doc__)
    revs = None
    if _opt(argv, "--revisions"):
        with open(_opt(argv, "--revisions")) as f:
            r = json.load(f)
        revs = r["newRevisions"] if isinstance(r, dict) else r
    arm = ArmB(Records(argv[1], revisions=revs), mode=mode)
    with open(argv[2]) as f:
        items = json.load(f)["items"]
    t0 = time.time()
    out = []
    for q in items:
        try:
            a = arm.answer({k: v for k, v in q.items() if k not in HIDDEN})
        except Exception as e:  # a crash is reported as an abstention with its cause, never hidden
            a = {"id": q["id"], "verdict": "not_determinable", "reason": f"error: {type(e).__name__}: {e}",
                 "grounds": []}
        out.append(a)
    with open(argv[3], "w") as f:
        json.dump({"arm": NAMES[mode], "elapsed_s": round(time.time() - t0, 2), "answers": out}, f,
                  ensure_ascii=False, indent=1, default=str)
    print(json.dumps({"arm": NAMES[mode], "n": len(out),
                      "errors": sum(1 for a in out if str(a.get("reason", "")).startswith("error"))}))


if __name__ == "__main__":
    main(sys.argv)
