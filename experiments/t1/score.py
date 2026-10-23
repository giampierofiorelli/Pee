"""T-1 mechanical scorer (PROTOCOL.md §2-4): one scorer for A0 and A1, no inherited grades.

Every grade is computed by this program from labels and readable strings. No adjudicated grade is copied into a
score. The adjudicated grades are used only by `proxy`, to measure how often this program agrees with them.

Usage:
  python3 -I score.py score <arm export.json> <reference.json> <r_item_ids.json|-> <contested-labels.json|-> <out.json>
  python3 -I score.py proxy <arm export.json> <reference.json> <adjudicated judgement.json> <out.json>
  python3 -I score.py compare <A0 score.json> <A1 score.json> <out.json>

An arm export is the format of `experiments/o2/o2.py export`. A reference is in the A-1 annotation schema (spent: the
private O-2 copies, where strings of 6+ words or over 60 characters are SHA-256).
"""
import json
import re
import sys

JACCARD = 0.5
STOP = set("a an the of to in on for by with as and or at from into than that this these those is are be its it".split())
# PROTOCOL.md §3: old evidence kind -> evidence_nature / statement_status; None: unscored for every arm
NATURE = {"synthesis": "none_stated", "none_stated": "none_stated", "original_measurement": "measurement",
          "standard_or_regulation": "standard_text", "expert_judgement": "professional_observation",
          "guidance": "standard_text", "proposal": None, "hypothesis": "none_stated"}
STATUS = {"synthesis": "general_claim", "original_measurement": "observed_result", "expert_judgement": "general_claim",
          "guidance": "recommendation", "proposal": None, "hypothesis": "hypothesis"}
SHARED = ("subject", "relation", "object_or_value", "polarity", "modality", "conditions", "attitude",
          "evidence_nature", "statement_status", "source_link", "deontic_force")
SOURCE_ID = re.compile(r"[A-Z]{1,4}\d{1,4}")


def hashed(x):
    return isinstance(x, str) and x.startswith("sha256:")


def words(s):
    return {w for w in re.findall(r"[a-z0-9%°]+", str(s or "").lower()) if w not in STOP}


def jacc(a, b):
    a, b = words(a), words(b)
    if not a and not b:
        return 1.0
    return len(a & b) / len(a | b)


def rel(p):
    """(relation, polarity), normalised: `does_not_establish` is `establishes` negated; `other` keeps its verb."""
    r, pol = (p.get("relation") or "").strip(), p.get("polarity")
    if r == "does_not_establish":
        r, pol = "establishes", "negated" if pol == "affirmed" else "affirmed"
    if r == "other" and p.get("verb"):
        r = "other: " + p["verb"]
    r = re.sub(r"^other:\s*", "other: ", r)
    return r, pol


def force(p):
    """PROTOCOL.md §2.2, the same table for reference and readers; modality never changes it."""
    r, pol = rel(p)
    pos = pol == "affirmed"
    if r == "requires":
        return "obligation" if pos else "permission_to_omit"
    if r in ("other: prohibits", "other: forbids"):
        return "prohibition" if pos else "permission"
    if r == "other: permits":
        return "permission" if pos else "prohibition"
    if r == "recommends":
        return "recommendation" if pos else "discouragement"
    return None


def ev(p):
    e = p.get("evidence_kind")
    return e[0] if isinstance(e, list) and e else e


def status(p, kind):
    e = ev(p)
    if e in ("none_stated", "standard_or_regulation"):
        f = force(p)
        if f:
            return "requirement" if f in ("obligation", "prohibition") else "recommendation"
        return None if kind == "norm" else "general_claim"
    return STATUS.get(e)


def readable(r):
    return not (hashed(r.get("subject")) or hashed(r.get("object")) or any(
        hashed(c.get("concept")) or hashed(c.get("value")) for c in r.get("conditions") or ()))


def value_equal(a, b):
    if not a or not b:
        return False
    num = lambda v: sorted(float(v[k]) for k in ("number", "lo", "hi", "low", "high") if v.get(k) is not None)
    return num(a) == num(b)


def match(item, refs):
    """The readable reference proposition an item expresses: overlapping lines, subject and object (or value) each
    with content-word Jaccard >= 0.5; the best pair wins. None when there is no such proposition."""
    best = None
    for r in refs:
        if not set(item["lines"]) & set(r["lines"]):
            continue
        js = jacc(item.get("subject"), r.get("subject"))
        if item.get("value") or r.get("value"):
            jo = 1.0 if value_equal(item.get("value"), r.get("value")) else 0.0
        else:
            jo = jacc(item.get("object"), r.get("object"))
        if js >= JACCARD and jo >= JACCARD and (best is None or js + jo > best[0]):
            best = (js + jo, r)
    return best[1] if best else None


def grade(item, r, contested):
    """Element grades of one matched item: right, wrong, missing or unscored."""
    g = {"subject": "right", "object_or_value": "right"}
    ir, ip = rel(item)
    rr, rp = rel(r)
    g["relation"] = "right" if ir == rr else "wrong"
    g["polarity"] = "right" if ip == rp else "wrong"
    g["modality"] = "right" if item.get("modality") == r.get("modality") else "wrong"
    ic, rc = item.get("conditions") or [], r.get("conditions") or []
    if not rc and not ic:
        g["conditions"] = "right"
    elif rc and not ic:
        g["conditions"] = "missing"
    else:
        ok = len(ic) == len(rc) and all(
            max(jacc(c.get("concept"), d.get("concept")) for d in rc) >= JACCARD for c in ic)
        g["conditions"] = "right" if ok else "wrong"
    g["attitude"] = "right" if item.get("document_attitude") == r.get("document_attitude") else "wrong"
    labels = {r.get("evidence_kind")} | ({contested[r["id"]]} if r["id"] in contested else set())
    rn = {NATURE.get(x) for x in labels} - {None}
    inat = NATURE.get(ev(item))
    g["evidence_nature"] = "unscored" if not rn or inat is None else ("right" if inat in rn else "wrong")
    rs = {status(dict(r, evidence_kind=x), r.get("content_kind")) for x in labels} - {None}
    ist = status(item, r.get("content_kind"))
    g["statement_status"] = "unscored" if not rs or ist is None else ("right" if ist in rs else "wrong")
    ra = set(r.get("attributed_to") or ())
    ia = {x for x in item.get("attributed_to") or () if SOURCE_ID.fullmatch(str(x))}
    named = [x for x in item.get("attributed_to") or () if x not in ia]
    if not ra:
        g["source_link"] = "wrong" if ia or named else "right"
    else:
        g["source_link"] = "right" if ia & ra else "wrong" if (ia or named) else "missing"
    rf, iff = force(r), force(item)
    g["deontic_force"] = "unscored" if rf is None and iff is None else ("right" if rf == iff else "wrong")
    return g


def criticals(item, r, g):
    """Mechanically detectable critical types (PROTOCOL.md §2.6), at most one per wrong element, in the order
    1, 7, 3, 4, 5. Types 2 and 6 and the bearer part of type 7 need a judge and are not counted here."""
    out = []
    struct = g["subject"] == g["object_or_value"] == "right"
    if struct and g["relation"] == "right" and g["polarity"] == "wrong":
        out.append(1)
    elif struct and g["deontic_force"] == "wrong" and force(r) and force(item):
        out.append(7)
    if r.get("document_attitude") in ("proposed", "hypothesised", "questioned") and \
            item.get("document_attitude") in ("asserted", "reported"):
        out.append(3)
    if ev(item) == "original_measurement" and r.get("evidence_kind") != "original_measurement":
        out.append(4)
    if g["source_link"] == "wrong" and item.get("attributed_to"):
        out.append(5)
    return out


def score(export, reference, rids, contested, out):
    items = json.load(open(export))["propositions"]
    refs = json.load(open(reference))["propositions"]
    keep = set(json.load(open(rids))) if rids != "-" else {r["id"] for r in refs}
    refs = [r for r in refs if r["id"] in keep]
    con = {c["id"]: c["second_arbitration_label"] for c in json.load(open(contested))["contested"]} \
        if contested != "-" else {}
    read = [r for r in refs if readable(r)]
    rows, by_ref = [], {}
    for it in items:
        r = match(it, read)
        row = {"item": it.get("item"), "match": r["id"] if r else None}
        if r:
            g = grade(it, r, con)
            row.update(grades=g, critical=criticals(it, r, g))
            by_ref.setdefault(r["id"], []).append(row)
        rows.append(row)
    per_ref = {}
    counts = {"right": 0, "wrong": 0, "missing": 0, "unscored": 0, "absent": 0}
    complete = 0
    for r in read:
        cand = by_ref.get(r["id"], [])
        best = max(cand, key=lambda x: sum(v == "right" for v in x["grades"].values())) if cand else None
        if best:
            for k in SHARED:
                counts[best["grades"][k]] += 1
            complete += all(best["grades"][k] in ("right", "unscored") for k in SHARED)
        else:
            counts["absent"] += len(SHARED)
        per_ref[r["id"]] = {"kind": r.get("content_kind"), "best": best["item"] if best else None}
    graded = [x for x in rows if x.get("grades")]
    wrong = sum(v == "wrong" for x in graded for v in x["grades"].values())
    read_el = sum(v in ("right", "wrong") for x in graded for v in x["grades"].values())
    crit = {}
    for x in graded:
        for t in x["critical"]:
            crit[str(t)] = crit.get(str(t), 0) + 1
    norms = [r for r in read if r.get("content_kind") == "norm"]
    denom = sum(counts[k] for k in ("right", "wrong", "missing", "absent"))
    res = {"schema": "pee.t1.mechanical-score.v1", "items": len(items), "items_matched": len(graded),
           "items_unscorable": len(items) - len(graded), "reference_scientific": len(refs),
           "reference_readable": len(read), "readable_matched": sum(1 for r in read if per_ref[r["id"]]["best"]),
           "norms_readable": len(norms), "norms_matched": sum(1 for r in norms if per_ref[r["id"]]["best"]),
           "elements": counts, "right_element_share": round(counts["right"] / denom, 4) if denom else None,
           "wrong_rate": round(wrong / read_el, 4) if read_el else None,
           "complete_faithful_coverage": round(complete / len(read), 4) if read else None,
           "critical_mechanical": crit, "rows": rows, "per_reference": per_ref}
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k not in ("rows", "per_reference")}))
    return res


def proxy(export, reference, judgement, out):
    """Agreement of this program with an adjudicated judgement: same matched proposition, and subject and object both
    graded right by the adjudicator. Counted over items whose adjudicated match is readable or which the program
    matches. Both sides are computed independently; nothing is copied."""
    items = {i["item"]: i for i in json.load(open(export))["propositions"]}
    refs = {r["id"]: r for r in json.load(open(reference))["propositions"]}
    read = [r for r in refs.values() if readable(r)]
    J = json.load(open(judgement))
    J = J.get("judgement", J)
    n = agree = 0
    detail = {"same_match_structure_right": 0, "same_match_structure_not_right": 0, "program_only": 0,
              "adjudicator_only": 0, "different_match": 0}
    for u in J["u_items"]:
        m = match(items[u["pid"]], read)
        adj = u.get("match") if u["verdict"] != "spurious" else None
        adj_read = adj in refs and readable(refs[adj])
        if not adj_read and m is None:
            continue
        n += 1
        e = u.get("elements") or {}
        if m is not None and adj == m["id"]:
            if e.get("subject") == "right" and e.get("object_or_value") == "right":
                agree += 1
                detail["same_match_structure_right"] += 1
            else:
                detail["same_match_structure_not_right"] += 1
        elif m is not None and not adj_read:
            detail["program_only"] += 1
        elif m is None:
            detail["adjudicator_only"] += 1
        else:
            detail["different_match"] += 1
    res = {"compared": n, "agree": agree, "agreement": round(agree / n, 4) if n else None, "threshold": 0.85,
           "detail": detail}
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps(res))
    return res


def compare(a0, a1, out):
    A, B = json.load(open(a0)), json.load(open(a1))
    keys = ("right_element_share", "wrong_rate", "complete_faithful_coverage", "readable_matched", "norms_matched",
            "items_unscorable")
    res = {k: {"A0": A[k], "A1": B[k]} for k in keys}
    res["critical_mechanical"] = {"A0": A["critical_mechanical"], "A1": B["critical_mechanical"]}
    json.dump(res, open(out, "w"), indent=1)
    print(json.dumps(res))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["score"] and len(a) == 6:
        score(*a[1:])
    elif a[:1] == ["proxy"] and len(a) == 5:
        proxy(*a[1:])
    elif a[:1] == ["compare"] and len(a) == 4:
        compare(*a[1:])
    else:
        sys.exit(__doc__)
