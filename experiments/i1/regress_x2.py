"""I1-d regression: the spent X2 sealed questions re-asked through the I-1 path (REPORT.md section 3.2, I1-d).

The X2 set is SPENT (first-run answers are published in experiments/x2); this is a regression, never a validation.

What the harness does, and what it does not:
- It acquires the structure of every page that grounds the questions' products (crawler_structure.mjs output) into one
  universe store, through acquisition only.
- It writes each question as items: the buyer's limit as a class definition (basis "stated requirement"), or a
  comparison question. The question's property and condition are translated BY HAND (QUESTION_KINDS and
  QUESTION_SETTINGS below): request understanding is not part of I-1. A property or condition the universe cannot
  express makes the question "not askable", never a question without that condition.
- It names the question's product by its record name and asks for the universe entity with exactly that identity key.
  None or several: "not askable". The harness never resolves identity beyond exact key equality (MS2 is not
  authorised).
- Every verdict comes from contract.inquire (rules, model). The harness only maps "applies"/"does not apply"/
  "undetermined" to the X2 labels.

Usage: python3 regress_x2.py <structure dir> <x2 test dir> <out.json>
Outputs hold values and stay private.
"""
import glob
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core"), str(HERE)]

from run_i1 import BUYER, HARNESS, audit, build  # noqa: E402
from universe import acquisition, contract  # noqa: E402
from universe.store import Item  # noqa: E402

# question property (the buyer's words) -> universe quantity kind; None: the universe has no such kind, or the
# property belongs to a part (a filter, a charger) rather than to the product
QUESTION_KINDS = {
    "noise": "Q:sound_level", "fan noise": "Q:sound_level", "loudness": "Q:sound_level",
    "suction": "Q:pressure", "suction power": "Q:pressure",
    "height": "Q:height", "weight": "Q:mass",
    "power draw": "Q:electric_power", "standby power": "Q:electric_power", "power use when idle": "Q:electric_power",
    "idle power consumption": "Q:electric_power", "power draw at idle": "Q:electric_power",
    "power draw when gaming": "Q:electric_power",
    "run time": "Q:operating_time_per_charge", "battery life": "Q:operating_time_per_charge",
    "battery run time": "Q:operating_time_per_charge",
    "warranty": "Q:warranty_period",
    "airflow": "Q:volume_flow_rate", "clean air delivery rate": "Q:volume_flow_rate", "CADR": "Q:volume_flow_rate",
    "screen brightness": "Q:luminance", "peak brightness": "Q:luminance", "black level": "Q:luminance",
    "underside temperature": "Q:temperature", "surface temperature": "Q:temperature",
    "keyboard-side temperature": "Q:temperature",
    "room size it can handle": "Q:area", "room coverage": "Q:area",
    "time to clean a room": "Q:duration", "time to clean the room": "Q:duration", "charging time": "Q:duration",
    "dust bin size": "Q:volume", "robot's onboard dust bin": "Q:volume",
    "SSD sequential read speed": "Q:data_rate", "PWM flicker frequency": "Q:frequency",
    "battery capacity": "Q:electric_charge",
}
# question condition -> universe conditions; a condition absent here is not expressible in the universe
S = "C:operating_setting"
QUESTION_SETTINGS = {
    "on its lowest fan speed": {S: "lowest fan speed"}, "at its highest fan speed": {S: "highest fan speed"},
    "at the highest fan speed": {S: "highest fan speed"}, "on the highest setting": {S: "highest setting"},
    "on its quietest setting": {S: "quietest setting"}, "on the quietest setting": {S: "quietest setting"},
    "in sleep mode": {S: "sleep mode"},
    "measured at 1 metre on its lowest speed": {S: "lowest speed", "C:distance_to_source": [1, 1, "m"]},
}
LABEL = {"applies": "meets", "does not apply": "fails", "undetermined": "not_determinable"}


def product_entity(st, record):
    keys = {acquisition._name_key(record["name"])}
    if record.get("brand"):
        keys.add(acquisition._name_key(f"{record['brand']} {record['name']}"))
    hits = [e.id for e in st.of("entity") if e.body["label"] in keys]
    return hits[0] if len(hits) == 1 else None, len(hits)


def unit_of(lex, text):
    if not text:
        return None
    vs = acquisition.parse_values(f"1 {text}", lex)
    return vs[0]["unit"] if vs else None


def run(structure_dir, test_dir, out):
    structures = sorted(glob.glob(str(pathlib.Path(structure_dir) / "*.json")))
    st, summaries = build(structures)
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
        kind = QUESTION_KINDS.get(q["property"])
        conds = {} if not q.get("conditions") else QUESTION_SETTINGS.get(q["conditions"])
        pids = [q["product_id"]] if q["type"] == "limit" else [q["p1"], q["p2"]]
        ents = [product_entity(st, prods[p]) for p in pids]
        why = None
        if kind is None:
            why = "property not expressible as a universe quantity kind"
        elif conds is None:
            why = "condition not expressible in the universe"
        elif any(e is None for e, _ in ents):
            why = "product not identified by an exact identity key (" + ", ".join(str(n) for _, n in ents) + " hits)"
        elif q["type"] == "limit" and unit_of(lex, q.get("unit")) is None:
            why = "the buyer's bound has no readable unit"
        if why:
            row.update({"answer": "not askable", "why": why})
            rows.append(row)
            continue
        qid = f"x2:{q['id']}"
        if q["type"] == "limit":
            op = {"at_most": "<=", "at_least": ">=", "less_than": "<", "more_than": ">", "below": "<", "above": ">"}[q["comparator"]]
            st.acquire(Item(f"D:{qid}", "content", {"form": "class_definition", "class": f"K:{qid}", "kind": kind,
                                                     "op": op, "bound": q["value"], "unit": unit_of(lex, q["unit"])},
                            BUYER))
            question = {"role": "bearer", "class": f"K:{qid}"}
            roles = {"bearer": ents[0][0]}
        else:
            question = {"role": "a", "compare": ["a", "b"], "kind": kind}
            roles = {"a": ents[0][0], "b": ents[1][0]}
        st.acquire(Item(f"Q:{qid}", "question", question, BUYER))
        st.acquire(Item(f"I:{qid}", "inquiry", {"question": f"Q:{qid}", "roles": roles, "conditions": conds,
                                               "scope_assumptions": []}, HARNESS))
        a = contract.inquire(st, f"I:{qid}")
        if q["type"] == "limit":
            ans = LABEL.get(a.verdict, "not_determinable")
        else:
            better = {"lower": "less", "higher": "greater"}[q["prefer"]]
            ans = ("equal" if a.value == "equal" else "p1" if a.value == better else "p2" if a.value in ("less", "greater")
                   else "not_determinable")
        row.update({"answer": ans, "services": a.services, "standing": a.standing, "reasons": a.reasons[:3],
                    "grounds": a.grounds, "proposals": a.proposals})
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
    aud = audit(st)
    res = {"audit_pass": aud["pass"], "audited_conclusions": len(aud["conclusions"]), "pages": len(structures), "acquisition": {k: sum(len(s[k]) for s in summaries) for k in summaries[0]},
           "counts": counts, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=str))
    return res


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    r = run(*sys.argv[1:])
    print(json.dumps({"audit_pass": r["audit_pass"], "audited_conclusions": r["audited_conclusions"], "pages": r["pages"], "acquisition": r["acquisition"], "counts": r["counts"]}, indent=1))
