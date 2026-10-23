"""A-1 measure A: translation fidelity.

* ``export``: the propositions a persisted universe holds for one document and line range, **rendered from universe
  items** (concept labels, relation designations, polarity, modality, conditions, attitude, evidence classes, cited
  identifiers). Nothing is read from the document: the render is what the universe can say. This is the input of the
  blind judges (REPORT section 3.3).
* ``proxy``: a development-only automatic comparison with a reference (word overlap of the concepts, same relation
  family, element checks). It is never used for the sealed measure.

Usage:
  python3 fidelity.py export <snapshot> <document url> <first line> <last line> <out.json>
  python3 fidelity.py proxy <export.json> <reference.json> <out.json>
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import persist, rules  # noqa: E402
from universe.store import thaw  # noqa: E402

EVIDENCE_WORDS = {"E:synthesis": "synthesis", "E:original_measurement": "original_measurement",
                  "E:standard_description": "standard_or_regulation", "E:regulatory_rule": "standard_or_regulation",
                  "E:expert_judgement": "expert_judgement", "E:guidance": "guidance", "E:proposed_method": "proposal",
                  "E:hypothesis": "hypothesis"}


def _label(store, x):
    if not x:
        return None
    return store.get(x).body.get("label") if store.has(x) else x


def _lines(locator):
    m = re.search(r"lines? (\d+)(?:-(\d+))?", locator or "")
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None


def export(snapshot, url, first, last, out=None):
    store = persist.load(snapshot)
    first, last = int(first), int(last)
    meta = rules.relation_meta(store)
    rows = []
    for p in rules.propositions(store):
        atts = [a for a in rules.attributions(store, p.id) if a.body.get("document") == url]
        for a in atts:
            rec = store.get(a.body["reports"]).body if a.body.get("reports") and store.has(a.body["reports"]) else {}
            ln = _lines(rec.get("locator"))
            if not ln or ln[1] < first or ln[0] > last:
                continue
            b = p.body
            rel = (meta.get(b["relation"]) or {}).get("designations", [b["relation"]])[0]
            cites = [store.get(c).body.get("cited_id") for c in a.body.get("cites") or () if store.has(c)]
            row = {"pid": p.id, "lines": list(range(ln[0], ln[1] + 1)), "locator": rec.get("locator"),
                   "subject": _label(store, b["subject"]), "relation": rel, "object": _label(store, b.get("object")),
                   "value": thaw(b.get("value")), "polarity": b.get("polarity"), "modality": b.get("modality"),
                   "conditions": [{"concept": _label(store, c["concept"]), "value": c["value"]}
                                  for c in b.get("conditions") or ()],
                   "content_kind": b.get("content_kind"), "document_attitude": a.body.get("attitude"),
                   "evidence_kind": [EVIDENCE_WORDS.get(e, e) for e in a.body.get("evidence_classes") or ()],
                   "attributed_to": [x for x in cites if x] + list(a.body.get("unresolved") or ()) +
                                    [_label(store, x) for x in a.body.get("attributed_to") or () if x]}
            if b.get("verb"):
                row["verb"] = b["verb"]
            row["rendered"] = render(row)
            rows.append(row)
    rows.sort(key=lambda r: (r["lines"][0], r["pid"]))
    res = {"snapshot_sha256": json.loads(pathlib.Path(str(snapshot) + ".manifest.json").read_text())["sha256"],
           "document": url, "lines": [first, last], "propositions": rows}
    if out:
        pathlib.Path(out).write_text(json.dumps(res, indent=1))
    return res


def render(r):
    neg = "NOT " if r["polarity"] == "negated" else ""
    mod = "" if r["modality"] in (None, "actual") else f"[{r['modality']}] "
    obj = r["object"] if r["object"] else (json.dumps(r["value"]) if r.get("value") else "")
    rel = r["relation"] + (f" ({r['verb']})" if r.get("verb") else "")
    s = f"{mod}{r['subject']} — {neg}{rel} — {obj}"
    if r["conditions"]:
        s += " | under: " + "; ".join(f"{c['value']} {c['concept']}" for c in r["conditions"])
    s += f" | author: {r['document_attitude']}; evidence: {', '.join(r['evidence_kind']) or 'none'}"
    if r["attributed_to"]:
        s += f"; attributed to: {', '.join(map(str, r['attributed_to']))}"
    return s


FAMILY = {"increases": "effect+", "causes": "effect+", "enables": "effect+", "decreases": "effect-",
          "prevents": "effect-", "affects": "effect", "determines": "effect", "depends_on": "effect",
          "establishes": "establish", "does_not_establish": "establish", "measures": "establish",
          "indicates": "establish"}


def _w(s):
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if len(w) > 2}


def proxy(export_path, reference, out):
    pee = json.loads(pathlib.Path(export_path).read_text())["propositions"]
    ref = [p for p in json.loads(pathlib.Path(reference).read_text())["propositions"] if not p.get("non_scientific")]
    used, rows = set(), []
    for r in ref:
        best, bi = 0.0, None
        rw = _w(r.get("subject")) | _w(r.get("object"))
        for i, p in enumerate(pee):
            if not set(p["lines"]) & set(r.get("lines") or ()):
                continue
            pw = _w(p["subject"]) | _w(p["object"])
            j = len(rw & pw) / len(rw | pw) if rw | pw else 0
            if j > best:
                best, bi = j, i
        if bi is None or best < 0.34:
            rows.append({"ref": r["id"], "verdict": "missed"})
            continue
        used.add(bi)
        p = pee[bi]
        rel_r = r.get("relation")
        if rel_r == "does_not_establish":
            rel_r, pol_r = "establishes", "negated" if r.get("polarity") != "negated" else "affirmed"
        else:
            pol_r = r.get("polarity")
        wrong = []
        if FAMILY.get(rel_r, rel_r) != FAMILY.get(p["relation"], p["relation"]):
            wrong.append("relation")
        if pol_r != p["polarity"]:
            wrong.append("polarity")
        if r.get("document_attitude") != p["document_attitude"]:
            wrong.append("attitude")
        rows.append({"ref": r["id"], "pee": p["pid"], "overlap": round(best, 2),
                     "verdict": "complete" if not wrong else "partial", "wrong": wrong})
    c = {}
    for x in rows:
        c[x["verdict"]] = c.get(x["verdict"], 0) + 1
    res = {"reference": len(ref), "produced": len(pee), "matched_produced": len(used), "counts": c,
           "recall_any": round((c.get("complete", 0) + c.get("partial", 0)) / len(ref), 3) if ref else None,
           "unmatched_produced_share": round(1 - len(used) / len(pee), 3) if pee else None, "rows": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1))
    return res


if __name__ == "__main__":
    if len(sys.argv) == 7 and sys.argv[1] == "export":
        r = export(*sys.argv[2:])
        print(len(r["propositions"]))
    elif len(sys.argv) == 5 and sys.argv[1] == "proxy":
        r = proxy(*sys.argv[2:])
        print(json.dumps({k: v for k, v in r.items() if k != "rows"}, indent=1))
    else:
        sys.exit(__doc__)
