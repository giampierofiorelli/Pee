"""O-2 scoring (REPORT.md 3.2-3.4). Kept apart from ``o2.py`` so the frozen arms are not touched by scoring code.

Usage:
  python3 score.py merge <judge 1.json> <judge 2.json> <agreed out.json> <disputes out.json>
  python3 score.py final <agreed.json> <adjudication.json> <reference R.json> <contested.json> <out.json>
"""
import json
import pathlib
import sys

ELEMENTS = ("subject", "relation", "object_or_value", "polarity", "modality_generality", "conditions", "attitude",
            "evidence_kind", "attribution")


def merge(j1, j2):
    """Two blind judgements of one list -> the agreed parts and the disagreements an adjudicator decides (REPORT 3.2):
    the item verdict, the match, each element grade, the R verdicts, and every critical error only one judge lists."""
    u1, u2 = {u["pid"]: u for u in j1["u_items"]}, {u["pid"]: u for u in j2["u_items"]}
    r1, r2 = {r["id"]: r for r in j1["r_items"]}, {r["id"]: r for r in j2["r_items"]}
    agreed, dis = {"u": {}, "r": {}}, {"u": [], "r": [], "critical": []}
    for pid in sorted(set(u1) | set(u2)):
        a, b = u1.get(pid) or {}, u2.get(pid) or {}
        diff = [k for k in ("match", "verdict") if a.get(k) != b.get(k)]
        diff += [e for e in ELEMENTS if (a.get("elements") or {}).get(e) != (b.get("elements") or {}).get(e)]
        if diff:
            dis["u"].append({"pid": pid, "fields": diff, "j1": a, "j2": b})
        else:
            agreed["u"][pid] = a
    for rid in sorted(set(r1) | set(r2)):
        a, b = r1.get(rid) or {}, r2.get(rid) or {}
        if a.get("verdict") != b.get("verdict"):
            dis["r"].append({"id": rid, "j1": a, "j2": b})
        else:
            agreed["r"][rid] = a
    key = lambda c: (int(c.get("type", 0)), c.get("u"), c.get("r"))
    c1, c2 = {key(c): c for c in j1.get("critical", ())}, {key(c): c for c in j2.get("critical", ())}
    agreed["critical"] = [c1[k] for k in sorted(set(c1) & set(c2), key=str)]
    dis["critical"] = [dict(c, listed_by="j1") for k, c in c1.items() if k not in c2] + \
                      [dict(c, listed_by="j2") for k, c in c2.items() if k not in c1]
    return agreed, dis


def apply_adjudication(agreed, adjudication):
    """Agreed parts plus the adjudicator's decisions -> one judgement."""
    u = dict(agreed["u"])
    u.update({x["pid"]: x for x in adjudication["u_items"]})
    r = dict(agreed["r"])
    r.update({x["id"]: x for x in adjudication["r_items"]})
    crit = list(agreed["critical"]) + [c for c in adjudication.get("critical_kept", ())]
    return {"u_items": list(u.values()), "r_items": list(r.values()), "critical": crit}


def score(judgement, reference, contested=()):
    """The measures of REPORT 3.3 for one adjudicated judgement."""
    sci = {p["id"] for p in reference["propositions"] if not p.get("non_scientific")}
    U = judgement["u_items"]
    R = [r for r in judgement["r_items"] if r["id"] in sci]
    n = len(U)
    v = {k: sum(1 for x in U if x["verdict"] == k) for k in ("faithful", "unfaithful", "spurious")}
    faithful_cov = {x["match"] for x in U if x["verdict"] == "faithful" and x.get("match") in sci}
    rv = {k: sum(1 for x in R if x["verdict"] == k) for k in ("complete", "partial", "missed")}
    crit = {}
    for c in judgement.get("critical", ()):
        crit[str(c["type"])] = crit.get(str(c["type"]), 0) + 1

    def acc(els, keep=lambda x: True):
        m = [x for x in U if x["verdict"] != "spurious" and keep(x)]
        r = sum(1 for x in m for e in els if (x.get("elements") or {}).get(e) == "right")
        w = sum(1 for x in m for e in els if (x.get("elements") or {}).get(e) == "wrong")
        mi = sum(1 for x in m for e in els if (x.get("elements") or {}).get(e) == "missing")
        return {"right": r, "wrong": w, "missing": mi, "accuracy": round(r / (r + w), 4) if r + w else None}
    unc = lambda x: x.get("match") not in set(contested)
    return {"produced": n, "verdicts": v, "F2_precision": round(v["faithful"] / n, 4) if n else None,
            "F3_faithful_coverage": round(len(faithful_cov) / len(sci), 4), "faithful_covered": sorted(faithful_cov),
            "F5_recall": round((rv["complete"] + rv["partial"]) / len(sci), 4), "reference": rv,
            "F1_critical": crit, "F1_total": sum(crit.values()),
            "F4": {"attribution": acc(("attribution",)), "polarity": acc(("polarity",)),
                   "conditions": acc(("conditions",)), "attitude_evidence": acc(("attitude", "evidence_kind")),
                   "attitude": acc(("attitude",)), "evidence_kind": acc(("evidence_kind",)),
                   "evidence_kind_uncontested": acc(("evidence_kind",), unc)},
            "reference_scientific": len(sci)}


def sign_test(cov_x, cov_h, sci):
    """Exact two-sided sign test over reference propositions covered faithfully by exactly one of the two arms."""
    from math import comb
    h_only = len((cov_h - cov_x) & sci)
    x_only = len((cov_x - cov_h) & sci)
    n, k = h_only + x_only, min(h_only, x_only)
    p = min(1.0, 2 * sum(comb(n, i) for i in range(k + 1)) / 2 ** n) if n else 1.0
    return {"h_only": h_only, "x_only": x_only, "p_two_sided": round(p, 6)}


def main(argv):
    ld = lambda p: json.loads(pathlib.Path(p).read_text())
    if argv and argv[0] == "merge" and len(argv) == 5:
        agreed, dis = merge(ld(argv[1]), ld(argv[2]))
        pathlib.Path(argv[3]).write_text(json.dumps(agreed, indent=1))
        pathlib.Path(argv[4]).write_text(json.dumps(dis, indent=1))
        print(json.dumps({"agreed_u": len(agreed["u"]), "disputed_u": len(dis["u"]), "agreed_r": len(agreed["r"]),
                          "disputed_r": len(dis["r"]), "agreed_critical": len(agreed["critical"]),
                          "single_critical": len(dis["critical"])}))
        return
    if argv and argv[0] == "final" and len(argv) == 6:
        j = apply_adjudication(ld(argv[1]), ld(argv[2]))
        res = {"judgement": j, "score": score(j, ld(argv[3]), ld(argv[4]).get("contested_evidence_kind", ()))}
        pathlib.Path(argv[5]).write_text(json.dumps(res, indent=1))
        s = res["score"]
        print(json.dumps({k: s[k] for k in ("produced", "F2_precision", "F3_faithful_coverage", "F1_total")}))
        return
    sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
