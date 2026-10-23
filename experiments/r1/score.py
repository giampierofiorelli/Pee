"""R-1 scorer (PROTOCOL §6), fixed with the S freeze and before the sealed run.

Rules decided here, before any sealed output exists:
- match: same cell, and one of the reading's numbers equals one of the item's numbers (tolerance 1e-6);
- wrong number (critical): a matched reading has a number (or range end) that is not the item's;
- unit: canonical forms equal (Pee's unit surfaces; case, degree signs and spaces ignored; L/day = L/d). A reading
  without a unit for an item with one is "unit missing" (not critical); a different unit is critical;
- property and entity: correct when every content word of one alternative appears in the field. "structured": the
  dedicated field (property; entity); "preserved": any text field of the reading (property, entity, conditions,
  bound words, attitude). Item entity null: correct;
- wrong entity (critical): the reading names an entity and no entity alternative is preserved in the reading;
- essential condition dropped (critical): an essential condition is not preserved while the value is kept;
- declaration presented as measurement (critical): the item's nature is not "measured" and the reading's evidence is
  a measurement class (publisher_measured, original_measurement, E:original_measurement);
- fully correct (M3): matched, unit right, property structured, entity structured, essential conditions preserved,
  no critical error;
- spurious: a reading in a sealed cell that matches no item.
"""
import re

MEASURED = {"publisher_measured", "original_measurement", "E:original_measurement"}
BOUND_WORDS = {"upper": "upper max maximum ceiling below less limit", "lower": "lower min minimum above at least"}
UNIT_ALIASES = {"degc": "°c", "°c": "°c", "degf": "°f", "°f": "°f", "l/d": "l/day", "l/day": "l/day", "m2": "m²",
                "m²": "m²", "minutes": "min", "min": "min", "%": "%", "db": "db", "ppm": "ppm", "ppb": "ppb", "w": "w",
                "h": "h", "hours": "h", "hour": "h", "year": "year", "years": "year", "m": "m", "l": "l"}


def words(s):
    out = set()
    for w in re.findall(r"[a-z0-9]+", str(s or "").lower().replace("₂", "2")):
        out.add(w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w)
    return out


def unit(u):
    if u is None:
        return None
    k = str(u).strip().lower().replace(" ", "")
    return UNIT_ALIASES.get(k, k)


def ok(alts, field_words):
    return any(words(" ".join(a)) <= field_words for a in alts)


def all_words(r):
    return words(" ".join([r.get("property") or "", r.get("entity") or "", " ".join(r.get("conditions") or []),
                           BOUND_WORDS.get(r.get("bound") or "", ""), r.get("attitude") or ""]))


def judge(item, r):
    nums = item["numbers"]
    eq = lambda a, b: abs(float(a) - float(b)) < 1e-6  # noqa: E731
    crit = []
    if any(not any(eq(x, y) for y in nums) for x in r["numbers"]):
        crit.append("wrong number")
    iu, ru = unit(item["unit"]), unit(r["unit"])
    unit_ok = iu == ru if iu not in ("date",) else ru is None or ru == "date"
    if iu and ru and iu != ru and iu != "date" and iu != "year":
        crit.append("wrong unit")
    allw = all_words(r)
    prop_s = ok(item["property"], words(r.get("property")))
    prop_p = ok(item["property"], allw)
    ent_s = item["entity"] is None or ok(item["entity"], words(r.get("entity")))
    ent_p = item["entity"] is None or ok(item["entity"], allw)
    if item["entity"] is not None and (r.get("entity") or "").strip() and not ent_p:
        crit.append("wrong entity")
    ess = [c for c in item["conditions"] if c["essential"]]
    ess_ok = all(ok(c["alts"], allw) for c in ess)
    if not ess_ok:
        crit.append("essential condition dropped")
    if item["nature"] != "measured" and r.get("evidence") in MEASURED:
        crit.append("declaration presented as measurement")
    conds = [ok(c["alts"], allw) for c in item["conditions"]]
    return {"unit": unit_ok, "unit_missing": bool(iu) and ru is None, "property_structured": prop_s,
            "property_preserved": prop_p, "entity_structured": ent_s, "entity_preserved": ent_p,
            "conditions_preserved": sum(conds), "conditions": len(conds), "essential_ok": ess_ok, "critical": crit,
            "fully_correct": unit_ok and prop_s and ent_s and ess_ok and not crit}


def score(items, readings, cells):
    """items: the reference items of the run's tables; readings: one arm's; cells: the set of (doc, table) scored."""
    eq = lambda a, b: abs(float(a) - float(b)) < 1e-6  # noqa: E731
    used, rows = set(), []
    for it in items:
        cand = [k for k, r in enumerate(readings) if (r["doc"], r["table"], r["row"], r["col"]) ==
                (it["doc"], it["table"], it["row"], it["col"]) and any(eq(x, y) for x in r["numbers"] for y in it["numbers"])
                and k not in used]
        if not cand:
            rows.append({"id": it["id"], "found": False})
            continue
        best = max(cand, key=lambda k: (judge(it, readings[k])["fully_correct"], -len(judge(it, readings[k])["critical"])))
        used.add(best)
        rows.append(dict({"id": it["id"], "found": True, "represented": bool(readings[best].get("represented"))},
                         **judge(it, readings[best])))
    spurious = [k for k, r in enumerate(readings) if k not in used and (r["doc"], r["table"]) in cells]
    f = [r for r in rows if r["found"]]
    crit = [c for r in f for c in r["critical"]]
    from collections import Counter
    return {"items": len(items), "found": len(f), "represented": sum(r["represented"] for r in f),
            "unit_right": sum(r["unit"] for r in f), "unit_missing": sum(r["unit_missing"] for r in f),
            "property_structured": sum(r["property_structured"] for r in f),
            "property_preserved": sum(r["property_preserved"] for r in f),
            "entity_structured": sum(r["entity_structured"] for r in f),
            "entity_preserved": sum(r["entity_preserved"] for r in f),
            "conditions_preserved": f"{sum(r['conditions_preserved'] for r in f)} of {sum(r['conditions'] for r in f)}",
            "essential_conditions_ok": sum(r["essential_ok"] for r in f), "fully_correct": sum(r["fully_correct"] for r in f),
            "critical_errors": len(crit), "critical_by_type": dict(Counter(crit)), "lost": len(items) - len(f),
            "readings": len(readings), "spurious": len(spurious), "rows": rows}
