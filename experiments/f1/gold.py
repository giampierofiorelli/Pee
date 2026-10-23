"""F-1 E2b: the rules given complete and correct representation (the owner's correction: "sa ma non ragiona" must be
checked by giving Pee knowledge already correctly represented).

E2 as first run (``answer.py`` with the ORACLE arm) gave the rules correct category knowledge but still made Pee read
every product sheet and question, so reading and reasoning were mixed. Here nothing is read: an independent annotator
wrote each question's documents, situation, question and the package knowledge they need in a structured form
(``gold-representation-format.md``), and this harness turns it into universe items mechanically, in the forms the
acquisition service writes (kinds, influence relations, models through ``knowledge_acquisition.represent``; records,
attributions and quantity contents through ``acquisition._propose``). Every verdict comes from ``contract.inquire``.

Written after the E2 first run and its diagnosis; run on freeze 1 (no service changed). The question sets were spent by
that diagnosis; this is a first run of the rules on this representation, not a held-out validation.

Usage: python3 gold.py <gold.json> <reference.json> <out.json>
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core"), str(HERE)]

from s1core import units  # noqa: E402
from universe import acquisition, contract, knowledge_acquisition as ka, loader, recognition  # noqa: E402
from universe.store import Item, Store  # noqa: E402

from answer import BUYER, HARNESS, OPS, USAGE, outcome  # noqa: E402,F401

GOLD = {"source": "F-1 gold representation", "holder": "gold annotator", "basis": "document statement"}


def unit_id(u):
    if u in units.UNITS:
        return u
    for k, ss in units.SURFACES.items():
        if u in ss:
            return k
    return None


def build(base, it):
    st = base.at(base.seq)
    lex = acquisition.Lexicon(st)
    url = f"gold:{it['id']}"
    notes = []
    kunits = []
    for q in it.get("quantities", ()):
        u = unit_id(q.get("unit"))
        if u is None:
            notes.append(f"unit not in metrology: {q.get('unit')}")
            continue
        surf = (units.SURFACES.get(u) or (u,))[0] if units.SURFACES.get(u) else u
        kunits.append({"type": "kind", "symbol": q["name"], "name": q["name"], "unit": surf, "family": None,
                       "depends_on": [], "where": f"{it['id']} quantities"})
    rel_units = []
    for r in it.get("relations", ()):
        if r.get("type") == "formula":
            rel_units.append({"type": "formula", "target": r["target"], "expression": r["expression"],
                              "kind": "definition", "where": f"{it['id']} relations"})
        elif r.get("type") == "distinct":
            rel_units.append({"type": "distinct", "a": r["a"], "b": r["b"], "where": f"{it['id']} relations"})
    ka.represent(st, kunits + rel_units, url, "gold annotator", lex)
    kinds = {}
    for k in st.of("quantity_kind"):
        if k.body.get("document") == url:
            for s in k.body.get("symbols", ()):
                kinds[s] = k.id
    for q in it.get("quantities", ()):  # one-letter names are no symbols: find them by label
        if q["name"] not in kinds:
            hit = [k.id for k in st.of("quantity_kind") if k.body.get("document") == url and k.body.get("label") == q["name"]]
            if hit:
                kinds[q["name"]] = hit[0]
    lex = acquisition.Lexicon(st)
    named = {}
    for nc in it.get("named_conditions", ()):
        cid = f"C:{url}:{nc['name']}"
        st.acquire(Item(cid, "concept", {"label": nc["name"], "category": "condition", "value_type": "named"}, GOLD))
        named[nc["name"]] = cid
        for v in nc.get("values", ()):
            st.acquire(Item(f"V:{url}:{nc['name']}:{v}", "concept", {"label": v, "category": "condition value",
                                                                     "of": cid, "terms": [v]}, GOLD))
    for q in it.get("quantities", ()):
        for d in q.get("depends_on", ()):
            obj = kinds.get(d) or named.get(d) or (lex.setting if d in ("mode", "operating_mode", "setting") else None)
            if q["name"] in kinds and obj:
                acquisition._propose(st, {"form": "relation", "relation": lex.influence, "subject": kinds[q["name"]],
                                          "object": obj}, [], "gold: the quantity depends on this (an influence quantity)")
            elif q["name"] in kinds:
                notes.append(f"dependency not representable: {q['name']} on {d}")
    lex = acquisition.Lexicon(st)

    def conds_of(c, setting, nm):
        out = {}
        for name, v in (c or {}).items():
            if name in kinds and isinstance(v, list) and len(v) == 2 and unit_id(v[1]):
                out[kinds[name]] = [v[0], v[0], unit_id(v[1])]
            elif name in named:
                out[named[name]] = f"V:{url}:{name}:{v}"
            else:
                notes.append(f"condition not representable: {name}")
        for name, v in (nm or {}).items():
            if name in named:
                out[named[name]] = f"V:{url}:{name}:{v}"
        if setting:
            out[lex.setting] = "V:setting:" + str(setting).lower()
        return out
    ents = {}
    for d in it.get("documents", ()):
        durl = f"{url}/{d['id']}"
        key = acquisition._name_key(d["product"])
        eid = f"E:{durl}"
        st.acquire(Item(eid, "entity", {"label": key, "document": durl}, dict(GOLD, holder=d.get("publisher_role"))))
        ents.setdefault(key, []).append(eid)
        src = {"source": durl, "holder": d.get("publisher_role") or "publisher", "basis": "document statement"}
        scope = f"T:{durl}"
        for n, r in enumerate(d.get("rows", ())):
            k = kinds.get(r.get("quantity"))
            u = unit_id(r.get("unit"))
            if k is None or u is None or r.get("value") is None:
                notes.append(f"row not representable: {r.get('quantity')} {r.get('unit')}")
                continue
            rid = f"R:{durl}:{n}"
            st.acquire(Item(rid, "record", {"form": "gold row", "row": r}, src))
            aid = acquisition._propose(st, {"form": "attribution", "holder": src["holder"], "reports": rid,
                                            "source_type_operator_asserted": d.get("publisher_role"),
                                            "evidence": d.get("evidence")}, [rid], "gold: the source reports this row")
            lo, hi = (r["value"], r["value"]) if not isinstance(r["value"], list) else tuple(r["value"])
            if r.get("bound") == "upper":
                lo = None
            elif r.get("bound") == "lower":
                hi = None
            c = conds_of(r.get("conditions"), r.get("setting"), r.get("named"))
            methods = []
            if r.get("method"):
                mid = f"MT:{durl}:{acquisition._name_key(r['method'])}"
                if not st.has(mid):
                    st.acquire(Item(mid, "method", {"label": r["method"], "category": "test standard"}, src))
                methods.append(mid)
            defining = lex.kinds.get(k, {}).get("defining_conditions", [])
            unspecified = {x: scope for x in defining if x not in c}
            if not methods:
                unspecified["method"] = scope
            body = {"form": "quantity", "bearer": eid, "kind": k, "lo": lo, "hi": hi, "unit": u, "conditions": c,
                    "scope": "conditional" if c else "invariant",
                    "invariance": None if c else "value stated by the source without conditions",
                    "holds_of": "individual", "interprets": rid, "approximate": False, "extent": None,
                    "interval": "variation" if isinstance(r["value"], list) else "measurement", "methods": methods,
                    "unspecified": unspecified}
            acquisition._propose(st, body, [rid, aid] + methods, "gold: the row's value, placed")
    return st, kinds, named, ents, notes, conds_of


def answer(base, it):
    st, kinds, named, ents, notes, conds_of = build(base, it)
    qq = it["question"]
    row = {"id": it["id"], "type": qq["type"], "notes": notes, "requires_evidence": qq.get("requires_evidence")}
    kind = kinds.get(qq.get("quantity"))
    if kind is None:
        row.update({"answer": "undetermined", "why": "question quantity not represented", "informed": False})
        return row
    recognition.propose_coreference(st)
    names = [qq["product"]] if qq["type"] == "limit" else ([qq["p1"], qq["p2"]] if qq["type"] == "compare"
                                                           else list(qq.get("products") or []))
    designated = [ents.get(acquisition._name_key(n), []) for n in names]
    if any(not d for d in designated):
        row.update({"answer": "undetermined", "why": "product not designated", "informed": False})
        return row
    qid = f"gold:{it['id']}"
    iid = f"I:{qid}"
    readings = []
    for es in designated:
        for co in st.of("content", form="co_reference"):
            a, b = co.body["relata"]
            if a in es and b in es:
                readings.append(recognition.adopt_reading(st, iid, co.id, "buyer", "the buyer means one product"))
    # a single-product question names its role "bearer", the role models bind their variables to (s1core)
    roles = {"bearer": designated[0][0]} if qq["type"] == "limit" else {f"r{i}": es[0] for i, es in enumerate(designated)}
    sit = it.get("situation") or {}
    conds = conds_of(sit.get("conditions"), sit.get("setting"), sit.get("named"))
    for k, v in conds_of(qq.get("conditions"), qq.get("setting"), qq.get("named")).items():
        conds.setdefault(k, v)
    for n, g in enumerate(sit.get("givens") or ()):
        k, u = kinds.get(g.get("quantity")), unit_id(g.get("unit"))
        if k is None or u is None:
            notes.append(f"given not representable: {g.get('quantity')}")
            continue
        for role, ent in roles.items():
            st.acquire(Item(f"{iid}:g{n}:{role}", "content", {
                "form": "quantity", "bearer": ent, "kind": k, "lo": g["value"], "hi": g["value"], "unit": u,
                "conditions": {}, "scope": "invariant", "invariance": "datum of this situation",
                "holds_of": "individual"}, USAGE, {"situation": iid}))
    if qq["type"] == "limit":
        u = unit_id(qq.get("unit"))
        if u is None or qq.get("comparator") not in OPS:
            row.update({"answer": "undetermined", "why": "bound not representable", "informed": False})
            return row
        st.acquire(Item(f"D:{qid}", "content", {"form": "class_definition", "class": f"K:{qid}", "kind": kind,
                                                 "op": OPS[qq["comparator"]], "bound": qq["value"], "unit": u}, BUYER))
        question = {"role": "bearer", "class": f"K:{qid}"}
    elif qq["type"] == "compare":
        question = {"role": "r0", "compare": ["r0", "r1"], "kind": kind}
    else:
        question = {"role": "r0", "select": sorted(roles), "kind": kind, "prefer": qq["prefer"]}
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
    row.update({"answer": ans, "informed": True, "verdict": a.verdict, "value": a.value, "standing": a.standing,
                "services": a.services, "reasons": a.reasons[:6], "grounds": a.grounds, "conditions": conds})
    return row


def run(gold, reference, out):
    base = Store()
    loader.load_general_knowledge(base, legacy=False)
    items = json.loads(pathlib.Path(gold).read_text())["items"]
    ref = {x["id"]: x["expected"] for x in json.loads(pathlib.Path(reference).read_text())["items"]}
    rows = []
    for it in items:
        try:
            row = answer(base, it)
        except Exception as e:  # noqa: BLE001 - recorded, never hidden
            row = {"id": it["id"], "answer": "undetermined", "informed": False, "why": f"error: {type(e).__name__}: {e}"}
        row["reference"] = ref.get(it["id"])
        row["outcome"] = outcome(row, row["reference"])
        rows.append(row)
    counts = {}
    for r in rows:
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    pathlib.Path(out).write_text(json.dumps({"counts": counts, "rows": rows}, indent=1, default=str))
    return counts


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    print(json.dumps(run(*sys.argv[1:]), indent=1))
