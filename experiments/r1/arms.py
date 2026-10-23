"""R-1 arms (PROTOCOL §5). Each returns readings (one per value output, normalised for scoring) and units (for S0/MS1).

O: Crawler's 1G + quantity-knowledge observations, mapped one to one; nothing added or corrected.
N: Pee's reader as it is (propositions.read_propositions: the D-2 table reader and the sentence reader of cells).
S: crawler_tables.table_units (1F structure, 1G and Pee values reconciled, Pee's checks).
"""
import re

from universe import crawler_tables, propositions

VALUE_KINDS = ("quantity", "number", "range", "bound", "rating", "currency")


def cell_index(doc, tables):
    """(line, 1-based column) of each Markdown cell -> (table, row, col)."""
    out = {}
    for t in doc["tables"]:
        if t["index"] in tables:
            for c in t["cells"]:
                m = re.match(r"line (\d+) cell (\d+)", c["locator"])
                out[(int(m.group(1)), int(m.group(2)))] = (t["index"], c["row"], c["col"])
    return out


def _numbers(v):
    if not isinstance(v, dict):
        return []
    if "lo" in v:
        return [v["lo"], v["hi"]]
    return [v["number"]] if v.get("number") is not None else []


def arm_o(doc, readings, tables):
    grids = {t["index"]: {c["index"]: c for c in t["cells"]} for t in readings["tables"]}
    out, units = [], []
    for o in readings["observations"]:
        if o["table"] not in tables or o["kind"] not in VALUE_KINDS:
            continue
        c = grids[o["table"]][o["cell"]]
        nums = [o["low"], o["high"]] if o["low"] is not None else [o["value"]]
        prop = " ".join(o["property"] or [])
        r = {"table": o["table"], "row": c["row"], "col": c["col"], "numbers": [x for x in nums if x is not None],
             "unit": o["unit"], "bound": "upper" if o["kind"] == "bound" else None, "property": prop,
             "entity": o["product"] or "", "conditions": list(o["conditions"] or []),
             "evidence": o["evidence"]["class"], "attitude": None, "locator": f"table {o['table']} cell {o['cell']}"}
        out.append(r)
        if prop and r["numbers"]:  # a value without a property cannot be a has_value claim: not representable
            val = {"lo": nums[0], "hi": nums[1], "unit": o["unit"]} if o["low"] is not None else \
                {"number": o["value"], "unit": o["unit"]}
            units.append({"type": "proposition", "id": "O" + o["id"], "content_kind": "quantitative",
                          "relation": "has_value", "subject": prop, "object": None, "value": val,
                          "polarity": "affirmed", "modality": "actual", "generality": "generic",
                          "conditions": ([{"concept": "product", "value": o["product"].lower()}] if o["product"] else [])
                          + [{"concept": x, "value": "stated"} for x in o["conditions"] or []],
                          "document_attitude": "asserted", "evidence_kind": "none_stated", "attributed_to": [],
                          "depends_on": [], "explains": [], "qualifies": None,
                          "record": {"text": "", "locator": r["locator"], "section": []}})
            r["represented"] = True
    return out, units


def arm_n(doc, lex, tables):
    idx = cell_index(doc, tables)
    units = []
    for u in propositions.read_propositions(doc, lex)["units"]:
        m = re.match(r"line (\d+) cell (\d+)", (u.get("record") or {}).get("locator") or "")
        if m and (int(m.group(1)), int(m.group(2))) in idx:
            u = dict(u, _cell=idx[(int(m.group(1)), int(m.group(2)))])
            units.append(u)
    out = []
    for u in units:
        if u["relation"] != "has_value" or not _numbers(u.get("value")):
            continue
        t, r, c = u["_cell"]
        out.append(reading_of_unit(u, t, r, c))
    return out, [{k: v for k, v in u.items() if k != "_cell"} for u in units if u["relation"] == "has_value"]


def reading_of_unit(u, t, r, c):
    v = u["value"]
    return {"table": t, "row": r, "col": c, "numbers": _numbers(v), "unit": v.get("unit"), "bound": v.get("bound"),
            "property": u.get("subject") or "", "entity": " ".join(x["value"] for x in u.get("conditions") or []
                                                                 if x.get("concept") not in ("point in time",)),
            "conditions": [f"{x.get('concept')} {x.get('value')}" for x in u.get("conditions") or []],
            "evidence": u.get("evidence_kind"), "attitude": u.get("document_attitude"),
            "locator": u["record"]["locator"], "represented": True}


def arm_s(doc, readings, lex, tables):
    units, ledger = crawler_tables.table_units(doc, readings, lex, tables)
    out = [reading_of_unit(u, u["reading"]["table"], u["reading"]["row"], u["reading"]["col"]) for u in units]
    clean = [{k: v for k, v in u.items() if k != "reading"} for u in units]
    return out, clean, ledger
