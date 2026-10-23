"""Acquisition of scientific knowledge stated by a research document (F-1; REPORT.md section 2.4, A1-A8).

Part of the acquisition service: ``acquisition.acquire_document`` calls ``acquire_knowledge`` for every document, and
the same ``Lexicon``, value reader, records, attribution and proposal contract are used. Two steps, kept apart so that
each can be checked on its own:

* **reading** (``read_units``): the document's structure becomes typed units, the same schema the blind annotators
  use (``experiments/f1/annotation-guide.md``): kinds of quantity defined in definition tables, functional notation
  (dependencies), indexed symbols (families), formulas, non-identity statements, standards and their scopes, register
  entries of cited sources, evidence legends and labels, and statements with their citations;
* **representation** (``represent``): units become universe items with provenance, attribution, standing and
  dependencies. Kinds of quantity get their dimension from their unit through the metrology; a unit that is not
  readable gives no kind. Within one document one symbol is one kind; across documents kinds are never merged; a row
  whose name is already a base kind of the same dimension supports that kind instead of duplicating it.

Every word used to read structure comes from universe items (the lexical frame, the metrology, the evidence classes,
the setting and condition concepts). The code names no domain. A cited source is recorded only as its register entry
describes it, with ``examined: false``: Pee has read the document that cites it, never the source itself.
"""
import hashlib
import json
import re

from s1core import knowledge as K
from s1core import units

from . import standing
from .dependencies import current
from .store import Item, StoreError

SERVICE = "acquisition"
PROGRAM = {"holder": "program", "basis": "derived", "source": "acquisition service"}
IDENT = re.compile(r"^[A-Za-zΑ-ω][\w.,₀-₉²³⁻]*$")
LABEL = re.compile(r"^[A-Z][A-Z0-9]*(?:[ _+/—–-]+[A-Z][A-Z0-9]*)*$")
YEAR = re.compile(r"\b(?:19|20)\d{2}\b")


def _h(*parts):
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


def _norm(s):
    from .acquisition import _norm as n
    return n(s)


def _key(s):
    from .acquisition import _name_key as k
    return k(s)


# --- units of measurement written in definitions ------------------------------------------------------------------

def _unit_end_ok(text, end):
    return end >= len(text) or not (text[end].isalnum() or text[end] in "-_")


def _only_units(seg, lex):
    """Units of a segment made only of unit expressions and connectors ("L/24h or pints/24h", "commonly cfm"), or
    None."""
    s = seg.strip(" .;:")
    while s.startswith("(") and s.endswith(")") and s.count("(") == s.count(")"):
        s = s[1:-1].strip()
    conn = sorted(lex.lang.get("unit_connectors", ()), key=len, reverse=True)
    found, pos = [], 0
    while pos < len(s):
        if s[pos].isspace():
            pos += 1
            continue
        c = next((w for w in conn if s[pos:pos + len(w)].lower() == w and (not w[-1].isalpha() or _unit_end_ok(s, pos + len(w)))), None)
        if c:
            pos += len(c)
            continue
        u = lex.unit_at(s, pos)
        if not u or not _unit_end_ok(s, u[1]):
            return None
        found.append(u[0])
        pos = u[1]
    return found or None


def _leading_unit(seg, lex):
    """A unit written first in a segment and followed by words ("Pa or inches water column ...", "L before automatic
    shutoff"). Never when the segment is a rate phrase ("... per kWh"), and never a function word ("A ...")."""
    s = seg.strip()
    if re.search(r"\bper\b", s.lower()):
        return []
    u = lex.unit_at(s, 0)
    if not u or not (u[1] >= len(s) or s[u[1]] in " ,;"):
        return []
    if s[:u[1]].strip().lower() in lex.stop:
        return []
    out = [u[0]]
    rest = s[u[1]:]
    m = re.match(r"\s+or\s+", rest)
    if m:
        u2 = lex.unit_at(rest, m.end())
        if u2 and _unit_end_ok(rest, u2[1]):
            out.append(u2[0])
    return out


def _units_in(text, lex):
    """Units a definition states: unit-only segments, parenthesised units, "in <unit>", and a unit leading a later
    segment. Returns (unit ids, the segments that name the quantity)."""
    segs = _split_top(text, ",;")
    pure = [u for seg in segs for u in (_only_units(seg, lex) or [])]
    if pure:  # a segment that is only units states the unit; units inside other segments belong to other things
        return pure, [seg for seg in segs if not _only_units(seg, lex)]
    found, names = [], []
    for i, seg in enumerate(segs):
        only = _only_units(seg, lex)
        if only:
            found += only
            continue
        for inner in re.findall(r"\(([^)]*)\)", seg):
            found += _only_units(inner, lex) or _leading_unit(inner, lex)
        for m in re.finditer(r"\bin\s+", seg):
            u = lex.unit_at(seg, m.end())
            if u and _unit_end_ok(seg, u[1]) and seg[m.end():u[1]].strip().lower() not in lex.stop:
                found.append(u[0])
                rest = seg[u[1]:]
                m2 = re.match(r"\s+or\s+", rest)
                if m2:
                    u2 = lex.unit_at(rest, m2.end())
                    if u2 and _unit_end_ok(rest, u2[1]):
                        found.append(u2[0])
        lead = _leading_unit(seg, lex)
        if lead and (i > 0 or not re.search(r"[a-z]{3,}", seg.split()[0])):
            found += lead
            continue
        names.append(seg)
    return found, names


def _trailing_unit(part, lex):
    words = part.strip().split()
    if len(words) < 2 or words[-2].lower() == "per" or words[-1].lower() in lex.stop:
        return []
    u = lex.unit_at(words[-1], 0)
    return [u[0]] if u and u[1] == len(words[-1]) else []


def _split_top(text, seps):
    out, cur, depth = [], "", 0
    for ch in text:
        depth += ch == "("
        depth -= ch == ")"
        if ch in seps and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


def resolve_units(text, lex):
    """Unit ids of a unit text as an annotator or the reader wrote it ("L/24h or pints/24h", "°C")."""
    if not text:
        return []
    found, _ = _units_in(text, lex)
    return found or (_only_units(text, lex) or [])


# --- reading ---------------------------------------------------------------------------------------------------------

def _row_type(header, lex):
    h = _norm(header)
    for t, words in lex.lang.get("row_types", {}).items():
        if any(h == _norm(w) or h.startswith(_norm(w) + " ") for w in words):
            return t
    return None


def _symbol(code):
    """(symbol, arguments, formula expression) of a code span in a definition row's first cell."""
    c = code.strip()
    if "=" in c:
        lhs, rhs = c.split("=", 1)
        return lhs.strip(), [], rhs.strip()
    m = re.match(r"^(.+?)\(([^)]*)\)$", c)
    if m:
        return m.group(1).strip(), [a.strip() for a in m.group(2).split(",") if a.strip()], None
    return c, [], None


def _base_sub(sym):
    if "_" in sym:
        b, s = sym.split("_", 1)
        return b, s
    return sym, None


def _head_name(seg, lex):
    s = re.sub(r"\([^)]*\)", " ", seg)
    s = re.split(r"\bin\s+(?=\S)", s)[0] if re.search(r"\bin\s+\S", s) else s
    s = " ".join(s.split()).strip(" .:")
    if not s or s.split()[0].lower() in lex.stop:
        return None
    return s


def _is_expression(s):
    return bool(re.fullmatch(r"[A-Za-z_][\w.]*(\s*[/×*·]\s*[A-Za-z_\d][\w.]*)+", s.strip()))


def _definition_units(cell0, cells, lex, record):
    """Units of one definition-table row."""
    out = []
    codes = [c for c in cell0.get("codes", ()) if c.strip()]
    definition = cells[1]["text"] if len(cells) > 1 else ""
    from .acquisition import parse_values
    if any(v["unit"] and not definition[:v["start"]].endswith("/") for v in parse_values(definition, lex)):
        # a number with its unit states a value of something, not the definition of a quantity
        return [{"type": "abstained", "what": "row states a value, not a definition", "record": record}]
    units_found, name_segs = _units_in(definition, lex)
    symbols = []
    for c in codes:
        sym, args, expr = _symbol(c)
        if " " in sym.strip() and not args and not expr:
            symbols.append((None, [], None, sym.strip()))  # a name in code font ("gas capacity")
        elif IDENT.match(sym) or args or expr:
            symbols.append((sym, args, expr, None))
    if not symbols:
        symbols = [(None, [], None, cell0["text"].strip())]
    head = _head_name(name_segs[0], lex) if name_segs else None
    first_seg = _split_top(definition, ",;")[0] if definition else ""
    def_expr = first_seg if _is_expression(first_seg) else None
    if def_expr and head == first_seg:
        head = None
    if len(symbols) == 1:
        sym, args, expr, name = symbols[0]
        out.append({"type": "kind", "symbol": sym, "name": name or head, "unit": " or ".join(units_found) or None,
                    "family": None, "depends_on": args, "record": record})
        for m in re.finditer(r"([a-z][a-z -]*?)\s+([A-Za-z]\w*)\s+in\s+(\S+)", definition):
            u = lex.unit_at(m.group(3), 0)
            if u:
                out.append({"type": "kind", "symbol": m.group(2), "name": m.group(1).strip().split()[-1],
                            "unit": u[0], "family": None, "depends_on": [], "record": record})
        target = sym or name
        if expr:
            out.append({"type": "formula", "target": sym, "expression": expr, "kind": "definition", "record": record})
        elif def_expr and target:
            out.append({"type": "formula", "target": target, "expression": def_expr, "kind": "definition",
                        "record": record})
        return out
    # several symbols in one row: parallel definitions, or one quantity indexed by subscripts (a family)
    n = len(symbols)
    parts = [p for p in _split_top(definition, ";") if p]
    if len(parts) != n:
        parts = [p for p in _split_top(definition, ",;") if not _only_units(p, lex)
                 and p.split()[0].lower() not in lex.stop]
    if len(parts) != n and parts:
        parts = [x.strip() for x in re.split(r"\s+(?:vs\.?|versus|and)\s+", parts[0]) if x.strip()]
    if len(parts) == n:
        shared = units_found if len(set(units_found)) >= 1 and all(not (_units_in(p, lex)[0] or _trailing_unit(p, lex))
                                                                   for p in parts[:-1]) else []
        for (sym, args, expr, name), part in zip(symbols, parts):
            own = _units_in(part, lex)[0] or _trailing_unit(part, lex)
            us = own or shared
            nm = _head_name(re.sub(r"\s+\S+$", "", part) if _trailing_unit(part, lex) else part, lex)
            out.append({"type": "kind", "symbol": sym, "name": name or nm, "unit": " or ".join(us) or None,
                        "family": None, "depends_on": args, "record": record})
        return out
    bases = {_base_sub(s[0])[0] for s in symbols if s[0]}
    subs = [_base_sub(s[0])[1] for s in symbols if s[0]]
    if len(bases) == 1 and all(subs):
        base = bases.pop()
        out.append({"type": "kind", "symbol": base, "name": head, "unit": " or ".join(units_found) or None,
                    "family": {"base": base, "values": subs}, "depends_on": [], "record": record})
        return out
    out.append({"type": "abstained", "what": "definition row naming several symbols without one definition each",
                "record": record})
    return out


def _non_identity(text, codes, lex, record):
    out = []
    marks = lex.lang.get("non_identity_markers", ())
    for src in list(codes) + [text]:
        for mk in marks:
            if mk not in src:
                continue
            sides = [x.strip(" .;:`") for x in src.split(mk)]
            for a, b in zip(sides, sides[1:]):
                a = re.split(r"[;:.]\s|,\s(?=[a-z])", a)[-1].strip()
                b = re.split(r"[;:.]\s|,\s", b)[0].strip()
                if a and b and len(a.split()) <= 8 and len(b.split()) <= 8:
                    out.append({"type": "distinct", "a": a, "b": b, "about": None, "record": record})
        if src is text and any(mk in c for c in codes for mk in marks):
            break
    seen, uniq = set(), []
    for u in out:
        k = (u["a"].lower(), u["b"].lower())
        if k not in seen:
            seen.add(k)
            uniq.append(u)
    return uniq


def _method_unit(cells, headers, lex, record):
    name = cells[0]["text"].strip()
    if not name:
        return None
    neg = [_norm(h) for h in lex.lang.get("negative_scope_headers", ())]
    scope, negative = [], False
    for c in cells[1:]:
        h = _norm(headers.get(c["col"], ""))
        if any(x and x in h for x in neg):
            negative = True
        else:
            scope.append(c["text"])
    conditions = []
    for text in scope:
        from .acquisition import parse_values
        for seg0 in _split_top(text, ",;"):
            pieces = re.split(r"(?<=[^\d\s/])/(?=\s*\d)", seg0)  # "65°F/60% RH": two values, not a list
            first = parse_values(pieces[0], lex)
            variant = pieces[0][:first[0]["start"]].strip(" :") if first else None
            vals = []
            for seg in pieces:
                vals += [dict(v, _seg=seg) for v in parse_values(seg, lex)]
            for v in vals:
                seg = v["_seg"]
                if not v["unit"]:
                    continue
                after = seg[v["end"]:].strip().split()
                q = after[0].strip(" ,;.") if after and IDENT.match(after[0].strip(" ,;.")) and after[0][0].isupper() else None
                for nums in v["numbers"]:
                    conditions.append({"variant": variant if variant and len(variant.split()) <= 4 else None,
                                       "quantity": q, "value": nums[0], "unit": v["unit"]})
    return {"type": "method", "name": name, "editions": YEAR.findall(name), "measures": [],
            "scope_text": " | ".join(scope), "conditions": conditions, "does_not_establish": negative,
            "record": record}


def _evidence_class(label, lex):
    """The universe evidence class a document label names, by its words only; None when no class or several fit."""
    words = [w for w in re.split(r"[\s_+/—–\-]+", label.lower()) if w]
    best, ids = 0, []
    for cid, terms in lex.evidence_classes.items():
        covered = set()
        for t in terms:
            tw = t.lower().split()
            for i in range(len(words) - len(tw) + 1):
                if words[i:i + len(tw)] == tw:
                    covered.update(range(i, i + len(tw)))
        if len(covered) > best:
            best, ids = len(covered), [cid]
        elif len(covered) == best and best:
            ids.append(cid)
    return ids[0] if len(ids) == 1 else None


def _proposed_section(headings, lex):
    """Whether a section's headings label it a proposal: a heading word is a one-word term of the evidence class that
    knowledge marks as a proposal."""
    words = {w for h in headings for w in re.findall(r"[a-z]+", h.lower())}
    return any(w in words for w in lex.proposal_terms)


def _labels_in(codes):
    return [c.strip() for c in codes if LABEL.match(c.strip()) and len(c.strip()) >= 3]


def read_units(doc, lex):
    """The typed units a research document states (reading only; nothing is written)."""
    url = doc["url"]
    units_out = []
    heads = {h["index"]: h for h in doc.get("headings", ())}

    def record(text, locator, section):
        return {"text": text, "locator": locator, "section": [heads[i]["text"] for i in section if i in heads]}

    cited = set()
    for b in doc.get("blocks", ()):
        cited.update(b.get("cites", ()))
    for t in doc.get("tables", ()):
        for c in t["cells"]:
            cited.update(c.get("cites", ()))
    for h in doc.get("headings", ()):
        cited.update(h.get("cites", ()))
    # A2: the document's legend of claim labels
    legend = set()
    for b in doc.get("blocks", ()):
        labels = _labels_in(b.get("codes", ()))
        if len(set(labels)) >= 3:
            legend.update(labels)
    used = set()
    for b in doc.get("blocks", ()):
        used.update(_labels_in(b.get("codes", ())))
    for t in doc.get("tables", ()):
        for c in t["cells"]:
            used.update(_labels_in(c.get("codes", ())))
    for lab in sorted(legend | used):
        cls = _evidence_class(lab, lex)
        if cls:  # a label that names no evidence class (a research state, a comparison category) is not one
            units_out.append({"type": "label", "label": lab, "class": cls, "record": None})
        else:
            units_out.append({"type": "abstained", "what": f"label names no evidence class: {lab}", "record": None})
    # A4-A7: tables
    for t in doc.get("tables", ()):
        rows = {}
        for c in t["cells"]:
            rows.setdefault(c["row"], []).append(c)
        if 0 not in rows:
            continue
        header = sorted(rows[0], key=lambda c: c["col"])
        headers = {c["col"]: c["text"] for c in header}
        kind = _row_type(header[0]["text"], lex) if header and header[0].get("header") else None
        for r, cells in sorted(rows.items()):
            if r == 0 and header[0].get("header"):
                continue
            cells = sorted(cells, key=lambda c: c["col"])
            text = " | ".join(c["text"] for c in cells)
            rec = record(text, cells[0].get("locator"), t.get("sectionPath", ()))
            codes = [x for c in cells for x in c.get("codes", ())]
            cites = [x for c in cells for x in c.get("cites", ())]
            labels = _labels_in(codes)
            if kind == "quantity_definition":
                units_out += _definition_units(cells[0], cells, lex, rec)
            elif kind == "method":
                m = _method_unit(cells, headers, lex, rec)
                if m:
                    # a method in a section its author labels proposed is a proposal, not an established method
                    m["proposed"] = _proposed_section(t.get("headingPath") or (), lex)
                    units_out.append(m)
            for c in cells:  # each cell on its own: a cell's statement never runs into the next cell
                units_out += _non_identity(c["text"], c.get("codes", ()), lex, rec)
            if cites or labels:
                units_out.append({"type": "statement", "cites": cites, "labels": labels, "record": rec})
    # blocks: statements, non-identity, formulas, register entries
    entries = {}
    for b in doc.get("blocks", ()):
        rec = record(b["text"], b.get("locator") or f"block {b.get('index')}", b.get("sectionPath", ()))
        labels = [x for x in _labels_in(b.get("codes", ())) if x not in legend or len(set(_labels_in(b["codes"]))) < 3]
        m = re.match(r"^\[?([A-Za-z]{1,4}\d{1,4})\]?\s*(?:[—–:\-]|\s)\s*(.*)$", b["text"])
        if m and m.group(1) in cited and b["text"].startswith((m.group(1), "[" + m.group(1))):
            entries.setdefault(m.group(1), []).append({"text": b["text"], "links": b.get("links", ()), "record": rec,
                                                       "title": m.group(2).split(". ")[0][:200]})
        units_out += _non_identity(b["text"], b.get("codes", ()), lex, rec)
        for c in b.get("codes", ()):
            if "=" in c and not any(mk in c for mk in lex.lang.get("non_identity_markers", ())):
                lhs, rhs = c.split("=", 1)
                if IDENT.match(lhs.strip()) and _is_expression(rhs):
                    units_out.append({"type": "formula", "target": lhs.strip(), "expression": rhs.strip(),
                                      "kind": "definition", "record": rec})
        if b.get("cites") or labels:
            units_out.append({"type": "statement", "cites": list(b.get("cites", ())), "labels": labels, "record": rec})
    for h in doc.get("headings", ()):
        m = re.match(r"^\[?([A-Za-z]{1,4}\d{1,4})\]?\s*[—–:\-]\s*(.*)$", h["text"])
        if m and m.group(1) in cited:
            body = [b for b in doc.get("blocks", ()) if b.get("sectionPath") and b["sectionPath"][-1] == h["index"]]
            entries.setdefault(m.group(1), []).append({
                "text": h["text"] + " " + " ".join(b["text"] for b in body),
                "links": [u for b in body for u in b.get("links", ())],
                "record": record(h["text"], h.get("locator"), h.get("sectionPath", ())), "title": m.group(2)})
    for t in doc.get("tables", ()):
        rows = {}
        for c in t["cells"]:
            rows.setdefault(c["row"], []).append(c)
        for r, cells in rows.items():
            cells = sorted(cells, key=lambda c: c["col"])
            m = re.match(r"^\[?([A-Za-z]{1,4}\d{1,4})\]?$", cells[0]["text"].strip())
            if m and m.group(1) in cited:
                text = " | ".join(c["text"] for c in cells)
                entries.setdefault(m.group(1), []).append({
                    "text": text, "links": [u for c in cells for u in c.get("links", ())],
                    "record": record(text, cells[0].get("locator"), t.get("sectionPath", ())),
                    "title": cells[1]["text"] if len(cells) > 1 else None})
    for rid, es in sorted(entries.items()):
        text = " ".join(e["text"] for e in es)
        urls = [u for e in es for u in e["links"]] + re.findall(r"https?://[^\s)>\]]+", text)
        date = re.search(r"\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|"
                         r"December) \d{4}\b|\b\d{4}-\d{2}-\d{2}\b", text)
        cls = re.search(r"\bClass(?:ification)?:\s*`?([^`.;,]+)", text)
        units_out.append({"type": "reference", "id": rid, "title": es[0]["title"], "url": urls[0] if urls else None,
                          "urls": sorted(set(urls)), "date": date.group(0) if date else None,
                          "class": cls.group(1).strip() if cls else None, "organisation": None, "entries": len(es),
                          "record": es[0]["record"]})
    for rid in sorted(cited - set(entries)):
        units_out.append({"type": "unresolved_citation", "id": rid})
    # A8: usage anchoring ("<word> of <value unit>", "<word>: <value unit>")
    from .acquisition import parse_values
    usage = {}
    for b in doc.get("blocks", ()):
        for m in re.finditer(r"\b([a-z][a-z-]{3,})(?::| of)\s+(?=\d)", b["text"]):
            vals = parse_values(b["text"][m.end():m.end() + 40], lex)
            if vals and vals[0]["start"] == 0 and vals[0]["unit"]:
                k = (m.group(1), tuple(units.dims_of(vals[0]["unit"])))
                usage[k] = usage.get(k, 0) + 1
    for (word, dims), n in sorted(usage.items()):
        if n >= 2 and word not in lex.stop:
            units_out.append({"type": "usage", "word": word, "dims": list(dims), "count": n})
    return units_out


# --- representation ------------------------------------------------------------------------------------------------

def _propose_item(store, kind, iid, body, premises, summary, situating=None):
    """A proposal of the acquisition service with its inference record and standing (the MS1 contract)."""
    ir = Item(f"IR:{SERVICE}:{_h(summary, sorted(premises), iid)}", "inference_record",
              {"service": SERVICE, "inquiry": None, "summary": summary, "premises": sorted(premises)}, PROGRAM)
    store.propose(ir, f"{SERVICE} inference")
    store.propose(Item(iid, kind, body, PROGRAM, situating or {}), summary)
    grounds = [ir.id] + sorted(premises)
    store.propose(Item(f"ST:{iid}", "standing", {"of": iid, "attitude": "proposed", "holder": "program",
                                                 "grounds": grounds, "label": standing.label(store, grounds)},
                       dict(PROGRAM, source="contract")), "standing of a proposal")
    return iid


class _Ctx:
    def __init__(self, store, lex, url, holder):
        self.store, self.lex, self.url, self.holder = store, lex, url, holder
        self.src = {"source": url, "holder": holder, "basis": "document statement"}
        self.symbols, self.names, self.families, self.records = {}, {}, {}, {}
        self.cites = {}
        self.summary = {k: [] for k in ("records", "attributions", "kinds", "supports", "families", "dependencies",
                                        "formulas", "models", "distinct", "methods", "sources", "unresolved",
                                        "labels", "anchors", "abstained")}

    def record(self, rec):
        if rec is None:
            return []
        rid = f"R:{_h(self.url, rec.get('locator'), rec.get('text'))}"
        if rid not in self.records:
            if not self.store.has(rid):
                self.store.acquire(Item(rid, "record", {"form": "document statement", "text": rec.get("text"),
                                                        "locator": rec.get("locator"),
                                                        "heading_path": rec.get("section"), "document": self.url},
                                        self.src))
            aid = _propose(self.store, {"form": "attribution", "holder": self.holder, "reports": rid}, [rid],
                           "the document reports this statement (attribution, not adoption)")
            self.records[rid] = aid
            self.summary["records"].append(rid)
        return [rid, self.records[rid]]


def _propose(store, body, premises, summary):
    from .acquisition import _propose as p
    return p(store, body, premises, summary)


def _base_kind(ctx, name, dims, scale):
    """A base (not acquired from this document) kind that the name already designates, with the same dimension."""
    if not name:
        return None
    n = _norm(name)
    exact, head = [], []
    for kid, kb in ctx.lex.kinds.items():
        if kb.get("document"):
            continue  # only base kinds are supported; a kind another document defined is never merged into
        if not units.same_dims(units.pad(kb["dims"]), dims) or (kb.get("scale") == "level") != (scale == "level"):
            continue
        terms = {_norm(t) for t in kb.get("terms", ())}
        if n in terms:
            exact.append(kid)
        elif n.split() and n.split()[-1] in terms and kb.get("determinable") == "bearer" and not kb.get("document"):
            head.append(kid)
    if len(exact) == 1:
        return exact[0]
    if not exact and len(head) == 1:
        return head[0]
    return None


def _rep_kind(ctx, u):
    store, lex = ctx.store, ctx.lex
    us = resolve_units(u.get("unit"), lex)
    prem = ctx.record(u.get("record") or {"text": u.get("where") or u.get("name") or u.get("symbol"),
                                          "locator": u.get("where"), "section": []})
    sym, name = u.get("symbol"), u.get("name")
    if not u.get("family") and sym and "_" in sym and _base_sub(sym)[0] in ctx.families:
        # "X_v" after a family of X: one more value of the index (the family's unit holds)
        base, sub = _base_sub(sym)
        kid0, cid, vals = ctx.families[base]
        vid = f"V:{_h(ctx.url, base, sub)}"
        if not store.has(vid):
            _propose_item(store, "concept", vid, {"label": sub, "category": "condition value", "of": cid,
                                                  "terms": [sub], "document": ctx.url}, prem,
                          "a value of the index of an indexed symbol")
        vals.add(sub)
        ctx.symbols[sym] = kid0
        return kid0
    if not us:
        ctx.summary["abstained"].append({"unit": "kind", "symbol": sym, "name": name, "why": "no readable unit"})
        return None
    dims = {tuple(units.dims_of(x)) for x in us}
    scales = {units.SCALE.get(x) for x in us}
    if len(dims) != 1 or len(scales) != 1:
        ctx.summary["abstained"].append({"unit": "kind", "symbol": sym, "name": name, "why": "units of several dimensions"})
        return None
    dims, scale = dims.pop(), scales.pop()
    fam = u.get("family")
    key = (fam or {}).get("base") or sym
    if key and key in ctx.symbols:
        kid = ctx.symbols[key]
    elif fam and fam["base"] in ctx.families:
        kid = ctx.families[fam["base"]][0]
    else:
        kid = None if fam else _base_kind(ctx, name, dims, scale)
        if kid:
            ctx.summary["supports"].append(_propose(store, {"form": "definition_support", "kind": kid,
                                                            "reports": prem[0]}, prem,
                                                    "the document defines a quantity the universe already has"))
        else:
            kid = f"Q:{_h(ctx.url, key or _norm(name))}"
            terms = [_norm(name)] if name and 1 <= len(_norm(name).split()) <= 6 else []
            terms += [_norm(t) for t in u.get("terms", ()) if _norm(t)]
            symbols = []
            if key and " " not in key and len(key) >= 2 and not units.known(key) and \
                    not any(key in s for s in units.SURFACES.values()):
                symbols.append(key)
            body = {"label": name or key, "dims": list(dims), "intensive": False, "terms": sorted(set(terms)),
                    "symbols": symbols, "determinable": "bearer", "unit_as_written": u.get("unit"),
                    "document": ctx.url, "defining_conditions": []}
            if scale == "level":
                body["scale"] = "level"
            if not store.has(kid):
                _propose_item(store, "quantity_kind", kid, body, prem, "a quantity the document defines (S0 4.7)")
                ctx.summary["kinds"].append(kid)
        if key:
            ctx.symbols[key] = kid
    if name:
        ctx.names[_norm(name)] = kid
    if fam:
        cid, vals = ctx.families.get(fam["base"], (None, None))[1:] if fam["base"] in ctx.families else (None, None)
        if cid is None:
            cid = f"C:{_h(ctx.url, fam['base'], 'index')}"
            _propose_item(store, "concept", cid, {"label": f"variant of {fam['base']} named by its index",
                                                  "category": "condition", "value_type": "named",
                                                  "document": ctx.url}, prem,
                          "one symbol indexed by several values names one quantity per value (a defining condition)")
            ctx.families[fam["base"]] = (kid, cid, set())
            ctx.summary["families"].append(cid)
            _propose(store, {"form": "relation", "relation": ctx.lex.influence, "subject": kid, "object": cid}, prem,
                     "the quantity is defined per value of its index (S0 4.6)")
        for v in fam.get("values", ()):
            vid = f"V:{_h(ctx.url, fam['base'], v)}"
            if not store.has(vid):
                _propose_item(store, "concept", vid, {"label": v, "category": "condition value", "of": cid,
                                                      "terms": [v], "document": ctx.url}, prem,
                              "a value of the index of an indexed symbol")
            ctx.families[fam["base"]][2].add(v)
    return kid


def _resolve(ctx, designation):
    """A kind or condition the designation names: a symbol of this document, a name it defined, a term of a universe
    kind, a setting concept, or a condition concept's marker. None when nothing (or several things) fits."""
    if not designation:
        return None
    d = designation.strip(" `.")
    if d in ctx.symbols:
        return ctx.symbols[d]
    n = _norm(d)
    if n in ctx.names:
        return ctx.names[n]
    lex = ctx.lex
    hits = {kid for kid, kb in lex.kinds.items() if n in {_norm(t) for t in kb.get("terms", ())}
            or d in kb.get("symbols", ())}
    if len(hits) == 1:
        return hits.pop()
    same_base = {ctx.symbols[s] for s in ctx.symbols if _base_sub(s)[0] == d and _base_sub(s)[1]}
    if same_base:
        ds = {tuple(units.pad(ctx.store.get(k).body["dims"])) for k in same_base if ctx.store.has(k)
              and "dims" in ctx.store.get(k).body}
        if len(ds) == 1:
            dd = ds.pop()
            cls = [kid for kid, kb in lex.kinds.items() if kb.get("determinable") == "dimension"
                   and units.same_dims(units.pad(kb["dims"]), dd)]
            if len(cls) == 1:
                return cls[0]
    words = n.split()
    if words and any(w in {_norm(x) for x in lex.setting_numbered} or w in {_norm(x) for x in lex.setting_named}
                     for w in words) and len(words) <= 2:
        return lex.setting
    for cid, c in lex.qconds.items():
        if any(_norm(m) in words for m in c.get("markers", ())):
            return cid
    return None


def _rep_formula(ctx, u):
    prem = ctx.record(u.get("record") or {"text": u.get("where"), "locator": u.get("where"), "section": []})
    if u.get("kind") not in (None, "definition"):
        return None
    toks = re.findall(r"[A-Za-z_][\w.]*|\d+(?:\.\d+)?|[×*·/^()+\-]", u.get("expression") or "")
    if not toks or any(t in "()+-" for t in toks):
        ctx.summary["abstained"].append({"unit": "formula", "target": u.get("target"), "why": "not a monomial"})
        return None
    target = _resolve(ctx, u.get("target"))
    exps, const, sign, i = {}, 1.0, 1, 0
    names = {}
    while i < len(toks):
        t = toks[i]
        if t in "×*·":
            sign = 1
        elif t == "/":
            sign = -1
        elif t == "^":
            pass
        elif re.fullmatch(r"\d+(?:\.\d+)?", t):
            const = const * float(t) if sign > 0 else const / float(t)
        else:
            k = _resolve(ctx, t)
            if k is None:
                ctx.summary["abstained"].append({"unit": "formula", "target": u.get("target"),
                                                 "why": f"symbol not resolved: {t}"})
                return None
            p = 1.0
            if i + 2 < len(toks) and toks[i + 1] == "^" and re.fullmatch(r"\d+(?:\.\d+)?", toks[i + 2]):
                p = float(toks[i + 2])
                i += 2
            exps[k] = exps.get(k, 0.0) + sign * p
            names.setdefault(k, t)
        i += 1
    if target is None or target in exps or not exps:
        ctx.summary["abstained"].append({"unit": "formula", "target": u.get("target"), "why": "target not resolved"})
        return None
    var = {target: "y"}
    for n, k in enumerate(sorted(exps)):
        var[k] = f"x{n}"

    def term(k, e):
        return var[k] if e == 1 else f"{var[k]}^({e:g})"
    forms = {"y": "*".join([f"{const:g}"] + [term(k, e) for k, e in sorted(exps.items())])}
    for k, e in exps.items():
        others = [term(o, -oe) for o, oe in sorted(exps.items()) if o != k]
        body = "*".join([f"(y/{const:g})"] + others)
        forms[var[k]] = body if e == 1 else f"({body})^({1 / e:g})"
    variables = {v: ["bearer", k] for k, v in var.items()}
    mid = f"M:{_h(ctx.url, sorted(variables.items()), forms)}"
    try:
        kinds = []
        for k in var:
            body = ctx.store.get(k).body if ctx.store.has(k) else None
            if body is None or "dims" not in body:
                raise K.AcquisitionError(f"{k} has no dimension")
            kinds.append(K.QuantityKind(k, units.pad(body["dims"]), bool(body.get("intensive")), source=ctx.url))
        kb = K.KB(kinds)
        kb.add(K.Model(mid, "acquired", {s: tuple(v) for s, v in variables.items()}, forms, (), (), "definition",
                       source=ctx.url, basis="definition"))
    except (K.AcquisitionError, Exception) as e:  # noqa: BLE001 - any refusal of the model check is reported
        ctx.summary["abstained"].append({"unit": "formula", "target": u.get("target"), "why": f"refused: {e}"})
        return None
    if not ctx.store.has(mid):
        _propose_item(ctx.store, "model", mid, {"name": f"{u.get('target')} = {u.get('expression')}",
                                                "variables": variables, "forms": forms, "requirements": [],
                                                "conditions": [], "generality": "definition", "document": ctx.url},
                      prem, "a formula the document states, with forms solved for each variable (S0 5.7)")
        ctx.summary["models"].append(mid)
    return mid


def _rep_method(ctx, u):
    prem = ctx.record(u.get("record") or {"text": u.get("where") or u.get("name"), "locator": u.get("where"),
                                          "section": []})
    name = u.get("name") or ""
    mid = f"MT:{_h(ctx.url, _key(name))}"
    n = re.sub(r"\([^)]*\)", " ", name)
    terms = {_norm(n), _norm(YEAR.sub(" ", n))}
    if "," in n:  # "10 CFR Part 430 Subpart B, Appendix X1": the last designation names the method too
        terms.add(_norm(YEAR.sub(" ", n.rsplit(",", 1)[1])))
    first = n.split()[0] if n.split() else ""
    if "/" in first:
        terms.add(_norm(YEAR.sub(" ", n.split("/", 1)[1])))
    terms = sorted(t for t in terms if len(t) >= 3)
    measures = set()
    for d in u.get("measures", ()):
        k = _resolve(ctx, d)
        if k:
            measures.add(k)
    scope = u.get("scope_text") or ""
    for s, k in ctx.symbols.items():
        if re.search(rf"(?<![\w.]){re.escape(s)}s?(?![\w])", scope):  # an acronym's plural ("CADRs") too
            measures.add(k)
    for nm, k in ctx.names.items():
        if nm and f" {nm} " in f" {_norm(scope)} ":
            measures.add(k)
    for a in ctx.store.of("content", form="anchor"):
        if a.body.get("document") == ctx.url and any(f" {_norm(t)} " in f" {_norm(scope)} " for t in a.body["terms"]):
            measures.add(a.body["kind"])
    conditioned = {_resolve(ctx, c.get("quantity")) for c in u.get("conditions", ()) if c.get("quantity")}
    measures -= conditioned
    infl = {}
    for k in measures:
        for c in ctx.store.of("content", form="relation", relation=ctx.lex.influence, subject=k):
            infl[c.body["object"]] = True
    sets = {}
    for c in u.get("conditions", ()):
        unit = (resolve_units(c.get("unit"), ctx.lex) or [None])[0] if c.get("unit") not in units.UNITS else c["unit"]
        if unit is None or c.get("value") is None:
            continue
        q = _resolve(ctx, c.get("quantity")) if c.get("quantity") else None
        if q is None:
            cands = [k for k in infl if (ctx.store.has(k) and "dims" in ctx.store.get(k).body and units.same_dims(
                units.pad(ctx.store.get(k).body["dims"]), units.dims_of(unit))) or (k in ctx.lex.kinds and units.same_dims(
                    units.pad(ctx.lex.kinds[k]["dims"]), units.dims_of(unit)))]
            q = cands[0] if len(set(cands)) == 1 else None
        if q is None:
            continue
        sets.setdefault(c.get("variant"), {})[q] = [c["value"], c["value"], unit]
    # variants exist only where one condition quantity takes different values ("portable" and "whole-home" test
    # points); otherwise every condition the method states belongs to one set
    values = {}
    for cs in sets.values():
        for q, v in cs.items():
            values.setdefault(q, set()).add(tuple(v))
    if all(len(v) == 1 for v in values.values()) and len(sets) > 1:
        sets = {None: {q: list(next(iter(v))) for q, v in values.items()}}
    body = {"label": name, "category": "proposed method" if u.get("proposed") else "test standard",
            "editions": list(u.get("editions") or []), "terms": terms,
            "measures": sorted(measures), "condition_sets": [{"variant": v, "conditions": cs} for v, cs in
                                                              sorted(sets.items(), key=lambda x: str(x[0]))],
            "negative_scope": bool(u.get("does_not_establish")), "document": ctx.url}
    if not ctx.store.has(mid):
        _propose_item(ctx.store, "method", mid, body, prem, "a standard or procedure the document describes (S0 D16, D18)")
        ctx.summary["methods"].append(mid)
    return mid


def represent(store, units_in, url, holder, lex=None):
    """Write the units of one document into the store. Returns a summary of item ids."""
    from .acquisition import Lexicon
    lex = lex or Lexicon(store)
    ctx = _Ctx(store, lex, url, holder)
    # A1: cited sources, as their register entries describe them
    for u in units_in:
        if u["type"] == "reference" and u.get("id"):
            eid = f"S:{_h(url, u['id'])}"
            prem = ctx.record(u.get("record") or {"text": u.get("title"), "locator": u.get("where"), "section": []})
            if not store.has(eid):
                store.acquire(Item(eid, "entity", {
                    "label": u.get("title"), "cited_id": u["id"], "document": url, "url": u.get("url"),
                    "urls_disagree": len(u.get("urls") or []) > 1 and len({x.rstrip("/ .") for x in u["urls"]}) > 1,
                    "date": u.get("date"), "class_text": u.get("class"),
                    "evidence_class": _evidence_class(u["class"], lex) if u.get("class") else None,
                    "examined": False, "register_record": prem[0] if prem else None}, ctx.src),
                    "a cited source, as the citing document's register describes it")
            ctx.cites[u["id"]] = eid
            ctx.summary["sources"].append(eid)
        elif u["type"] == "unresolved_citation":
            ctx.summary["unresolved"].append(u["id"])
    for u in units_in:
        if u["type"] == "label":
            prem = ctx.record(u.get("record")) if u.get("record") else []
            cls = u.get("class")
            cid = cls if cls and cls.startswith("E:") else (f"E:{cls}" if cls else None)
            ctx.summary["labels"].append(_propose(store, {"form": "label_definition", "label": u["label"],
                                                          "evidence_class": cid, "document": url}, prem or [],
                                                  "the document's label of a kind of evidence"))
    # kinds first (two passes: symbols defined later in the document resolve too)
    for u in units_in:
        if u["type"] == "kind":
            k = _rep_kind(ctx, u)
            if k:
                u["_kind"] = k
    # kinds of different documents with the same symbol and dimension: an indeterminate co-reference proposal (S0
    # 3.6.5: the same designation is the weakest recognition evidence); never a merge
    for kid in ctx.summary["kinds"]:
        b = store.get(kid).body
        for other in store.of("quantity_kind"):
            ob = other.body
            if other.id == kid or not ob.get("document") or ob.get("document") == ctx.url:
                continue
            if set(b.get("symbols", ())) & set(ob.get("symbols", ())) and units.same_dims(units.pad(b["dims"]),
                                                                                        units.pad(ob["dims"])):
                ctx.summary.setdefault("co_references", []).append(_propose(store, {
                    "form": "co_reference", "relata": sorted([kid, other.id]), "evidence": "same symbol and dimension",
                    "verdict": "indeterminate", "about": "kinds of quantity"}, sorted([kid, other.id]),
                    "the same symbol and dimension in two documents: weakest recognition evidence (S0 3.6.5)"))
    for u in units_in:
        if u["type"] == "kind" and u.get("_kind"):
            prem = ctx.record(u.get("record") or {"text": u.get("where") or u.get("name"), "locator": u.get("where"),
                                                  "section": []})
            for a in u.get("depends_on", ()):
                t = _resolve(ctx, a)
                if t is None or t == u["_kind"]:
                    ctx.summary["abstained"].append({"unit": "depends_on", "of": u.get("symbol") or u.get("name"),
                                                     "argument": a, "why": "argument not resolved"})
                    continue
                ctx.summary["dependencies"].append(_propose(
                    store, {"form": "relation", "relation": ctx.lex.influence, "subject": u["_kind"], "object": t},
                    prem, "the quantity is written as a function of this argument (an influence quantity, JCGM 200 "
                          "2.52)"))
    for u in units_in:
        if u["type"] == "formula":
            _rep_formula(ctx, u)
        elif u["type"] == "distinct":
            prem = ctx.record(u.get("record") or {"text": u.get("where"), "locator": u.get("where"), "section": []})
            a, b = _resolve(ctx, u.get("a")), _resolve(ctx, u.get("b"))
            ctx.summary["distinct"].append(_propose(store, {
                "form": "relation", "relation": ctx.lex.non_identity, "subject": a, "object": b,
                "designations": [u.get("a"), u.get("b")], "document": url}, prem,
                "the document states that the two are not the same"))
    # A8: usage anchoring of a kind this document defines
    own = {k for k in ctx.summary["kinds"]}
    for u in units_in:
        if u["type"] == "usage":
            fit = [k for k in own if units.same_dims(units.pad(store.get(k).body["dims"]), units.pad(u["dims"]))]
            if len(fit) == 1:
                ctx.summary["anchors"].append(_propose(store, {"form": "anchor", "kind": fit[0], "terms": [u["word"]],
                                                               "basis_of_anchor": f"{u['count']} occurrences before a "
                                                                                  "value of this dimension",
                                                               "document": url}, [],
                                                       "a word the document uses for the quantity it defines"))
    methods = {}
    for u in units_in:
        if u["type"] == "method":
            methods.setdefault(_key(u.get("name") or ""), []).append(u)
    for k, us in methods.items():
        merged = dict(us[0])
        merged["conditions"] = [c for x in us for c in x.get("conditions", ())]
        merged["measures"] = [m for x in us for m in x.get("measures", ())]
        merged["scope_text"] = " | ".join(x.get("scope_text") or "" for x in us)
        merged["does_not_establish"] = any(x.get("does_not_establish") for x in us)
        _rep_method(ctx, merged)
        for x in us[1:]:
            ctx.record(x.get("record"))
    # A3: statements with their citations and labels
    labels = {c.body["label"]: c.body["evidence_class"] for c in store.of("content", form="label_definition")
              if c.body.get("document") == url}
    for u in units_in:
        if u["type"] == "statement":
            prem = ctx.record(u["record"])
            cites = sorted({ctx.cites[c] for c in u.get("cites", ()) if c in ctx.cites})
            unresolved = sorted({c for c in u.get("cites", ()) if c not in ctx.cites})
            classes = sorted({labels.get(lab) or _evidence_class(lab, lex) for lab in u.get("labels", ())} - {None})
            ctx.summary["attributions"].append(_propose(store, {
                "form": "attribution", "holder": holder, "reports": prem[0], "cites": cites, "unresolved": unresolved,
                "labels": list(u.get("labels", ())), "evidence_classes": classes, "cited_sources_examined": False},
                prem + cites, "the document reports this statement, citing these sources (attribution, not adoption)"))
    return ctx.summary


def acquire_knowledge(store, doc, lex):
    """Read and represent the knowledge a document states (called by ``acquisition.acquire_document``)."""
    us = read_units(doc, lex)
    if not any(u["type"] != "usage" for u in us):
        return {"units": 0}
    s = represent(store, us, doc["url"], doc.get("holder") or doc["url"], lex)
    s["units"] = len(us)
    return s


__all__ = ["read_units", "represent", "acquire_knowledge", "resolve_units", "StoreError"]
