"""F-1 question harness (REPORT.md section 3.2, E2-E4): answers a question set with one knowledge arm.

Arms (the code is the same in every arm; only the store's knowledge differs):
* K0: the transversal base (``load_general_knowledge(legacy=False)``);
* K1: K0 plus what the acquisition service acquires from the two taught research packages;
* KI2: K0 plus the I-2 category items entered by hand (``legacy=True``), a reference point;
* ORACLE: K0 plus the oracle annotation of the knowledge the questions rely on, written through the same
  representation step as acquisition (``knowledge_acquisition.represent``); no hand-written item enters.

Each question's documents are acquired as table structures (one product per document, attributed to its publisher);
the question is read with the same placement as document headers; the verdict comes from ``contract.inquire``. The
harness only maps verdicts to the question set's labels.

Rules fixed before the first run:
* a property phrase is askable when its placement gives exactly one kind of quantity that is a determinable of the
  bearer, no named thing and at most one part and one setting; other words are recorded, never turned into conditions;
* conditions come from the condition slots of the property phrase and from the question's and the situation's
  condition phrases (``acquisition.read_conditions``, with the
  question's kind for its influence quantities); unexplained words there are recorded;
* a situation's given ("room floor area 20 m2") is a quantity the buyer assumes for each designated product, when its
  label places exactly one kind;
* a product named in several documents is designated through identity readings the buyer adopts (I-2);
* an answer is *informed* when the property was askable and every designated product has a complete content of that
  kind; an abstention that is not informed is an uninformed abstention, never a justified one.

Usage: python3 answer.py <arm> <questions.json> <reference.json or -> <out.json> [package and oracle paths via env]
Outputs hold product values and stay private.
"""
import hashlib
import json
import os
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import acquisition, contract, knowledge_acquisition, loader, markdown, recognition  # noqa: E402
from universe.store import Item, Store  # noqa: E402

BUYER = {"source": "F-1 question", "holder": "buyer", "basis": "stated requirement"}
USAGE = {"source": "F-1 question situation", "holder": "buyer", "basis": "assumption"}
HARNESS = {"source": "F-1 question harness", "holder": "harness", "basis": "definition"}
OPS = {"at_least": ">=", "at_most": "<=", "more_than": ">", "less_than": "<"}
PKG = pathlib.Path(os.environ.get("F1_PACKAGES", "/root/.local/share/product-evidence-engine/private-eval/f1/packages"))
TAUGHT = {
    "PEE-CAT-AP-004": PKG / "PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS-COMPLETE-v1.2.0" / "PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS"
    / "PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS-v1.2-CONSOLIDATED.md",
    "PEE-CAT-DH-002": PKG / "PEE-DEHUMIDIFIERS-RESTORED-SOURCES-R01-R39" / "PEE-CATEGORY-RESEARCH-02-DEHUMIDIFIERS-ORIGINAL.md",
}
ORACLE = pathlib.Path(os.environ.get("F1_ORACLE", "/root/.local/share/product-evidence-engine/private-eval/f1/oracle"))


def base_store(arm, taught=None, oracle=None):
    st = Store()
    loader.load_general_knowledge(st, legacy=(arm == "KI2"))
    summary = {}
    if arm == "K1":
        for pid, path in (taught or TAUGHT).items():
            doc = markdown.read(pathlib.Path(path).read_text(), f"package:{pid}", f"author of {pid}")
            s = acquisition.acquire_document(st, doc)
            summary[pid] = {k: len(v) for k, v in s.get("knowledge", {}).items() if isinstance(v, list)}
    elif arm == "ORACLE":
        for name in ("oracle-AP.json", "oracle-DH.json"):
            d = json.loads(((oracle or ORACLE) / name).read_text())
            s = knowledge_acquisition.represent(st, d["units"], f"oracle:{name}", "oracle annotation")
            summary[name] = {k: len(v) for k, v in s.items() if isinstance(v, list)}
    return st, summary


def doc_structure(q, d):
    slug = re.sub(r"[^a-z0-9]+", "-", d["publisher"].lower()).strip("-")
    url = f"https://{slug}.example/{q['id']}/{d['id']}"
    tables = []
    for i, t in enumerate(d["tables"]):
        cells = []
        for r, row in enumerate(t["rows"]):
            for c, text in enumerate(row):
                cells.append({"row": r, "col": c, "rowspan": 1, "colspan": 1, "header": r == 0, "scope": None,
                              "text": str(text), "links": [], "locator": f"{d['id']} table {i} row {r} col {c}"})
        tables.append({"index": i, "locator": f"{d['id']} table {i}", "caption": t.get("caption"), "sectionPath": [],
                       "headingPath": [t["caption"]] if t.get("caption") else [], "cells": cells})
    body = json.dumps(d, sort_keys=True)
    return {"url": url, "sha256": hashlib.sha256(body.encode()).hexdigest(), "names": [
        {"text": d["product"], "source": "json-ld-product"}], "headings": [], "blocks": [], "tables": tables,
        "sourceTypeOperatorAsserted": d.get("publisher_role")}


def read_property(lex, text):
    p = acquisition.place(text, lex, {}, None)
    if len(p["kinds"]) != 1 or p["entities"] or len(p["parts"]) > 1 or len(p["settings"]) > 1:
        return None, None, None, f"property not placed as one kind ({len(p['kinds'])} kinds)", p["unplaced"], {}
    kind = p["kinds"][0]
    if lex.kinds[kind].get("determinable") == "dimension":
        return None, None, None, f"the property names only the dimension class {kind}", p["unplaced"], {}
    refs = {lex.kinds[kind].get("relative_to_part")}
    parts = [x for x in p["parts"] if x not in refs]
    conds = {k: list(v) for k, v in p["qconds"].items()}
    for k, vs in p["nconds"].items():
        conds[k] = vs[0]
    return kind, (parts[0] if parts else None), (p["settings"][0] if p["settings"] else None), None, p["unplaced"], conds


def read_given(lex, text):
    vals = acquisition.parse_values(text, lex)
    if len(vals) != 1 or not vals[0]["unit"] or len(vals[0]["numbers"]) != 1:
        return None
    v = vals[0]
    label = (text[:v["start"]] + " " + text[v["end"]:]).strip(" :-")
    p = acquisition.place(label, lex, {}, v["unit"])
    if len(p["kinds"]) != 1:
        return None
    n = v["numbers"][0][0]
    return p["kinds"][0], n, n, v["unit"]


def answer(base, q):
    st = base.at(base.seq)
    docs = [doc_structure(q, d) for d in q["documents"]]
    for d in docs:
        acquisition.acquire_document(st, d)
    recognition.propose_coreference(st)
    lex = acquisition.Lexicon(st)
    qq = q["question"]
    row = {"id": q["id"], "type": qq["type"]}
    kind, part, setting, why, extra_words, pconds = read_property(lex, qq["property"])
    row["property_unplaced"] = extra_words
    if why:
        row.update({"answer": "undetermined", "askable": False, "why": why, "informed": False})
        return row
    conds, left = dict(pconds), []  # conditions the property phrase places are the question's (as in a header)
    for text in (qq.get("conditions"), q["situation"].get("conditions")):
        c, l = acquisition.read_conditions(text or "", lex, kind)
        for k, v in c.items():
            conds.setdefault(k, v)
        left += l
    if setting:
        conds.setdefault(lex.setting, "V:setting:" + setting)
    row.update({"kind": kind, "part": part, "conditions": conds, "conditions_unplaced": left})
    names = [qq["product"]] if qq["type"] == "limit" else (
        [qq["p1"], qq["p2"]] if qq["type"] == "compare" else list(qq["products"]))
    designated = []
    for n in names:
        key = acquisition._name_key(n)
        designated.append(sorted(e.id for e in st.of("entity") if e.body.get("label") == key and not e.body.get("whole")))
    if any(not d for d in designated):
        row.update({"answer": "undetermined", "askable": False, "why": "product not designated", "informed": False})
        return row
    qid = f"f1:{q['id']}"
    iid = f"I:{qid}"
    readings = []
    for ents in designated:
        for co in st.of("content", form="co_reference"):
            a, b = co.body["relata"]
            if a in ents and b in ents:
                readings.append(recognition.adopt_reading(st, iid, co.id, "buyer",
                                                          "the buyer designates one product by its name"))
    roles = {f"r{i}": ents[0] for i, ents in enumerate(designated)}
    givens = []
    for g in q["situation"].get("givens") or []:
        r = read_given(lex, g)
        row.setdefault("givens_read", []).append(bool(r))
        if r:
            givens.append(r)
    for n, (k, lo, hi, unit) in enumerate(givens):
        for role, ent in roles.items():
            st.acquire(Item(f"{iid}:g{n}:{role}", "content", {
                "form": "quantity", "bearer": ent, "kind": k, "lo": lo, "hi": hi, "unit": unit, "conditions": {},
                "scope": "invariant", "invariance": "datum of this situation", "holds_of": "individual"}, USAGE,
                {"situation": iid}))
    if qq["type"] == "limit":
        uv = acquisition.parse_values(f"1 {qq['unit']}", lex)
        unit = uv[0]["unit"] if uv else None
        if unit is None or qq.get("comparator") not in OPS:
            row.update({"answer": "undetermined", "askable": False, "why": "the bound has no readable unit or comparator",
                        "informed": False})
            return row
        st.acquire(Item(f"D:{qid}", "content", {"form": "class_definition", "class": f"K:{qid}", "kind": kind,
                                                 "op": OPS[qq["comparator"]], "bound": qq["value"], "unit": unit}, BUYER))
        question = {"role": "r0", "class": f"K:{qid}"}
    elif qq["type"] == "compare":
        question = {"role": "r0", "compare": ["r0", "r1"], "kind": kind}
    else:
        question = {"role": "r0", "select": sorted(roles), "kind": kind, "prefer": qq["prefer"]}
    if part:
        question["part"] = part
    st.acquire(Item(f"Q:{qid}", "question", question, BUYER))
    st.acquire(Item(iid, "inquiry", {"question": f"Q:{qid}", "roles": roles, "conditions": conds,
                                     "scope_assumptions": [], "identity_readings": readings}, HARNESS))
    a = contract.inquire(st, iid)
    if qq["type"] == "limit":
        ans = {"applies": "meets", "does not apply": "fails"}.get(a.verdict, "undetermined")
    elif qq["type"] == "compare":
        better = {"lower": "less", "higher": "greater"}[qq["prefer"]]
        ans = ("equal" if a.value == "equal" else "p1" if a.value == better else "p2"
               if a.value in ("less", "greater") else "undetermined")
    else:
        inv = {v: k for k, v in roles.items()}
        ans = names[int(inv[a.value][1:])] if a.value in inv else "undetermined"
    complete = []
    for ents in designated:
        ok = any(c.body.get("bearer") in ents and c.body.get("kind") == kind and not c.body.get("incomplete")
                 for c in st.of("content", form="quantity") if c.provenance.get("source") == "acquisition service")
        complete.append(ok)
    row.update({"answer": ans, "askable": True, "informed": all(complete), "verdict": a.verdict, "value": a.value,
                "standing": a.standing, "services": a.services, "reasons": a.reasons[:6], "grounds": a.grounds,
                "readings": readings})
    return row


DECIDED = lambda x: x not in (None, "undetermined")  # noqa: E731


def outcome(row, ref):
    ans = row["answer"]
    if DECIDED(ans):
        return "correct decision" if ans == ref else "unjustified decision"
    if DECIDED(ref):
        return "lost decision" if row.get("informed") else "lost decision (uninformed)"
    return "justified abstention" if row.get("informed") else "uninformed abstention"


def run(arm, questions, reference, out):
    base, summary = base_store(arm)
    items = json.loads(pathlib.Path(questions).read_text())["items"]
    ref = {}
    if reference != "-":
        ref = {x["id"]: x["expected"] for x in json.loads(pathlib.Path(reference).read_text())["items"]}
    rows = []
    for q in items:
        try:
            row = answer(base, q)
        except Exception as e:  # noqa: BLE001 - an exception is a failure of the question, recorded, never hidden
            row = {"id": q["id"], "answer": "undetermined", "askable": False, "informed": False,
                   "why": f"error: {type(e).__name__}: {e}"}
        if q["id"] in ref:
            row["reference"] = ref[q["id"]]
            row["outcome"] = outcome(row, ref[q["id"]])
        rows.append(row)
    counts = {}
    for r in rows:
        counts[r.get("outcome", "-")] = counts.get(r.get("outcome", "-"), 0) + 1
    res = {"arm": arm, "knowledge": summary, "counts": counts, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    r = run(*sys.argv[1:])
    print(json.dumps({"arm": r["arm"], "knowledge": r["knowledge"], "counts": r["counts"]}, indent=1))
