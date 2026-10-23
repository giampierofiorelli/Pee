"""I-2 store audit (REPORT.md I2-a, I2-d). Extends the I-1 audit (experiments/i1/run_i1.py, unchanged) with the I-2
items: relations proposed by acquisition (interpretations, never verdicts), lifted conclusions (proposed by the
contract through a lifting record), co-reference proposals (recognition) and identity readings."""


def reaches_records(st, item_id, seen=None):
    seen = set() if seen is None else seen
    if item_id in seen or not st.has(item_id):
        return set()
    seen.add(item_id)
    it = st.get(item_id)
    if it.kind == "record":
        return {item_id}
    nxt = list(it.body["premises"]) if it.kind == "inference_record" else (
        list(st.get(f"ST:{item_id}").body["grounds"]) if st.has(f"ST:{item_id}") else [])
    out = set()
    for g in nxt:
        out |= reaches_records(st, g, seen)
    return out


def audit(st):
    rows, bad = [], []
    for c in st.of("content"):
        src = c.provenance.get("source", "")
        form = c.body.get("form")
        if c.provenance.get("basis") != "derived":
            continue
        if src == "acquisition service" and form not in ("quantity", "attribution", "relation"):
            bad.append(f"{c.id}: acquisition proposed a {form}")
        if src == "recognition service" and form != "co_reference":
            bad.append(f"{c.id}: recognition proposed a {form}")
        if form in ("classification", "comparison", "selection") or (form == "quantity" and (c.situating.get("situation")
                                                                               or c.body.get("lifted"))):
            service = src.replace(" service", "")
            ok_service = service in ("rules", "model") or (service == "contract" and c.body.get("lifted"))
            recs = reaches_records(st, c.id)
            rows.append({"id": c.id, "form": form, "service": service, "lifted": bool(c.body.get("lifted")),
                         "records_reached": len(recs)})
            if not ok_service or not recs:
                bad.append(f"{c.id}: {form} by {service} reaching {len(recs)} records")
    # no entity is shared between documents: every referent belongs to one document
    for e in st.of("entity"):
        if e.provenance.get("basis") == "document statement" and not e.body.get("document"):
            bad.append(f"{e.id}: a document referent without its document")
    return {"pass": not bad, "conclusions": rows, "violations": bad}
