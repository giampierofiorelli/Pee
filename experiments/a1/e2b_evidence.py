"""A-1 regression of the evidence requirement on F-1's E2b gold set (spent material; regression only).

F-1's E2b harness (``experiments/f1/gold.py``, unchanged) builds the inquiry without the question's evidence
requirement, so its rules answered two "independently measured" questions from declarations (Q-AP-24, Q-DH-27). This
runner reuses that harness unchanged and only adds the question's ``requires_evidence`` to the inquiry it builds; the
A-1 rule (``rules.applicable``) then refuses contents whose attributions do not provide that evidence.

Usage: python3 e2b_evidence.py <gold.json> <reference.json> <out.json>
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "f1"), str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

import gold  # noqa: E402  (F-1 harness, unchanged)
from universe.store import Item  # noqa: E402

_current = {}


def _item(iid, kind, body, provenance, situating=None):
    if kind == "inquiry" and _current.get("requires_evidence"):
        body = dict(body, requires_evidence=_current["requires_evidence"])
    return Item(iid, kind, body, provenance, situating or {})


def run(gold_path, reference, out):
    gold.Item = _item
    items = json.loads(pathlib.Path(gold_path).read_text())["items"]
    orig = gold.answer

    def answer(base, it):
        _current["requires_evidence"] = (it.get("question") or {}).get("requires_evidence")
        return orig(base, it)

    gold.answer = answer
    return gold.run(gold_path, reference, out)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    print(json.dumps(run(*sys.argv[1:]), indent=1))
