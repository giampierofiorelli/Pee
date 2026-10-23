"""D-1 observation harness (REPORT.md §1). It observes; it corrects nothing.

For each constructed case: S2 `markdown.read`; S3 the reader's units; S4 hand-written correct units through
`knowledge_acquisition.represent`, read back; S5/S6 the questions answered from the correct universe by concept ids
(rules called directly), by the question's terms (A-1's harness), and from the reader's universe by terms.

Usage: python3 audit.py <out.json>
"""
import json
import pathlib
import sys

D1 = pathlib.Path(__file__).resolve().parent
EXP = D1.parent
sys.path[:0] = [str(EXP / "universe"), str(EXP / "s1core"), str(EXP / "a1"), str(D1)]

from universe import acquisition, knowledge_acquisition as ka, loader, markdown, propositions, rules  # noqa: E402
from universe.store import Store, thaw  # noqa: E402
import answer as harness  # noqa: E402  (A-1's question harness, unchanged)
import cases  # noqa: E402


def base():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def label(st, i):
    return st.get(i).body.get("label") if i and st.has(i) else i


def read_back(st):
    out = []
    for p in rules.propositions(st):
        b = p.body
        atts = [thaw(a.body) for a in rules.attributions(st, p.id)]
        out.append({"pid": p.id, "subject": label(st, b.get("subject")), "relation": label(st, b.get("relation")),
                    "verb": b.get("verb"), "object": label(st, b.get("object")), "value": thaw(b.get("value")),
                    "polarity": b.get("polarity"), "modality": b.get("modality"),
                    "conditions": [(label(st, c.get("concept")), c.get("value")) for c in b.get("conditions") or ()],
                    "indeterminate": thaw(b.get("indeterminate")), "licensed": rules._licensed(st, p),
                    "attributions": [{k: a.get(k) for k in ("holder", "attitude", "evidence_classes", "cites",
                                                            "attributed_to", "cited_context", "norm_bearer",
                                                            "states", "statement_status", "cited_sources_examined")}
                                     for a in atts]})
    return out


def build(case, use_reader):
    # D-1 finding SD9: recognition caches its index by (id(store), store.seq); a new store can receive a freed store's
    # id and the same seq, and then reads another universe's index. The harness clears the cache for every build.
    from universe import recognition
    recognition._INDEX.clear()
    st = base()
    lex = acquisition.Lexicon(st)
    prepared, reader_units = [], []
    for d, (holder, md) in enumerate(case["docs"]):
        doc = markdown.read(md, f"document:{case['id']}:{d}", holder)
        prepared.append({"blocks": [{k: b.get(k) for k in ("kind", "ordered", "text", "cites", "codes")}
                                    for b in doc["blocks"]],
                         "tables": [[(c["row"], c["col"], c["text"]) for c in t["cells"]] for t in doc["tables"]],
                         "headings": [h["text"] for h in doc["headings"]]})
        lex = acquisition.Lexicon(st)
        units = propositions.read_propositions(doc, lex)["units"] if use_reader else \
            [u for u in case["units"] if u.get("doc", 0) == d]
        reader_units += units
        ka.represent(st, ka.read_units(doc, lex) + units, f"document:{case['id']}:{d}", holder, lex)
    return st, prepared, reader_units


def ids_for(st, term):
    """The concept ids the correct universe holds for a term, by the exact label (S5, step 1)."""
    from universe.knowledge_acquisition import _term
    t = _term(term or "")
    return {c.id for c in st.of("concept") if t and (c.body.get("label") == t or t in (c.body.get("terms") or ()))}


def by_ids(st, q):
    a, t = q["ask"], q["type"]
    conds = {}
    for c in a.get("conditions") or ():
        for i in ids_for(st, c["concept"]):
            conds.setdefault(i, set()).add(c["value"].lower())
    if t == "influence":
        return rules.influence(st, ids_for(st, a["cause"]), ids_for(st, a["effect"]), conds)
    if t == "holds":
        return rules.holds(st, ids_for(st, a["subject"]), a["relation"],
                           ids_for(st, a["object"]) if a.get("object") else None, conds)
    if t == "value":
        return rules.value(st, ids_for(st, a["subject"]), conds)
    return {"answer": "n/a by ids", "why": "status and evidence go through the harness"}


def short(r):
    return {k: r.get(k) for k in ("answer", "why", "caveats", "inference", "unresolved_terms", "designation")
            if r.get(k) not in (None, [], {})}


def run(out):
    res = []
    for case in cases.CASES:
        st, prepared, _ = build(case, use_reader=False)
        rst, _, runits = build(case, use_reader=True)
        from universe import recognition
        row = {"id": case["id"], "focus": case["stage_focus"], "S2": prepared,
               "S3": [{k: u.get(k) for k in ("subject", "relation", "object", "value", "polarity", "modality",
                                             "conditions", "document_attitude", "evidence_kind", "attributed_to",
                                             "cited_sources", "norm_bearer", "states", "statement_status")}
                      for u in runits],
               "S4_correct": read_back(st), "S4_reader": read_back(rst), "questions": []}
        for q in case.get("questions", ()):
            recognition._INDEX.clear()
            c_ids, c_terms = short(by_ids(st, q)), short(harness.answer(st, q))
            recognition._INDEX.clear()
            row["questions"].append({"id": q["id"], "expected": q["expected"], "support": q["support"],
                                     "correct_by_ids": c_ids, "correct_by_terms": c_terms,
                                     "reader_by_terms": short(harness.answer(rst, q))})
        if case.get("evidence_probe"):
            e = case["evidence_probe"]
            ps = rules.propositions(st)
            row["evidence_probe"] = {"expected": e["expected"], "support": e["support"],
                                     "correct": [rules.satisfies_evidence(st, p, "E:original_measurement")
                                                 for p in ps],
                                     "reader": [rules.satisfies_evidence(rst, p, "E:original_measurement")
                                                for p in rules.propositions(rst)]}
        res.append(row)
    pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False, default=sorted))
    print(f"{len(res)} cases written")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    run(sys.argv[1])
