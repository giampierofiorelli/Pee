"""D-2 (F11, D-1 EL2): a validator of A-1's question format. Question terms name concepts; a number, a value with a
unit, a bound or a comparison inside a term must be written as a condition instead (REPORT.md §2, F11).

The validator only reports. Old questions are never rewritten: it counts them.

Usage: python3 question_format.py <questions.json> [...]
"""
import json
import pathlib
import re
import sys

D2 = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(D2.parent / "universe"), str(D2.parent / "s1core")]

from universe import acquisition, loader  # noqa: E402
from universe.store import Store  # noqa: E402

TERM_KEYS = ("cause", "effect", "subject", "object")


def _lexicon():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return acquisition.Lexicon(st)


def _markers(lex):
    bm = lex.lang.get("bound_markers") or {}
    words = [w for k in ("upper", "lower") for w in bm.get(k, ())] + list(lex.lang.get("comparison_markers") or ())
    return sorted({w.lower() for w in words}, key=len, reverse=True)


def term_issues(term, lex, markers=None):
    """The reasons a question term is not a plain concept name (empty when it is)."""
    if not isinstance(term, str) or not term.strip():
        return []
    t = " " + " ".join(term.lower().split()) + " "
    out = []
    if any(v.get("unit") for v in acquisition.parse_values(term, lex)):
        out.append("a value with a unit")
    elif re.search(r"\d", term):
        out.append("a number")
    for m in markers if markers is not None else _markers(lex):
        if re.search(r"(?<![\w])" + re.escape(m) + r"(?![\w])", t):
            out.append(f"a bound or comparison ({m})")
            break
    if re.search(r"\b\w+er than\b", t):
        out.append("a comparative")
    return out


def question_issues(q, lex, markers=None):
    """{term key: [reasons]} for one question in A-1's format."""
    a = q.get("ask") or {}
    if q.get("type") == "consistent":
        a = a.get("claim") or a
    out = {}
    for k in TERM_KEYS:
        r = term_issues(a.get(k), lex, markers)
        if r:
            out[k] = r
    return out


def count(questions, lex=None):
    lex = lex or _lexicon()
    mk = _markers(lex)
    rows = [{"id": q.get("id"), "issues": question_issues(q, lex, mk)} for q in questions]
    flagged = [r for r in rows if r["issues"]]
    return {"questions": len(rows), "flagged": len(flagged), "rows": flagged}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    lex = _lexicon()
    for f in sys.argv[1:]:
        d = json.loads(pathlib.Path(f).read_text())
        qs = (d.get("questions") or d.get("items")) if isinstance(d, dict) else d
        c = count(qs, lex)
        print(f"{f}: {c['flagged']} of {c['questions']} questions have a term that is not a plain concept name")
        for r in c["rows"]:
            print(" ", r["id"], r["issues"])
