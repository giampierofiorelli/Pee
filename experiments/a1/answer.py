"""A-1 question harness: what the universe licenses, asked in the structured form of `question-format.md`.

The harness maps each question's terms to universe concepts through ``recognition.designate`` (the same for every
arm) and calls the rule services of ``universe/rules.py``. It never reads a document. A term that names nothing the
universe holds makes the answer **uninformed**, and it is counted as such.

Arms (REPORT section 3.2):

* ``ORACLE``: base + the sealed reference propositions, represented through ``knowledge_acquisition.represent``;
* ``K``: base + the F-1 packages assimilated with the frozen A-1 code;
* ``K+``: K + the THREE dehumidifier document assimilated with the frozen A-1 code;
* a persisted universe loaded from a snapshot in a new process.

Usage:
  python3 answer.py build <arm> <snapshot out> <workdir>              # assimilate and persist (K, K+)
  python3 answer.py oracle <reference.json> <snapshot out>            # represent the reference (ORACLE)
  python3 answer.py run <snapshot> <questions.json> <out.json>        # answer from a snapshot only (new process)
  python3 answer.py inprocess <arm> <snapshot> <workdir> <questions.json> <out.json> <build.json>
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import assimilate, knowledge_acquisition as ka, loader, persist, recognition, rules  # noqa: E402
from universe.store import Store  # noqa: E402

RP = pathlib.Path("/home/user/pee-knowledge/research-packages")
DOCS = {
    "AP": (RP / "PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS-COMPLETE-v1.2.0.zip",
           "PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS/PEE-CATEGORY-RESEARCH-04-AIR-PURIFIERS-v1.2-CONSOLIDATED.md"),
    "DH": (RP / "PEE-DEHUMIDIFIERS-RESTORED-SOURCES-R01-R39.zip", "PEE-CATEGORY-RESEARCH-02-DEHUMIDIFIERS-ORIGINAL.md"),
    "THREE-DH": (RP / "PEE-THREE-SCIENTIFIC-RESEARCH-PACKAGES.zip", "PEE-DEHUMIDIFIERS-CONSOLIDATED-RESEARCH-2026-10-15.md"),
}
ARMS = {"K": ("AP", "DH"), "K+": ("AP", "DH", "THREE-DH"), "DEV": ("DH",)}
HOLDER = "owner research package author"
# the question format's evidence vocabulary, mapped to the universe's evidence-class concepts
EVIDENCE_WORDS = {"E:synthesis": "synthesis", "E:original_measurement": "original_measurement",
                  "E:standard_description": "standard_or_regulation", "E:regulatory_rule": "standard_or_regulation",
                  "E:expert_judgement": "expert_judgement", "E:guidance": "guidance", "E:proposed_method": "proposal",
                  "E:hypothesis": "hypothesis"}
ABSTAIN = {"undetermined", "not stated", "not covered"}


def base():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def build(arm, snapshot, workdir):
    st = base()
    recs, texts, origs = [], [], {}
    for key in ARMS[arm]:
        path, member = DOCS[key]
        rec, text = assimilate.assimilate(st, path, HOLDER, workdir, url=f"document:{key}", member=member)
        recs.append(rec)
        texts.append(text)
        origs[rec["document"]] = (path, member)
    result = assimilate.complete(st, recs, texts, snapshot, origs)
    del texts
    return {"arm": arm, "documents": [{k: v for k, v in r.items() if k != "working_copy"} for r in recs],
            "lifecycle": {k: v for k, v in result.items() if k != "manifest"},
            "manifest": {k: result.get("manifest", {}).get(k) for k in ("sha256", "events", "items", "forms",
                                                                         "retention")}}


def reference_units(reference):
    """The reference propositions as units of the representation step (the oracle's input)."""
    ref = json.loads(pathlib.Path(reference).read_text())
    units = []
    for p in ref["propositions"]:
        if p.get("non_scientific"):
            continue
        u = dict(p, type="proposition", record={"text": json.dumps(p.get("lines")), "locator": f"reference {p['id']}",
                                                "section": []})
        if isinstance(u.get("attributed_to"), str):
            u["attributed_to"] = [u["attributed_to"]]
        rel = u.get("relation") or ""
        if rel.startswith("other"):
            rel = "other:" + rel.split(":", 1)[-1].strip()
        if rel == "does_not_establish":
            rel = "establishes"
            u["polarity"] = "affirmed" if u.get("polarity") == "negated" else "negated"
        u["relation"] = rel
        if isinstance(u.get("value"), dict) and "low" in u["value"]:
            v = dict(u["value"])
            u["value"] = {"lo": v.pop("low"), "hi": v.pop("high"), **v}
        units.append(u)
    return units


def oracle(reference, snapshot):
    st = base()
    s = ka.represent(st, reference_units(reference), "reference:THREE-DH-713-924", "oracle reference")
    persist.save(st, snapshot, note="ORACLE: the sealed reference represented")
    return {"arm": "ORACLE", "summary": {k: len(v) for k, v in s.items() if isinstance(v, list)}}


def _conds(store, conds):
    out, missing = {}, []
    for c in conds or ():
        ids = recognition.designate(store, c.get("concept"))
        if not ids:
            missing.append(c.get("concept"))
        for i in ids:
            out.setdefault(i, set()).add(" ".join(str(c.get("value") or "").lower().split()))
    return out, missing


def answer(store, q):
    a = q.get("ask") or {}
    t = q["type"]
    terms = {"influence": ("cause", "effect"), "holds": ("subject", "object"), "status": ("subject", "object"),
             "evidence": ("subject", "object"), "value": ("subject",), "consistent": ("subject", "object")}.get(t, ())
    if t == "consistent":
        claim = a.get("claim") or a
        a = dict(claim, conditions=claim.get("conditions") or a.get("conditions"))
    sets, unresolved, bases = {}, [], {}
    for k in terms:
        if a.get(k) is None:
            sets[k] = None
            continue
        ids, basis = recognition.designate_with_basis(store, a[k])
        if not ids:
            unresolved.append(a[k])
        sets[k] = ids
        bases[k] = basis
    conds, cmiss = _conds(store, a.get("conditions"))
    row = {"id": q["id"], "type": t, "unresolved_terms": unresolved, "unresolved_conditions": cmiss,
           "designation": bases}
    if unresolved:
        return dict(row, answer=("not stated" if t in ("status", "evidence") else "not covered" if t == "consistent"
                                 else "undetermined"), informed=False, why="a term names no concept in the universe")
    if t == "influence":
        r = rules.influence(store, sets["cause"], sets["effect"], conds)
    elif t == "holds":
        r = rules.holds(store, sets["subject"], a["relation"], sets.get("object"), conds)
    elif t == "consistent":
        r = rules.consistent(store, sets["subject"], a["relation"], sets.get("object"), a.get("polarity", "affirmed"),
                             conds)
    elif t == "value":
        r = rules.value(store, sets["subject"], conds)
    elif t in ("status", "evidence"):
        ps, neg = rules.statements_about(store, sets["subject"], a["relation"], sets.get("object"))
        if not ps:
            r = {"answer": "not stated", "grounds": []}
        elif t == "status":
            want = "negated" if neg else "affirmed"
            same = [p for p in ps if p.body.get("polarity") == want]
            other = [p for p in ps if p.body.get("polarity") != want]
            if other and not same and set().union(*(rules.attitudes(store, p.id) for p in other)) & {"asserted",
                                                                                                      "reported"}:
                r = {"answer": "denied", "grounds": [p.id for p in other]}
            else:
                atts = set().union(*(rules.attitudes(store, p.id) for p in (same or ps)))
                order = ["proposed", "hypothesised", "questioned", "reported", "asserted"]
                r = {"answer": next((x for x in order if x in atts), "not stated"),
                     "grounds": [p.id for p in (same or ps)]}
        else:
            ev = set().union(*(rules.evidence_classes(store, p.id) for p in ps))
            words = sorted({EVIDENCE_WORDS.get(e) for e in ev} - {None})
            r = {"answer": words[0] if len(words) == 1 else ("undetermined" if words else "not stated"),
                 "all": words, "grounds": [p.id for p in ps]}
    else:
        r = {"answer": "undetermined", "why": f"unknown question type {t}"}
    return dict(row, informed=True, **r)


def _unit(u):
    from s1core import units
    if u is None:
        return None
    s = str(u).strip()
    for uid, surfaces in units.SURFACES.items():
        if s == uid or s in surfaces:
            return uid
    return s


def same_answer(got, exp, q):
    for e in [exp] + list(q.get("equivalent_answers") or ()):
        if isinstance(e, dict) and isinstance(got, dict):
            ev = {("lo" if k == "low" else "hi" if k == "high" else k): v for k, v in e.items()}
            keys = [k for k in ("number", "lo", "hi") if k in ev]
            if keys and all(k in got and abs(float(ev[k]) - float(got[k])) < 1e-6 for k in keys) and \
                    _unit(ev.get("unit")) == _unit(got.get("unit")):
                return True
        elif isinstance(e, str) and isinstance(got, str) and " ".join(e.lower().split()) == " ".join(got.lower().split()):
            return True
    return False


def outcome(row, exp, q):
    det = exp is not None and not (isinstance(exp, str) and exp in ABSTAIN)
    got = row.get("answer")
    got_det = not (isinstance(got, str) and got in ABSTAIN)
    if not det:
        if not got_det:
            return "justified abstention" if row.get("informed") else "uninformed abstention"
        return "unjustified decision"
    if got_det:
        return "correct decision" if same_answer(got, exp, q) else "unjustified decision"
    return "lost decision" if row.get("informed") else "lost decision (uninformed)"


def build_and_answer(arm, snapshot, workdir, questions, out, build_out):
    """F: assimilate, persist and remove the working copies, then answer in the same process, from the store that was
    just built (the comparison point for the answers of a new process that loads only the snapshot)."""
    st = base()
    recs, texts, origs = [], [], {}
    for key in ARMS[arm]:
        path, member = DOCS[key]
        rec, text = assimilate.assimilate(st, path, HOLDER, workdir, url=f"document:{key}", member=member)
        recs.append(rec)
        texts.append(text)
        origs[rec["document"]] = (path, member)
    result = assimilate.complete(st, recs, texts, snapshot, origs)
    del texts
    info = {"arm": arm, "documents": [{k: v for k, v in r.items() if k != "working_copy"} for r in recs],
            "lifecycle": {k: v for k, v in result.items() if k != "manifest"},
            "manifest": {k: result.get("manifest", {}).get(k) for k in ("sha256", "events", "items", "forms",
                                                                         "retention")}}
    pathlib.Path(build_out).write_text(json.dumps(info, indent=1, default=str))
    return answer_store(st, questions, out, result.get("manifest", {}).get("sha256"))


def answer_store(store, questions, out, sha=None):
    qs = json.loads(pathlib.Path(questions).read_text())["items"]
    rows, counts = [], {}
    for q in qs:
        if q.get("adjudication") == "dropped":
            continue
        r = answer(store, q)
        r.update(expected=q.get("expected"), inference_expected=q.get("inference"), transfer=q.get("transfer", False))
        r["outcome"] = outcome(r, q.get("expected"), q)
        rows.append(r)
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    res = {"snapshot_sha256": sha, "counts": counts, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=sorted))
    return res


def run(snapshot, questions, out):
    store = persist.load(snapshot)
    qs = json.loads(pathlib.Path(questions).read_text())["items"]
    rows, counts = [], {}
    for q in qs:
        if q.get("adjudication") == "dropped":
            continue
        r = answer(store, q)
        r.update(expected=q.get("expected"), inference_expected=q.get("inference"), transfer=q.get("transfer", False))
        r["outcome"] = outcome(r, q.get("expected"), q)
        rows.append(r)
        counts[r["outcome"]] = counts.get(r["outcome"], 0) + 1
    man = json.loads(pathlib.Path(str(snapshot) + ".manifest.json").read_text())
    res = {"snapshot_sha256": man["sha256"], "counts": counts, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, default=sorted))
    return res


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "build" and len(sys.argv) == 5:
        print(json.dumps(build(*sys.argv[2:]), indent=1, default=str)[:4000])
    elif cmd == "oracle" and len(sys.argv) == 4:
        print(json.dumps(oracle(*sys.argv[2:]), indent=1))
    elif cmd == "inprocess" and len(sys.argv) == 8:
        print(json.dumps(build_and_answer(*sys.argv[2:])["counts"], indent=1))
    elif cmd == "run" and len(sys.argv) == 5:
        print(json.dumps(run(*sys.argv[2:])["counts"], indent=1))
    else:
        sys.exit(__doc__)
