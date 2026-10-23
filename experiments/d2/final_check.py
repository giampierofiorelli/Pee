"""D-2 final check on D-1's constructed cases (REPORT.md §3): every question answered from the correct universe and
from the reader's universe, with the qualifiers D-2 adds; the evidence probes with their reasons; the question-format
counts. Constructed cases only, so the output is public.

Usage: python3 final_check.py <out.json> [questions.json ...]   (extra question files: counts only)
"""
import json
import pathlib
import sys

D2 = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(D2.parent / "d1"), str(D2)]
import audit as A  # noqa: E402
import question_format as QF  # noqa: E402
from cases import CASES  # noqa: E402
from universe import rules  # noqa: E402


def brief(r):
    out = {k: r.get(k) for k in ("answer", "why", "according_to", "standing", "informed") if r.get(k) is not None}
    if r.get("conditional_on"):
        out["conditional_on"] = [{"concept": c["label"], "values": c["values"]} for c in r["conditional_on"]]
    if r.get("readings"):
        out["readings"] = [x["answer"] for x in r["readings"]]
    if r.get("if_identical"):
        out["if_identical"] = {k: r["if_identical"].get(k) for k in ("answer", "why")}
    return out


def run(out, extra=()):
    rows = []
    for case in CASES:
        st, _, _ = A.build(case, use_reader=False)
        rst, _, _ = A.build(case, use_reader=True)
        row = {"id": case["id"], "focus": case["stage_focus"], "questions": []}
        for q in case.get("questions", ()):
            row["questions"].append({"id": q["id"], "expected": q["expected"],
                                     "correct": brief(A.harness.answer(st, q)),
                                     "reader": brief(A.harness.answer(rst, q))})
        if case.get("evidence_probe"):
            row["evidence_probe"] = {
                "expected": case["evidence_probe"]["expected"],
                "correct": [rules.evidence_assessment(st, p, "E:original_measurement") for p in rules.propositions(st)],
                "reader": [rules.evidence_assessment(rst, p, "E:original_measurement")
                           for p in rules.propositions(rst)]}
        rows.append(row)
    lex = QF._lexicon()
    fmt = {"D-1 cases": {k: v for k, v in QF.count([q for c in CASES for q in c.get("questions", ())], lex).items()}}
    for f in extra:
        d = json.loads(pathlib.Path(f).read_text())
        c = QF.count((d.get("questions") or d.get("items")) if isinstance(d, dict) else d, lex)
        fmt[pathlib.Path(f).name] = {"questions": c["questions"], "flagged": c["flagged"],
                                     "reasons": sorted({x for r in c["rows"] for v in r["issues"].values() for x in v})}
    res = {"schema": "pee.d2.final-check.v1", "cases": rows, "question_format": fmt}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False, default=sorted) + "\n")
    print(f"{len(rows)} cases written")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    run(sys.argv[1], sys.argv[2:])
