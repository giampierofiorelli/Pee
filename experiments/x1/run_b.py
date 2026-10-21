"""Run X1 arm B (or B0) over a question file and the adapter export.

Usage: python3 run_b.py <records.json> <questions.json> <answers.json> [--b0]
Both inputs and the output are private (they hold retained third-party values); keep them outside this repository.
"""
import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from pee_x1.service import ArmB, Records  # noqa: E402

HIDDEN = ("author_note", "expect")  # fields an arm must never see


def main(argv):
    if len(argv) < 4:
        sys.exit(__doc__)
    b0 = "--b0" in argv
    arm = ArmB(Records(argv[1]), with_categories=not b0)
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
        json.dump({"arm": "B0" if b0 else "B", "seconds": round(time.time() - t0, 2), "answers": out}, f,
                  ensure_ascii=False, indent=1, default=str)
    print(json.dumps({"arm": "B0" if b0 else "B", "n": len(out),
                      "errors": sum(1 for a in out if str(a.get("reason", "")).startswith("error"))}))


if __name__ == "__main__":
    main(sys.argv)
