"""F-1 audit of the transversal base (REPORT.md section 2.3).

Lists every item of knowledge/general.json, knowledge/legacy-i2-category.json, knowledge/language.json and the
metrology, and reports:
* duplicates: two items that define the same notion (same kind of item, same dimension and an equal term, or the
  same unit surface for two units);
* shared terms: one word anchoring several kinds (kept: the value's unit dimension separates them), listed;
* provenance: every file has a source, holder and basis; models state their domain of validity.

Usage: python3 audit_base.py <out.json>. The output holds no private material.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
K = HERE.parent / "universe" / "knowledge"
MET = HERE.parent / "s1core" / "s1core" / "metrology.json"


def run(out):
    files = {f: json.loads((K / f).read_text()) for f in ("general.json", "legacy-i2-category.json")}
    met = json.loads(MET.read_text())
    lang = json.loads((K / "language.json").read_text())
    res = {"files": {}, "duplicates": [], "shared_terms": [], "unit_surface_collisions": [], "models_without_validity": []}
    items = []
    for f, d in files.items():
        prov = d.get("provenance") or {}
        res["files"][f] = {"items": len(d["items"]), "provenance_complete": bool(prov.get("source") and prov.get("holder")
                                                                                 and prov.get("basis")),
                           "by_role": {}}
        for it in d["items"]:
            role = it["kind"] if it["kind"] != "concept" else f"concept: {it.get('category')}"
            res["files"][f]["by_role"][role] = res["files"][f]["by_role"].get(role, 0) + 1
            items.append((f, it))
    terms = {}
    for f, it in items:
        for t in it.get("terms", []):
            terms.setdefault(t.lower(), []).append((it["id"], json.dumps(it.get("dims"), sort_keys=True), it["kind"]))
        if it["kind"] == "model" and not it.get("validity") and it.get("generality") != "definition":
            res["models_without_validity"].append(it["id"])
    for t, owners in sorted(terms.items()):
        ids = sorted({o[0] for o in owners})
        if len(ids) < 2:
            continue
        same_dims = {}
        for i, d, k in owners:
            same_dims.setdefault((d, k), set()).add(i)
        for (d, k), group in same_dims.items():
            if len(group) > 1 and k == "quantity_kind":
                res["duplicates"].append({"term": t, "items": sorted(group), "dims": json.loads(d)})
        res["shared_terms"].append({"term": t, "items": ids})
    surf = {}
    for u, v in met["units"].items():
        for s in v.get("surfaces", []):
            surf.setdefault(s, []).append(u)
    res["unit_surface_collisions"] = [{"surface": s, "units": us} for s, us in surf.items() if len(us) > 1]
    res["metrology"] = {"units": len(met["units"]), "provenance": met["provenance"]}
    res["language_keys"] = sorted(k for k in lang if k != "about")
    pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False))
    return res


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    r = run(sys.argv[1])
    print(json.dumps({k: r[k] for k in ("files", "duplicates", "unit_surface_collisions", "models_without_validity")},
                     indent=1)[:3000])
    print("shared terms:", len(r["shared_terms"]))
