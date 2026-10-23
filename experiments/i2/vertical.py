"""I-2 vertical increment (REPORT.md section 3.1) on authentic structures from four publishers (all spent):
HouseFresh (two reviews), Air Purifier First (a buying guide with per-product tables), Oransi (a CADR explainer with
products in rows) and Notebookcheck (a robot vacuum review with a feature/model table).

Questions are written here as items; every answer comes from ``contract.inquire``. The harness never decides.

Usage: python3 vertical.py <dir with A-hf2, C-ap5, C-rv4, O-or1> <dir with A-hf3> <out.json>
Outputs hold values and stay private.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core"), str(HERE)]

from audit import audit  # noqa: E402
from universe import acquisition, contract, loader, recognition, rules  # noqa: E402
from universe.store import Item, Store  # noqa: E402

BUYER = {"source": "I-2 vertical question", "holder": "buyer", "basis": "stated requirement"}
USAGE = {"source": "I-2 vertical question", "holder": "buyer", "basis": "assumption"}
HARNESS = {"source": "I-2 vertical harness", "holder": "harness", "basis": "definition"}
S, D, TM = "C:operating_setting", "C:distance_to_source", "C:test_material"


def ref(st, label, doc_part):
    hits = [e.id for e in st.of("entity") if e.body.get("label") == label and doc_part in e.body.get("document", "")
            and not e.body.get("whole")]
    if len(hits) != 1:
        raise KeyError(f"{label} in {doc_part}: {len(hits)}")
    return hits[0]


def ask(st, qid, roles, q, conditions=None, definition=None, givens=(), **inquiry):
    if definition:
        st.acquire(Item(f"D:{qid}", "content", dict(definition, form="class_definition", **{"class": f"K:{qid}"}), BUYER))
        q = dict(q, **{"class": f"K:{qid}"})
    st.acquire(Item(f"Q:{qid}", "question", q, BUYER))
    for n, (role, kind, lo, hi, unit) in enumerate(givens):
        st.acquire(Item(f"I:{qid}:g{n}", "content", {"form": "quantity", "bearer": roles[role], "kind": kind, "lo": lo,
                                                    "hi": hi, "unit": unit, "conditions": {}, "scope": "invariant",
                                                    "invariance": "datum of this situation", "holds_of": "individual"},
                        USAGE, {"situation": f"I:{qid}"}))
    st.acquire(Item(f"I:{qid}", "inquiry", dict({"question": f"Q:{qid}", "roles": roles, "conditions": conditions or {},
                                                 "scope_assumptions": []}, **inquiry), HARNESS))
    return contract.inquire(st, f"I:{qid}")


def summary(a):
    return {"verdict": a.verdict, "value": a.value, "interval": a.interval, "services": a.services,
            "standing": a.standing, "grounds": a.grounds, "lifted": a.lifted, "reasons": a.reasons[-2:]}


def run(dir_v1, dir_x2, out):
    st = Store()
    loader.load_general_knowledge(st)
    docs = [pathlib.Path(dir_v1) / f"{t}.json" for t in ("A-hf2", "C-ap5", "C-rv4", "O-or1")] + \
           [pathlib.Path(dir_x2) / "A-hf3.json"]
    summ = {p.stem: acquisition.acquire_document(st, json.loads(p.read_text())) for p in docs}
    cos = recognition.propose_coreference(st)
    res, checks = {"acquisition": {k: {x: len(v) for x, v in s.items()} for k, s in summ.items()},
                   "co_reference_proposals": len(cos)}, {}

    # 1. a quantity of a part, answered for a question that designates the part
    core_hf = ref(st, "levoit core 600s", "housefresh.com/levoit-core-600s")
    d = {"kind": "Q:service_life", "op": ">=", "bound": 6, "unit": "month"}
    whole = ask(st, "v1a", {"x": core_hf}, {"role": "x"}, {}, d)
    part = ask(st, "v1b", {"x": core_hf}, {"role": "x", "part": "P:filter"}, {}, d)
    romo = ref(st, "dji romo p2/a2", "notebookcheck")
    tank = ask(st, "v1c", {"x": romo}, {"role": "x", "part": "P:clean_water_tank"}, {},
               {"kind": "Q:volume", "op": ">=", "bound": 3, "unit": "L"})
    res["1_parts"] = {"whole": summary(whole), "filter": summary(part), "tank": summary(tank)}
    checks["1_part"] = (whole.verdict == "undetermined" and part.verdict == "applies" and tank.verdict == "applies"
                        and any(st.get(g).body.get("form") == "relation" for g in part.grounds if st.has(g)))

    # 2. a quantity defined by a test material: a question about another material does not use it
    modjr = ref(st, "mod jr", "oransi.com")
    d = {"kind": "Q:clean_air_delivery_rate", "op": ">=", "bound": 200, "unit": "cfm"}
    smoke = ask(st, "v2a", {"x": modjr}, {"role": "x"}, {TM: "V:smoke"}, d)
    dust = ask(st, "v2b", {"x": modjr}, {"role": "x"}, {TM: "V:dust"}, d)
    cov = ask(st, "v2c", {"x": modjr}, {"role": "x"}, {"C:air_change_rate": [4.8, 4.8, "1/h"]},
              {"kind": "Q:coverage_area", "op": ">=", "bound": 300, "unit": "sq ft"})
    res["2_test_material"] = {"smoke": summary(smoke), "dust": summary(dust), "coverage": summary(cov)}
    checks["2_material"] = smoke.verdict == "applies" and dust.verdict == "undetermined" and cov.verdict == "applies"

    # 3. one product named in two documents: an answer only under an explicit identity reading
    core_ap = ref(st, "levoit core 600s", "airpurifierfirst")
    co = next(c.id for c in st.of("content", form="co_reference") if set(c.body["relata"]) == {core_ap, core_hf})
    d = {"kind": "Q:sound_level", "op": "<=", "bound": 50, "unit": "dB"}
    cond = {S: "V:setting:speed 1", D: [3, 3, "ft"]}
    without = ask(st, "v3a", {"x": core_ap}, {"role": "x"}, cond, d)
    rd = recognition.adopt_reading(st, "I:v3b", co, "buyer", "the buyer means one product by this name")
    within = ask(st, "v3b", {"x": core_ap}, {"role": "x"}, cond, d, identity_readings=[rd])
    res["3_identity"] = {"co_reference": dict(st.get(co).body), "without_reading": summary(without),
                         "with_reading": summary(within)}
    checks["3_identity"] = (without.verdict == "undetermined" and within.verdict == "applies"
                            and within.standing == "conditional on assumptions" and rd in within.grounds)

    # 4. lifted conclusions used by inquiries of another kind, without recomputation
    vital, winix, philips = (ref(st, n, "housefresh.com/smart-air") for n in ("levoit vital 200s", "winix 5500 2",
                                                                              "philips 3000i"))
    top = {S: "V:setting:top speed"}
    c1 = ask(st, "v4a", {"a": vital, "b": winix}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"}, top)
    c2 = ask(st, "v4b", {"a": vital, "b": philips}, {"role": "a", "compare": ["a", "b"], "kind": "Q:sound_level"}, top)
    sel = ask(st, "v4c", {"a": vital, "b": winix, "c": philips},
              {"role": "a", "select": ["a", "b", "c"], "kind": "Q:sound_level", "prefer": "lower"}, top)
    hours = [("bearer", "Q:duration", 8, 8, "h")]
    e1 = ask(st, "v4d", {"bearer": vital}, {"role": "bearer"}, top,
             {"kind": "Q:energy", "op": "<=", "bound": 400, "unit": "Wh"}, hours)
    e2 = ask(st, "v4e", {"bearer": winix}, {"role": "bearer"}, top,
             {"kind": "Q:energy", "op": "<=", "bound": 500, "unit": "Wh"}, hours)
    ge = [x for x in e1.lifted + e2.lifted if st.get(x).body["form"] == "quantity"]
    e3 = ask(st, "v4f", {"a": vital, "b": winix}, {"role": "a", "compare": ["a", "b"], "kind": "Q:energy"}, top,
             givens=[("a", "Q:duration", 8, 8, "h"), ("b", "Q:duration", 8, 8, "h")])
    res["4_reuse"] = {"compare_1": summary(c1), "compare_2": summary(c2), "selection": summary(sel),
                      "energy_1": summary(e1), "energy_2": summary(e2), "lifted_energies": ge,
                      "energy_comparison": summary(e3)}
    checks["4_reuse"] = (sel.value == vital and set(sel.grounds) == set(c1.lifted + c2.lifted)
                         and e3.value == "less" and set(e3.grounds) == set(ge) and e3.services == ["rules"])

    # 5. retracting one acquired premise removes what rests on it; re-asking gives a different, justified answer
    winix_power = next(g for x in ge if st.get(x).body["bearer"] == winix
                       for g in st.get(f"ST:{x}").body["grounds"]
                       if st.has(g) and st.get(g).provenance.get("source") == "acquisition service")
    contract.retract(st, winix_power, "harness", "check: this reading is withdrawn")
    e3b = ask(st, "v5a", {"a": vital, "b": winix}, {"role": "a", "compare": ["a", "b"], "kind": "Q:energy"}, top,
              givens=[("a", "Q:duration", 8, 8, "h"), ("b", "Q:duration", 8, 8, "h")])
    winix_sound = next(g for g in st.get(f"ST:{c1.lifted[0]}").body["grounds"]
                       if st.has(g) and st.get(g).body.get("bearer") == winix)
    contract.retract(st, winix_sound, "harness", "check: this reading is withdrawn")
    selb = ask(st, "v5b", {"a": vital, "b": winix, "c": philips},
               {"role": "a", "select": ["a", "b", "c"], "kind": "Q:sound_level", "prefer": "lower"}, top)
    res["5_retraction"] = {"retracted": [winix_power, winix_sound],
                           "lifted_still_current": {g: rules.current(st, g) for g in ge + c1.lifted + c2.lifted},
                           "energy_comparison_after": summary(e3b), "selection_after": summary(selb)}
    checks["5_retraction"] = (e3b.value is None and selb.value is None and not rules.current(st, c1.lifted[0])
                              and rules.current(st, c2.lifted[0]))
    aud = audit(st)
    res["audit"] = {"pass": aud["pass"], "violations": aud["violations"], "conclusions": len(aud["conclusions"])}
    res["checks"] = checks
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    r = run(*sys.argv[1:])
    print(json.dumps({"checks": r["checks"], "audit": r["audit"]["pass"], "co_references": r["co_reference_proposals"]},
                     indent=1))
