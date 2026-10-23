"""F-1 E1 (and the exploratory E4 fidelity check): acquisition fidelity against a sealed reference.

The frozen acquisition service reads the held-out text exactly as the annotators saw it (one document), in a store
holding only the transversal base. What it produced is compared with the adjudicated reference, unit type by unit
type. Matching rules (fixed before the first run):

* kind: same symbol (case-sensitive, without spaces and backticks), else same normalised name. Correct when the
  produced dimension equals the dimension of the reference unit; a reference kind with no unit is correct only when
  Pee made no kind (abstained); a produced kind with another dimension is a critical error. Family values and
  dependencies are compared as sets (a difference makes the item partial);
* formula: same target. A reference definition formula is correct when Pee produced a model for it; a model produced
  for a worked example, a conversion or an inequality is wrong;
* distinct: both sides overlap the reference sides (word Jaccard >= 0.5, in either order);
* method: names overlap (word Jaccard >= 0.6, or one contains the other). Correct when the edition years agree;
* reference: same identifier. Correct when the URL agrees (when the reference has one); an entity for an identifier
  the reference does not hold is an invented entry (critical);
* unresolved citation: identifier sets compared;
* label: same label string. Correct when the evidence class agrees (no class on both sides is agreement);
* checks over everything produced: a cited source marked examined, an attribution to another holder, and a
  declaration or proposal label classed as original measurement are critical errors.

Strict precision counts every produced item that matches no reference unit as not correct.

Usage: python3 score_e1.py <heldout.md> <reference.json> <document name> <out.json>. Outputs stay private.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from s1core import units  # noqa: E402
from universe import acquisition, knowledge_acquisition as ka, loader, markdown  # noqa: E402
from universe.store import Store  # noqa: E402

TYPES = ("kind", "formula", "distinct", "method", "reference", "unresolved_citation", "label")


def words(s):
    return set(re.findall(r"[a-z0-9]+", (s or "").lower()))


def jac(a, b):
    a, b = words(a), words(b)
    return len(a & b) / len(a | b) if a | b else 0.0


def sym(s):
    return re.sub(r"[\s`]", "", s or "")


def dims_of_text(text, lex):
    us = ka.resolve_units(text, lex)
    ds = {tuple(units.pad(units.dims_of(u))) for u in us}
    return ds.pop() if len(ds) == 1 else None


def produced(path, name):
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    lex = acquisition.Lexicon(st)
    doc = markdown.read(pathlib.Path(path).read_text(), f"heldout:{name}", f"author of {name}")
    us = ka.read_units(doc, lex)
    summ = ka.represent(st, us, doc["url"], doc["holder"], lex)
    out = {t: [] for t in TYPES}
    for u in us:
        if u["type"] == "kind":
            kid = u.get("_kind")
            out["kind"].append({"symbol": u.get("symbol"), "name": u.get("name"), "kind": kid,
                                "dims": tuple(units.pad(st.get(kid).body["dims"])) if kid and st.has(kid) else None,
                                "family": (u.get("family") or {}).get("values") or [],
                                "depends_on": u.get("depends_on") or []})
        elif u["type"] == "unresolved_citation":
            out["unresolved_citation"].append({"id": u["id"]})
    for m in summ["models"]:
        out["formula"].append({"target": st.get(m).body["name"].split(" = ")[0], "model": m})
    for c in summ["distinct"]:
        a, b = st.get(c).body["designations"]
        out["distinct"].append({"a": a, "b": b})
    for m in summ["methods"]:
        b = st.get(m).body
        out["method"].append({"name": b["label"], "editions": list(b.get("editions") or [])})
    for e in summ["sources"]:
        b = st.get(e).body
        out["reference"].append({"id": b["cited_id"], "url": b.get("url"), "examined": b.get("examined")})
    for c in summ["labels"]:
        b = st.get(c).body
        out["label"].append({"label": b["label"], "class": b["evidence_class"]})
    checks = {"examined_sources": sum(1 for e in summ["sources"] if st.get(e).body.get("examined") is not False),
              "foreign_holder": sum(1 for a in summ["attributions"] if st.get(a).body.get("holder") != doc["holder"]),
              "declaration_as_measurement": sum(
                  1 for c in summ["labels"] if st.get(c).body["evidence_class"] == "E:original_measurement" and
                  words(st.get(c).body["label"]) & {"declared", "manufacturer", "proposed", "claim", "marketing"})}
    return out, checks, lex, {k: len(v) for k, v in summ.items() if isinstance(v, list)}


def score(path, ref_path, name, out_path):
    prod, checks, lex, summary = produced(path, name)
    ref = json.loads(pathlib.Path(ref_path).read_text())["units"]
    res = {"document": name, "summary": summary, "checks": checks, "by_type": {}, "critical": [], "details": {}}
    for t in TYPES:
        R = [u for u in ref if u["type"] == t]
        P = list(prod[t])
        used, rows = set(), []
        for r in R:
            hit = None
            for i, p in enumerate(P):
                if i in used:
                    continue
                if t == "kind":
                    ok = (r.get("symbol") and p.get("symbol") and sym(r["symbol"]) == sym(p["symbol"])) or (
                        r.get("name") and p.get("name") and " ".join(sorted(words(r["name"]))) == " ".join(
                            sorted(words(p["name"]))))
                elif t == "formula":
                    ok = sym(r.get("target")) == sym(p["target"])
                elif t == "distinct":
                    ok = (jac(r["a"], p["a"]) >= 0.5 and jac(r["b"], p["b"]) >= 0.5) or (
                        jac(r["a"], p["b"]) >= 0.5 and jac(r["b"], p["a"]) >= 0.5)
                elif t == "method":
                    ok = jac(r["name"], p["name"]) >= 0.6 or words(r["name"]) <= words(p["name"]) or words(
                        p["name"]) <= words(r["name"])
                elif t in ("reference", "unresolved_citation"):
                    ok = r.get("id") and r["id"] == p["id"]
                else:
                    ok = r["label"].strip() == p["label"].strip()
                if ok:
                    hit = i
                    break
            verdict = "missed"
            if t == "kind":
                rd = dims_of_text(r.get("unit"), lex) if r.get("unit") else None
                if hit is None:
                    verdict = "missed"
                else:
                    p = P[hit]
                    if p["dims"] is None:
                        verdict = "correct" if rd is None else "abstained"
                    elif rd is None:
                        verdict = "wrong"
                    elif p["dims"] != rd:
                        verdict = "wrong"
                        res["critical"].append({"type": "wrong dimension", "symbol": r.get("symbol"),
                                                "name": r.get("name")})
                    else:
                        fam_ok = set((r.get("family") or {}).get("values") or []) == set(p["family"])
                        dep_ok = {sym(x) for x in r.get("depends_on") or []} == {sym(x) for x in p["depends_on"]}
                        verdict = "correct" if fam_ok and dep_ok else "partial"
            elif t == "formula":
                if hit is not None:
                    verdict = "correct" if (r.get("kind") or "definition") == "definition" and "inequality" not in (
                        r.get("note") or "") else "wrong"
                else:
                    verdict = "missed" if (r.get("kind") or "definition") == "definition" and "inequality" not in (
                        r.get("note") or "") else "correct abstention"
            elif t == "method" and hit is not None:
                verdict = "correct" if set(YEARS(r)) == set(P[hit]["editions"]) or not YEARS(r) else "partial"
            elif t == "reference" and hit is not None:
                ru = (r.get("url") or "").rstrip("/ .")
                verdict = "correct" if not ru or ru == (P[hit]["url"] or "").rstrip("/ .") else "partial"
            elif t == "label" and hit is not None:
                rc = r.get("class")
                rc = f"E:{rc}" if rc and not rc.startswith("E:") else rc
                verdict = "correct" if rc == P[hit]["class"] else ("abstained" if P[hit]["class"] is None else "wrong")
            elif hit is not None:
                verdict = "correct"
            if hit is not None:
                used.add(hit)
            rows.append({"reference": {k: v for k, v in r.items() if k in ("symbol", "name", "target", "a", "b", "id",
                                                                         "label", "unit", "class", "kind")},
                         "verdict": verdict, "produced": P[hit] if hit is not None else None})
        unmatched = [p for i, p in enumerate(P) if i not in used]
        if t == "reference":
            res["critical"] += [{"type": "invented register entry", "id": p["id"]} for p in unmatched]
        c = {}
        for r in rows:
            c[r["verdict"]] = c.get(r["verdict"], 0) + 1
        made = [p for p in P if t != "kind" or p.get("dims") is not None]  # an abstention is not a produced item
        res["by_type"][t] = {"reference_units": len(R), "produced": len(made), "read_units": len(P),
                             "unmatched_produced": len([p for p in unmatched if t != "kind" or p.get("dims") is not None]),
                             **c}
        res["details"][t] = {"rows": rows, "unmatched": unmatched}
    for k, v in checks.items():
        if v:
            res["critical"].append({"type": k, "count": v})
    prod_total = sum(res["by_type"][t]["produced"] for t in TYPES if t != "unresolved_citation")
    correct_matched = sum(sum(1 for r in res["details"][t]["rows"] if r["verdict"] == "correct" and r["produced"]
                              and (t != "kind" or r["produced"].get("dims") is not None))
                          for t in TYPES if t != "unresolved_citation")
    ref_total = sum(res["by_type"][t]["reference_units"] for t in TYPES)
    acquired = sum(sum(1 for r in res["details"][t]["rows"] if r["produced"] is not None) for t in TYPES)
    res["totals"] = {"produced": prod_total, "correct": correct_matched,
                     "strict_precision": round(correct_matched / prod_total, 3) if prod_total else None,
                     "reference_units": ref_total, "acquired": acquired,
                     "recall": round(acquired / ref_total, 3) if ref_total else None,
                     "critical_errors": len(res["critical"])}
    pathlib.Path(out_path).write_text(json.dumps(res, indent=1, default=str))
    return res


def YEARS(r):
    return [y for e in (r.get("editions") or []) for y in re.findall(r"(?:19|20)\d{2}", str(e))]


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    r = score(*sys.argv[1:])
    print(json.dumps({"by_type": r["by_type"], "totals": r["totals"], "critical": r["critical"][:20]}, indent=1))
