"""I-1 runner: documents -> structure (Crawler, read-only) -> universe items (acquisition) -> MS1 inference -> audit.

Usage:
  python3 run_i1.py vertical <structure.json> <out.json>     the first vertical path (REPORT.md section 3.1)

Structure files come from crawler_structure.mjs. They hold page text and stay private, and so do the outputs.
Questions are written here as universe items (a question, an inquiry with its situation, and for limit checks a
class definition attributed to the buyer). Every answer comes from the MS1 contract (``contract.inquire``), which calls
the rule and model services. This file never decides anything itself.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import acquisition, contract, loader  # noqa: E402
from universe.store import Item, Store, thaw  # noqa: E402

BUYER = {"source": "I-1 question", "holder": "buyer", "basis": "stated requirement"}
USAGE = {"source": "I-1 question", "holder": "buyer", "basis": "assumption"}  # a stated usage scenario
HARNESS = {"source": "I-1 harness", "holder": "harness", "basis": "definition"}


def build(structures):
    st = Store()
    loader.load_general_knowledge(st)
    summaries = [acquisition.acquire_document(st, json.loads(pathlib.Path(p).read_text())) for p in structures]
    return st, summaries


def entity_by_label(st, label):
    hits = [e.id for e in st.of("entity") if e.body["label"] == label]
    if len(hits) != 1:
        raise KeyError(f"{label}: {len(hits)} entities")
    return hits[0]


def ask(st, qid, roles, question, conditions=None, givens=(), definition=None):
    """Write a question as items and answer it through the MS1 contract."""
    if definition is not None:
        st.acquire(Item(f"D:{qid}", "content", dict(definition, form="class_definition", **{"class": f"K:{qid}"}), BUYER))
        question = dict(question, **{"class": f"K:{qid}"})
    st.acquire(Item(f"Q:{qid}", "question", question, BUYER))
    st.acquire(Item(f"I:{qid}", "inquiry", {"question": f"Q:{qid}", "roles": roles, "conditions": conditions or {},
                                           "scope_assumptions": []}, HARNESS))
    for n, (role, kind, lo, hi, unit) in enumerate(givens):
        st.acquire(Item(f"I:{qid}:given{n}", "content", {
            "form": "quantity", "bearer": roles[role], "kind": kind, "lo": lo, "hi": hi, "unit": unit, "conditions": {},
            "scope": "invariant", "invariance": "datum of this situation", "holds_of": "individual"}, USAGE,
            {"situation": f"I:{qid}"}))
    return contract.inquire(st, f"I:{qid}")


def reaches_records(st, item_id, seen=None):
    """The record items an item's grounds reach, through standings and inference records."""
    seen = set() if seen is None else seen
    if item_id in seen or not st.has(item_id):
        return set()
    seen.add(item_id)
    it = st.get(item_id)
    if it.kind == "record":
        return {item_id}
    out = set()
    nxt = []
    if it.kind == "inference_record":
        nxt = list(it.body["premises"])
    elif st.has(f"ST:{item_id}"):
        nxt = list(st.get(f"ST:{item_id}").body["grounds"])
    for g in nxt:
        out |= reaches_records(st, g, seen)
    return out


def audit(st):
    """I1-a: every classification, comparison and inquiry-situated quantity is proposed by a rule or model service,
    and its grounds reach record items; acquisition proposed no verdict."""
    rows = []
    for c in st.of("content"):
        if c.provenance.get("basis") != "derived":
            continue
        form = c.body.get("form")
        service = c.provenance.get("source", "").replace(" service", "")
        if form in ("classification", "comparison") or (form == "quantity" and c.situating.get("situation")):
            recs = reaches_records(st, c.id)
            rows.append({"id": c.id, "form": form, "service": service, "records_reached": len(recs)})
    acq_verdicts = [c.id for c in st.of("content") if c.provenance.get("source") == "acquisition service"
                    and c.body.get("form") not in ("quantity", "attribution")]
    ok = all(r["service"] in ("rules", "model") and r["records_reached"] > 0 for r in rows) and not acq_verdicts
    return {"pass": ok, "conclusions": rows, "acquisition_non_interpretation_items": acq_verdicts}


def vertical(structure, out):
    st, (summ,) = build([structure])
    S = "C:operating_setting"
    sa = entity_by_label(st, "smart air sa600")
    other = entity_by_label(st, "winix 5500 2")
    answers = {}
    # 1. limit check (rules.classify): the subject's sound level at setting "speed 4", measured at 3 ft
    a = ask(st, "v1", {"bearer": sa}, {"role": "bearer"},
            conditions={S: "speed 4", "C:distance_to_source": [3, 3, "ft"]},
            definition={"kind": "Q:sound_level", "op": "<=", "bound": 50, "unit": "dB"})
    answers["limit_sound_level"] = a
    # 2. comparison (rules.compare): two products' sound level at the same setting ("top speed")
    a = ask(st, "v2", {"a": sa, "b": other}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"},
            conditions={S: "top speed"})
    answers["compare_sound_level"] = a
    # 3. derived quantity (model.run) inside a classification: energy used at "speed 4" over a stated 24 h
    a = ask(st, "v3", {"bearer": sa}, {"role": "bearer"}, conditions={S: "speed 4"},
            givens=[("bearer", "Q:duration", 24, 24, "h")],
            definition={"kind": "Q:energy", "op": "<=", "bound": 400, "unit": "Wh"})
    answers["derived_energy_limit"] = a
    # 4-6. one acquired content, three kinds of question: a second product's power at "top speed"
    third = entity_by_label(st, "airfanta 3pro")
    answers["reuse_limit_power"] = ask(st, "v4", {"bearer": other}, {"role": "bearer"}, conditions={S: "top speed"},
                                       definition={"kind": "Q:electric_power", "op": "<=", "bound": 60, "unit": "W"})
    answers["reuse_compare_power"] = ask(st, "v5", {"a": other, "b": third},
                                         {"role": "a", "compare": ["a", "b"], "kind": "Q:electric_power"},
                                         conditions={S: "top speed"})
    answers["reuse_derived_energy"] = ask(st, "v6", {"bearer": other}, {"role": "bearer"}, conditions={S: "top speed"},
                                          givens=[("bearer", "Q:duration", 8, 8, "h")],
                                          definition={"kind": "Q:energy", "op": "<=", "bound": 500, "unit": "Wh"})
    res = {"acquisition": {k: len(v) for k, v in summ.items()}, "audit": audit(st), "answers": {}}
    for k, a in answers.items():
        res["answers"][k] = {"verdict": a.verdict, "value": a.value, "interval": a.interval, "status": a.status,
                             "services": a.services, "standing": a.standing, "reasons": a.reasons,
                             "grounds": a.grounds, "proposals": a.proposals,
                             "records_reached": sorted(set().union(*[reaches_records(st, g) for g in a.grounds + a.proposals]))
                             if (a.grounds or a.proposals) else []}
    # reuse: acquired contents that are premises of more than one answer
    used = {}
    for k, a in answers.items():
        for g in set(a.grounds):
            if st.has(g) and st.get(g).provenance.get("source") == "acquisition service":
                used.setdefault(g, set()).add(k)
        for p in a.proposals:
            for g in st.get(f"ST:{p}").body["grounds"]:
                if st.has(g) and st.get(g).provenance.get("source") == "acquisition service":
                    used.setdefault(g, set()).add(k)
                if st.has(g) and st.get(g).kind == "inference_record":
                    for g2 in st.get(g).body["premises"]:
                        if st.has(g2) and st.get(g2).provenance.get("source") == "acquisition service":
                            used.setdefault(g2, set()).add(k)
    res["acquired_contents_used_as_premises"] = {g: sorted(v) for g, v in used.items()}
    res["event_count"] = st.seq
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "vertical":
        r = vertical(sys.argv[2], sys.argv[3])
        print(json.dumps({"audit_pass": r["audit"]["pass"], "answers": {k: (v["verdict"], v["value"], v["interval"],
              v["services"], len(v["records_reached"])) for k, v in r["answers"].items()}}, default=str, indent=1))
    else:
        sys.exit(__doc__)
