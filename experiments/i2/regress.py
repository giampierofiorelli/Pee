"""I-2 regression: the spent X2 sealed questions through the I-2 path (REPORT.md section 3.2, I2-e).

The X2 set is SPENT; this is a regression, never a validation.

* The 31 pages that ground the questions' products are acquired into one store (acquisition only), and recognition
  proposes co-references between documents (never merges).
* Each question is written as items. Its property and condition are read with the SAME placement function and the
  same universe items as the documents' headers (no translation table in code). A word that no universe item explains,
  more than one kind, or a condition with no concept makes the question "not askable".
* The product is designated by its record name. Referents with exactly that identity key are found in the documents;
  if several documents designate it, the question's holder adopts explicit identity readings (assumptions) for the
  co-reference proposals, and every conclusion drawn through them is marked conditional on that assumption.
* Every verdict comes from ``contract.inquire``; the harness only maps it to the X2 labels.

Usage: python3 regress.py <structure dir> <x2 test dir> <out.json>
Outputs hold values and stay private.
"""
import glob
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core"), str(HERE)]

from universe import acquisition, contract, loader, recognition  # noqa: E402
from universe.store import Item, Store  # noqa: E402

BUYER = {"source": "X2 sealed question (spent)", "holder": "buyer", "basis": "stated requirement"}
HARNESS = {"source": "I-2 regression harness", "holder": "harness", "basis": "definition"}
LABEL = {"applies": "meets", "does not apply": "fails", "undetermined": "not_determinable"}
COMPARATORS = {"at_most": "<=", "at_least": ">=", "less_than": "<", "more_than": ">", "below": "<", "above": ">"}


def read_property(lex, text, unit):
    """The question's property read like a header: (kind, part, setting or None, reason). A setting the property
    phrase names ("standby power") is a condition of the question, exactly as in a header."""
    p = acquisition.place(text, lex, {}, unit)
    if p["unplaced"] or len(p["kinds"]) != 1 or len(p["parts"]) > 1 or len(p["settings"]) > 1 or p["entities"]:
        return None, None, None, "property not expressible with universe items: " + " ".join(p["unplaced"] or p["kinds"])
    kind = p["kinds"][0]
    if lex.kinds[kind].get("determinable") == "dimension":
        return None, None, None, f"the property names only the dimension class {kind}"
    refs = {lex.kinds[kind].get("relative_to_part")}
    parts = [x for x in p["parts"] if x not in refs]
    return kind, (parts[0] if parts else None), (p["settings"][0] if p["settings"] else None), None


def read_condition(lex, text):
    """The question's condition read like a header: (conditions, reason)."""
    if not text:
        return {}, None
    p = acquisition.place(text, lex, {}, None)
    leftover = list(p["unplaced"]) + list(p["extent"])
    if leftover or len(p["settings"]) > 1 or p["kinds"] or p["parts"]:
        return None, "condition not expressible with universe items: " + " ".join(leftover or p["kinds"] or p["parts"])
    conds = {k: list(v) for k, v in p["qconds"].items()}
    for k, vs in p["nconds"].items():
        conds[k] = vs[0]
    if p["settings"]:
        conds[lex.setting] = "V:setting:" + p["settings"][0]
    return conds, None


def referents(st, record):
    keys = {acquisition._name_key(record["name"])}
    if record.get("brand"):
        keys.add(acquisition._name_key(f"{record['brand']} {record['name']}"))
    return sorted(e.id for e in st.of("entity") if e.body.get("label") in keys and not e.body.get("whole"))


def readings_for(st, iid, ents):
    """Identity readings the question's holder adopts: every co-reference proposal between the referents its
    designation picks out in different documents."""
    out = []
    for co in st.of("content", form="co_reference"):
        a, b = co.body["relata"]
        if a in ents and b in ents:
            out.append(recognition.adopt_reading(st, iid, co.id, "buyer",
                                                 "the buyer designates one product by this name in every document"))
    return out


def run(structure_dir, test_dir, out):
    structures = sorted(glob.glob(str(pathlib.Path(structure_dir) / "*.json")))
    st = Store()
    loader.load_general_knowledge(st)
    summaries = [acquisition.acquire_document(st, json.loads(pathlib.Path(p).read_text())) for p in structures]
    cos = recognition.propose_coreference(st)
    lex = acquisition.Lexicon(st)
    td = pathlib.Path(test_dir)
    questions = json.loads((td / "questions.json").read_text())["items"]
    ref = {x["id"]: x for x in json.loads((td / "reference.json").read_text())["items"]}
    prods = {}
    for f in td.glob("*.records.json"):
        for p in json.loads(f.read_text())["products"]:
            prods[p["product_id"]] = p
    rows = []
    for q in questions:
        row = {"id": q["id"], "type": q["type"], "reference": ref[q["id"]]["verdict"]}
        unit = None
        if q["type"] == "limit" and q.get("unit"):
            vs = acquisition.parse_values(f"1 {q['unit']}", lex)
            unit = vs[0]["unit"] if vs else None
        kind, part, setting, why = read_property(lex, q["property"], unit)
        conds, why_c = read_condition(lex, q.get("conditions"))
        if setting and conds is not None:
            if conds.get(lex.setting) not in (None, "V:setting:" + setting):
                why_c = why_c or "the property and the condition name different settings"
            conds[lex.setting] = "V:setting:" + setting
        pids = [q["product_id"]] if q["type"] == "limit" else [q["p1"], q["p2"]]
        designated = [referents(st, prods[p]) for p in pids]
        if why is None and why_c is not None:
            why = why_c
        if why is None and any(not d for d in designated):
            why = "product not designated in any acquired document (exact identity key)"
        if why is None and q["type"] == "limit" and unit is None:
            why = "the buyer's bound has no readable unit"
        if why:
            row.update({"answer": "not askable", "why": why})
            rows.append(row)
            continue
        qid = f"x2i2:{q['id']}"
        iid = f"I:{qid}"
        readings = []
        for d in designated:
            readings += readings_for(st, iid, d)
        if q["type"] == "limit":
            st.acquire(Item(f"D:{qid}", "content", {"form": "class_definition", "class": f"K:{qid}", "kind": kind,
                                                     "op": COMPARATORS[q["comparator"]], "bound": q["value"],
                                                     "unit": unit}, BUYER))
            question = {"role": "bearer", "class": f"K:{qid}"}
            roles = {"bearer": designated[0][0]}
        else:
            question = {"role": "a", "compare": ["a", "b"], "kind": kind}
            roles = {"a": designated[0][0], "b": designated[1][0]}
        if part:
            question["part"] = part
        st.acquire(Item(f"Q:{qid}", "question", question, BUYER))
        st.acquire(Item(iid, "inquiry", {"question": f"Q:{qid}", "roles": roles, "conditions": conds,
                                         "scope_assumptions": [], "identity_readings": readings}, HARNESS))
        a = contract.inquire(st, iid)
        if q["type"] == "limit":
            ans = LABEL.get(a.verdict, "not_determinable")
        else:
            better = {"lower": "less", "higher": "greater"}[q["prefer"]]
            ans = ("equal" if a.value == "equal" else "p1" if a.value == better else "p2" if a.value in ("less", "greater")
                   else "not_determinable")
        used = sorted({g for g in a.grounds if g in readings} |
                      {g for p in a.proposals for g in (st.get(f"ST:{p}").body["grounds"] if st.has(f"ST:{p}") else [])
                       if g in readings})
        row.update({"answer": ans, "kind": kind, "part": part, "conditions": conds, "services": a.services,
                    "standing": a.standing, "reasons": a.reasons[:4], "grounds": a.grounds, "proposals": a.proposals,
                    "lifted": a.lifted, "readings_offered": readings, "readings_used": used,
                    "documents": sorted({st.get(e).body["document"] for d in designated for e in d})})
        rows.append(row)
    decided = {"meets", "fails", "p1", "p2", "equal"}
    for r in rows:
        ans, refv = r["answer"], r["reference"]
        if ans in decided:
            r["outcome"] = "correct decision" if ans == refv else "unjustified decision"
        elif refv in decided:
            r["outcome"] = "lost decision" + (" (not askable)" if ans == "not askable" else "")
        else:
            r["outcome"] = "correct abstention"
    counts = {}
    for r in rows:
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    from audit import audit  # the I-2 audit (extends the I-1 audit, which is unchanged)
    aud = audit(st)
    res = {"audit_pass": aud["pass"], "audit_violations": aud["violations"][:20],
           "audited_conclusions": len(aud["conclusions"]), "pages": len(structures),
           "co_reference_proposals": len(cos),
           "acquisition": {k: sum(len(s[k]) for s in summaries) for k in summaries[0]}, "counts": counts, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    r = run(*sys.argv[1:])
    print(json.dumps({k: r[k] for k in ("audit_pass", "audit_violations", "audited_conclusions", "pages", "co_reference_proposals",
                                         "acquisition", "counts")}, indent=1))
