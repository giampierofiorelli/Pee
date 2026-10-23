"""O-2: three readings of one teaching document, represented in the same S0/MS1 universe (REPORT.md section 2).

* **A**: A-1's proposition reader (``propositions.read_propositions``), unchanged.
* **T**: Crawler's ``knowledge_translation.translateDocument`` (``engine-ts/``, unchanged), run by ``bridge.mjs``. Its
  statements are mapped to proposition units by ``adapt`` (section 2.2). The adapter is a mapping, not a reader: it
  opens the document only to turn a block's first line into a line range.
* **H**: A's units, with element groups taken from aligned T statements according to ``hybrid-choices.json``, and
  unaligned T statements if the choices admit them (section 2.3). H has no reading rule of its own.

Every arm then goes through the same steps: ``markdown.read``, ``knowledge_acquisition.read_units`` (references,
labels, kinds) and ``knowledge_acquisition.represent``. The export renders universe items with A-1's
``fidelity.render``; it never reads the document. Nothing is persisted.

Usage:
  python3 o2.py export <arm A|T|H> <document.md> <bridge.json> <passages meta.json> <split> <out.json> [choices.json]
  python3 o2.py choose <A export> <T export> <A judgement> <T judgement> <out choices.json>   (development only)
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
EXP = HERE.parent
sys.path[:0] = [str(EXP / "universe"), str(EXP / "s1core"), str(EXP / "a1")]

from universe import acquisition, knowledge_acquisition as ka, loader, markdown, propositions, rules  # noqa: E402
from universe.store import Store, thaw  # noqa: E402
import fidelity  # noqa: E402  (A-1's renderer and evidence words, reused unchanged)

HOLDER = "owner research package author"
URL = "document:SPEAKERS-COMPENDIUM"

# section 2.2: translator statement type -> (relation, content_kind); special handling below for the marked types
TYPE_MAP = {
    "increases": ("increases", "causal"), "decreases": ("decreases", "causal"),
    "depends_on": ("depends_on", "dependence"), "requires": ("requires", "norm"),
    "is_not": ("is_a", "classification"), "not_sufficient": ("establishes", "method"),
    "measured_by": ("measures", "method"), "composed_of": ("part_of", "classification"),
    "definition": ("defined_as", "definition"), "not_comparable": ("differs_from", "comparison"),
    "limitation": ("other: limitation", "scope"), "method_step": ("other: method step", "method"),
    "quantitative_finding": ("has_value", "quantitative"),
}
NEGATED_TYPES = {"is_not", "not_sufficient"}
# section 2.2: the document's own status markers -> (attitude, evidence kind); never upgraded
STATUS = {
    "proposed_method": ("proposed", "proposal"), "hypothesis": ("hypothesised", "hypothesis"),
    "general_principle": ("asserted", "synthesis"), "source_observation": ("reported", "none_stated"),
    "expert_judgement": ("asserted", "expert_judgement"), "normative_rule": ("asserted", "standard_or_regulation"),
}
CAUTION = ["hypothesised", "proposed", "reported", "asserted"]  # the most cautious attitude wins
HEDGE = {"can": "possible", "could": "possible", "may": "possible", "might": "possible", "tends to": "typical",
         "tend to": "typical"}
LIST_ITEM = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s+")


def base():
    st = Store()
    loader.load_general_knowledge(st, legacy=False)
    return st


def block_range(lines, first):
    """The lines of the block that starts at ``first`` (1-based): a list item or table row is one line; a paragraph
    runs to the next blank line, heading, list item, table row or rule."""
    i = first - 1
    if i >= len(lines) or LIST_ITEM.match(lines[i]) or lines[i].lstrip().startswith("|"):
        return first, first
    j = i
    while j + 1 < len(lines):
        n = lines[j + 1]
        if not n.strip() or n.startswith("#") or LIST_ITEM.match(n) or n.lstrip().startswith("|") or \
                re.fullmatch(r"\s*---+\s*", n):
            break
        j += 1
    return first, j + 1


def _status(markers):
    known = [m for m in markers if m in STATUS]
    if not known:
        return "asserted", "synthesis"
    att = min((STATUS[m][0] for m in known), key=CAUTION.index)
    first = next(m for m in known if STATUS[m][0] == att)
    return STATUS[first]


def _text(span):
    return (span or {}).get("text") or None


def _conditions(st):
    out = []
    for side in ("subject", "object"):
        for a in (st.get(side) or {}).get("axes") or ():
            out.append({"concept": a.get("axis"), "value": a.get("value")})
    return out


def adapt(statements, lines):
    """Translator statements -> proposition units (section 2.2), and the account of every statement."""
    units, account = [], {"statements": len(statements), "mapped": 0, "refused_self_check": 0, "units": 0}
    for k, st in enumerate(statements):
        if st.get("selfCheck"):
            account["refused_self_check"] += 1
            continue
        account["mapped"] += 1
        typ = st["type"]
        rel, kind = TYPE_MAP.get(typ, (f"other: {typ.replace('_', ' ')}", "existence"))
        subj, obj = _text(st.get("subject")), _text(st.get("object"))
        pol = "negated" if (st.get("polarity") == "negative") != (typ in NEGATED_TYPES) else "affirmed"
        hedge = (st.get("hedge") or "").lower() or None
        att, ev = _status(st.get("status") or ())
        a, b = block_range(lines, st["provenance"]["line"])
        common = {"type": "proposition", "content_kind": kind, "value": None, "polarity": pol,
                  "modality": HEDGE.get(hedge, "possible") if hedge else "actual", "generality": "generic",
                  "conditions": _conditions(st), "document_attitude": att, "evidence_kind": ev,
                  "attributed_to": list(st.get("refs") or ()), "depends_on": [], "explains": [], "qualifies": None,
                  "record": {"text": st.get("quote") or "", "locator": f"lines {a}-{b} statement {k + 1}",
                             "section": list(st["provenance"].get("headings") or ())},
                  "t_source": {"index": k, "type": typ, "status": list(st.get("status") or ()), "hedge": hedge}}
        if typ == "not_comparable":
            common["note"] = "not comparable"
        if typ == "measured_by":
            pairs = [(obj, subj)]
        elif typ == "composed_of":
            parts = [_text(p) for p in st.get("parts") or () if _text(p)]
            pairs = [(p, subj) for p in parts] or [(subj, obj)]
        else:
            pairs = [(subj, obj)]
        for s, o in pairs:
            u = dict(common, id=f"T{len(units) + 1:05d}", relation=rel, subject=s, object=o)
            units.append(u)
    account["units"] = len(units)
    return units, account


# ---- hybrid (section 2.3) --------------------------------------------------------------------------------------------
GROUPS = {"structure": ("subject", "relation", "object", "value", "content_kind"), "polarity": ("polarity",),
          "modality": ("modality", "generality"), "conditions": ("conditions",),
          "attitude": ("document_attitude", "evidence_kind"), "attribution": ("attributed_to",)}


def unit_lines(u):
    m = re.search(r"lines? (\d+)(?:-(\d+))?", (u.get("record") or {}).get("locator") or "")
    return set(range(int(m.group(1)), int(m.group(2) or m.group(1)) + 1)) if m else set()


def content_words(u):
    return {w for w in re.findall(r"[a-z0-9]+", f"{u.get('subject') or ''} {u.get('object') or ''}".lower())
            if len(w) > 2}


def align(a_units, t_units, threshold=0.34):
    """For each A unit, its best T statement (line overlap, Jaccard of subject and object words >= threshold)."""
    by_line = {}
    for t in t_units:
        for ln in unit_lines(t):
            by_line.setdefault(ln, []).append(t)
    pairs = {}
    for a in a_units:
        aw, best, bt = content_words(a), 0.0, None
        for t in {id(x): x for ln in unit_lines(a) for x in by_line.get(ln, ())}.values():
            tw = content_words(t)
            j = len(aw & tw) / len(aw | tw) if aw | tw else 0.0
            if j > best:
                best, bt = j, t
        if bt is not None and best >= threshold:
            pairs[a["id"]] = (bt, round(best, 3))
    return pairs


def holds(t, group):
    """Whether a T unit holds the elements of a group (a missing T element never deletes an A element)."""
    ts = t.get("t_source") or {}
    return {"structure": bool(t.get("subject") and (t.get("object") or t.get("relation") in ("has_value",))),
            "polarity": True, "modality": ts.get("hedge") is not None, "conditions": bool(t.get("conditions")),
            "attitude": bool(ts.get("status")), "attribution": bool(t.get("attributed_to"))}[group]


def hybrid(a_units, t_units, choices):
    pairs = align(a_units, t_units)
    out, used = [], set()
    for a in a_units:
        u = dict(a)
        if a["id"] in pairs:
            t, _ = pairs[a["id"]]
            used.add(t["id"])
            for g, fields in GROUPS.items():
                if choices["groups"].get(g) == "T" and holds(t, g):
                    for f in fields:
                        u[f] = t.get(f)
            u["h_aligned"] = t["id"]
        out.append(u)
    added = 0
    if choices.get("include_unaligned_T"):
        for t in t_units:
            if t["id"] not in used:
                out.append(dict(t, id="H" + t["id"]))
                added += 1
    return out, {"aligned": len(pairs), "unaligned_T_added": added}


# ---- build and export -----------------------------------------------------------------------------------------------
def read_arm_units(arm, md_text, doc, lex, bridge, choices):
    a_units = propositions.read_propositions(doc, lex)["units"] if arm in ("A", "H") else []
    info = {}
    if arm in ("T", "H"):
        t_units, info["adapter"] = adapt(bridge["statements"], md_text.split("\n"))
    if arm == "A":
        return a_units, info
    if arm == "T":
        return t_units, info
    units, info["hybrid"] = hybrid(a_units, t_units, choices)
    return units, info


def build(arm, md_path, bridge_path=None, choices_path=None):
    md_text = pathlib.Path(md_path).read_text()
    st = base()
    doc = markdown.read(md_text, URL, HOLDER)
    lex = acquisition.Lexicon(st)
    bridge = json.loads(pathlib.Path(bridge_path).read_text()) if bridge_path else None
    choices = json.loads(pathlib.Path(choices_path).read_text()) if choices_path else None
    units, info = read_arm_units(arm, md_text, doc, lex, bridge, choices)
    base_units = ka.read_units(doc, lex)
    summary = ka.represent(st, base_units + units, URL, HOLDER, lex)
    props = [u for u in units if u["type"] == "proposition"]
    abst = [x for x in summary.get("abstained", ()) if x.get("unit") == "proposition"]
    info["units"] = len(props)
    info["represented"] = len(summary.get("proposition_attributions", ()))
    info["abstained"] = {}
    for x in abst:
        info["abstained"][x["why"]] = info["abstained"].get(x["why"], 0) + 1
    return st, units, info


def export_store(store, scored_lines):
    """The propositions held for the scored lines, rendered from universe items (A-1 fidelity.export, without a
    snapshot: the universe exists only in this process)."""
    meta = rules.relation_meta(store)
    scored = set(scored_lines)
    rows = []
    for p in rules.propositions(store):
        for a in rules.attributions(store, p.id):
            if a.body.get("document") != URL:
                continue
            rec = store.get(a.body["reports"]).body if a.body.get("reports") and store.has(a.body["reports"]) else {}
            ln = fidelity._lines(rec.get("locator"))
            if not ln or not set(range(ln[0], ln[1] + 1)) & scored:
                continue
            b = p.body
            rel = (meta.get(b["relation"]) or {}).get("designations", [b["relation"]])[0]
            cites = [store.get(c).body.get("cited_id") for c in a.body.get("cites") or () if store.has(c)]
            row = {"pid": p.id, "lines": list(range(ln[0], ln[1] + 1)),
                   "subject": fidelity._label(store, b["subject"]), "relation": rel,
                   "object": fidelity._label(store, b.get("object")), "value": thaw(b.get("value")),
                   "polarity": b.get("polarity"), "modality": b.get("modality"),
                   "conditions": [{"concept": fidelity._label(store, c["concept"]), "value": c["value"]}
                                  for c in b.get("conditions") or ()],
                   "content_kind": b.get("content_kind"), "document_attitude": a.body.get("attitude"),
                   "evidence_kind": [fidelity.EVIDENCE_WORDS.get(e, e) for e in a.body.get("evidence_classes") or ()],
                   "attributed_to": [x for x in cites if x] + list(a.body.get("unresolved") or ()) +
                                    [fidelity._label(store, x) for x in a.body.get("attributed_to") or () if x]}
            if b.get("verb"):
                row["verb"] = b["verb"]
            row["rendered"] = fidelity.render(row)
            rows.append(row)
    rows.sort(key=lambda r: (r["lines"][0], r["pid"]))
    for i, r in enumerate(rows):
        r["item"] = f"U{i + 1:04d}"
    return rows


JUDGE_ELEMENTS = {"structure": ("subject", "relation", "object_or_value"), "polarity": ("polarity",),
                  "modality": ("modality_generality",), "conditions": ("conditions",),
                  "attitude": ("attitude", "evidence_kind"), "attribution": ("attribution",)}


def choose(a_export, t_export, a_judge, t_judge, min_pairs=10):
    """Section 2.3 on development: per element group, the source with the higher element accuracy (right / (right +
    wrong)) on aligned pairs of judged items; A on a tie or below ``min_pairs`` pairs. The pairs are formed on the
    exported items with the same ``align`` rule as H (lines and subject/object words)."""
    def rows(export, judge):
        g = {u["pid"]: u for u in judge["u_items"]}
        out = []
        for r in export["propositions"]:
            out.append(dict(r, id=r["item"], record={"locator": f"lines {r['lines'][0]}-{r['lines'][-1]}"},
                            judged=g.get(r["item"])))
        return out
    A, T = rows(a_export, a_judge), rows(t_export, t_judge)
    tby = {t["id"]: t for t in T}
    pairs = [(a, tby[p[0]["id"]]) for a in A for p in [align([a], T).get(a["id"])] if p]
    both = [(a, t) for a, t in pairs if a["judged"] and t["judged"] and a["judged"]["verdict"] != "spurious"
            and t["judged"]["verdict"] != "spurious"]
    acc, groups = {}, {}
    for g, els in JUDGE_ELEMENTS.items():
        res = {}
        for side, k in (("A", 0), ("T", 1)):
            r = w = 0
            for pr in both:
                e = pr[k]["judged"].get("elements") or {}
                r += sum(1 for x in els if e.get(x) == "right")
                w += sum(1 for x in els if e.get(x) == "wrong")
            res[side] = {"right": r, "wrong": w, "accuracy": round(r / (r + w), 4) if r + w else None}
        acc[g] = res
        ta, tt = res["A"]["accuracy"], res["T"]["accuracy"]
        groups[g] = "T" if len(both) >= min_pairs and tt is not None and (ta is None or tt > ta) else "A"
    used = {t["id"] for _, t in pairs}
    prec = lambda items: (sum(1 for x in items if x["judged"] and x["judged"]["verdict"] == "faithful") /
                          len(items)) if items else None
    un_t = [t for t in T if t["id"] not in used]
    pa, pu = prec(A), prec(un_t)
    return {"schema": "pee.o2.hybrid-choices.v1", "groups": groups,
            "include_unaligned_T": pu is not None and pa is not None and pu >= pa,
            "evidence": {"aligned_pairs": len(pairs), "judged_pairs": len(both), "accuracy": acc,
                         "precision_A_all": pa, "precision_T_unaligned": pu, "T_unaligned": len(un_t),
                         "min_pairs": min_pairs}}


def main(argv):
    if argv and argv[0] == "choose" and len(argv) == 6:
        ld = lambda p: json.loads(pathlib.Path(p).read_text())
        res = choose(ld(argv[1]), ld(argv[2]), ld(argv[3]), ld(argv[4]))
        pathlib.Path(argv[5]).write_text(json.dumps(res, indent=1))
        print(json.dumps({k: res[k] for k in ("groups", "include_unaligned_T")}))
        return
    if len(argv) < 7 or argv[0] != "export":
        sys.exit(__doc__)
    arm, md, bridge, meta, split, out = argv[1:7]
    choices = argv[7] if len(argv) > 7 else None
    st, units, info = build(arm, md, bridge if arm in ("T", "H") else None, choices)
    scored = json.loads(pathlib.Path(meta).read_text())[split]["scored_lines"]
    rows = export_store(st, scored)
    res = {"arm": arm, "split": split, "info": info, "items": len(rows), "propositions": rows}
    pathlib.Path(out).write_text(json.dumps(res, indent=1, ensure_ascii=False))
    print(json.dumps({"arm": arm, "split": split, "items": len(rows), "info": info}))


if __name__ == "__main__":
    main(sys.argv[1:])
