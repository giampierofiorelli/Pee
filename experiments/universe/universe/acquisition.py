"""Acquisition of table statements into universe items (I-1; S0 D10, D11, D16, 4.6, 4.7, 3.6.4; S1 plan C-RD/C-EX).

Input: the structure of one document, exported from Crawler's structural readers (table grid with cell positions and
rendered text, heading tree, text blocks with section paths, structured names). Crawler's interpretations are never
part of the input.

Output, written to the shared store; nothing else is returned to a caller:

* ``record`` items: one per value, faithful to the source (cell text, row and column header paths, caption, heading
  path, locator). Attributed to the publisher; correctness is fidelity (D11).
* ``entity`` items for the things named by the document's structured names that tables refer to.
* ``method`` items for sections whose heading a method concept's anchors name (D16).
* ``content`` items proposed by this service, with an inference record and a standing:
  - an ``attribution`` content: the source reports the record (D10, attribution);
  - candidate ``quantity`` contents: bearer, kind, interval, unit, conditions keyed by concept items, scope,
    ``interprets`` the record. A header segment fills exactly one slot. What cannot be placed is listed under
    ``incomplete`` and is never turned into a qualifier word;
  - alternative candidates of one ambiguous reading are tied to one ``ambiguity`` item (S0 3.6.4).

Acquisition proposes interpretations. It never decides whether a content is true or whether a bearer meets a
requirement: it does not import the rule or model services, and it never writes a classification, comparison or
evaluative content. Every word it uses to read structure comes from universe items (kinds, concepts, metrology,
lexical knowledge); the code names no domain.
"""
import hashlib
import json
import pathlib
import re

from s1core import units

from . import standing
from .store import Item, thaw

SERVICE = "acquisition"
PROGRAM = {"holder": "program", "basis": "derived", "source": "acquisition service"}


def _h(*parts):
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


# --- universe knowledge is loaded by loader.load_general_knowledge (it validates models through the model service;
# acquisition never depends on the rule or model services) ------------------------------------------------------------

class Lexicon:
    """Everything acquisition may read words with, gathered from universe items (never from a private list)."""

    def __init__(self, store):
        self.kinds = {k.id: thaw(k.body) for k in store.of("quantity_kind") if k.body.get("terms")}
        cs = {c.id: thaw(c.body) for c in store.of("concept")}
        self.lang = cs["L:en"]
        self.stop = set(self.lang["stopwords"])
        self.setting = next(i for i, c in cs.items() if c.get("value_type") == "setting")
        self.setting_numbered = sorted(cs[self.setting]["numbered"], key=len, reverse=True)
        self.setting_named = sorted(cs[self.setting]["named"], key=len, reverse=True)
        self.qconds = {i: c for i, c in cs.items() if c.get("category") == "condition" and c.get("value_type") == "quantity"}
        self.method = next(i for i, c in cs.items() if c.get("category") == "method")
        self.method_terms = sorted(cs[self.method]["terms"], key=len, reverse=True)
        surf = []
        for u, ss in units.SURFACES.items():
            for s in ss:
                surf.append((s, u))
        self.surfaces = sorted(surf, key=lambda x: -len(x[0]))
        folded = {}
        for s, u in surf:
            folded.setdefault(s.lower(), set()).add(u)
        # surfaces of two or more characters whose case-folded form names one unit only: in text rendered in capitals
        # ("18.5 KG") they are read case-insensitively; a folded form naming several units ("MW": mW or MW) and a
        # one-letter symbol ("G" is not "g") are never read from capitals
        self.fold_unique = {f for f, us in folded.items() if len(us) == 1}

    def unit_at(self, text, i):
        """Longest unit surface starting at text[i] (one optional space before). Returns (unit, end) or None."""
        j = i + 1 if i < len(text) and text[i] == " " else i
        for s, u in self.surfaces:
            seg = text[j:j + len(s)]
            ok = seg.lower() == s.lower() if sum(ch.isalpha() for ch in s) >= 4 else seg == s
            if (not ok and len(s) >= 2 and seg.lower() == s.lower() and s.lower() in self.fold_unique
                    and not re.search(r"[a-z]", text)):
                ok = True  # the text is written in capitals throughout
            if not ok:
                continue
            end = j + len(s)
            if s[-1].isalnum() and end < len(text) and text[end].isalpha() and not (text[end].isupper() and s[-1].islower()):
                continue
            return u, end
        return None


# --- values -----------------------------------------------------------------------------------------------------------

NUM = re.compile(r"(?<![\w.,])(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(?![\d])")


def _numbers(text, lang):
    """Numbers with their readings under the writing convention. A dot followed by exactly three digits is ambiguous
    (lexical knowledge, number_conventions): both readings are kept."""
    out = []
    for m in NUM.finditer(text):
        if re.match(r"\s*:", text[m.end():]):
            continue  # a number followed by a colon is part of a label ("Setting 2: ..."), not a value
        intpart, frac = m.group(1), m.group(2)
        base = float(intpart.replace(",", ""))
        if frac is None:
            readings = [base]
        elif len(frac) == 3 and "," not in intpart and len(intpart) <= 3:
            readings = [float(f"{intpart}.{frac}"), float(intpart + frac)]
        else:
            readings = [float(f"{intpart.replace(',', '')}.{frac}")]
        out.append({"start": m.start(), "end": m.end(), "readings": readings})
    return out


def parse_values(text, lex):
    """Values written in one line of text: [{start, end, form, numbers (list of reading lists), unit, bound}]."""
    L = lex.lang
    nums = _numbers(text, L)
    vals, i = [], 0
    while i < len(nums):
        n = nums[i]
        u = lex.unit_at(text, n["end"])
        end = u[1] if u else n["end"]
        group, form = [n], "single"
        k = i
        while k + 1 < len(nums):
            gap = text[end:nums[k + 1]["start"]].strip().lower()
            if gap in L["range_separators"] and form in ("single", "range") and len(group) == 1:
                form = "range"
            elif gap in ("±", "+/-", "+-") and len(group) == 1:
                form = "tolerance"
            elif gap in L["list_separators"] and form in ("single", "list"):
                form = "list"
            else:
                break
            k += 1
            group.append(nums[k])
            u2 = lex.unit_at(text, nums[k]["end"])
            end = u2[1] if u2 else nums[k]["end"]
            if u2:
                u = u2
        before = text[:n["start"]].lower().rstrip(" :")
        bound = None
        for kind in ("upper", "lower", "approximate"):
            if any(before.endswith(m) for m in L["bound_markers"][kind]):
                bound = kind
                break
        per = [lex.unit_at(text, g["end"]) for g in group]
        per_unit = [p[0] if p else None for p in per]
        unit = u[0] if u else None
        # a number followed by a word that is not a read unit ("20 KHz") has a unit nobody read: the group's unit is
        # then unknown, never borrowed from another number
        unread = any(pu is None and re.match(r" ?[^\W\d_]", text[g["end"]:]) for g, pu in zip(group, per_unit))
        if unit and len(group) > 1 and unread:
            unit = None
        numbers = [g["readings"] for g in group]
        if unit and any(x and x != unit for x in per_unit):  # e.g. "30 Hz - 20 kHz": convert each to the last unit
            conv = []
            for rd, pu in zip(numbers, per_unit):
                if pu and pu != unit and units.same_dims(units.dims_of(pu), units.dims_of(unit)):
                    rd = [units.from_si(*units.to_si(x, x, pu), unit)[0] for x in rd]
                conv.append(rd)
            numbers = conv
        vals.append({"start": n["start"], "end": end, "form": form, "numbers": numbers, "unit": unit, "bound": bound})
        i = k + 1
    return vals


def is_value_cell(text, lex):
    """A cell states values when one of its lines does: a line whose first value comes first (after a bound or
    approximation marker or a list bullet) or right after a "Label:". A header that mentions a quantity inside words
    ("level at 3 ft") or a name with digits ("model 7") is not a value cell."""
    markers = sorted({w for ws in lex.lang["bound_markers"].values() for w in ws}, key=len, reverse=True)
    for line in [x.strip() for x in (text or "").splitlines() if x.strip()]:
        vs = parse_values(line, lex)
        if not vs:
            continue
        prefix = line[:vs[0]["start"]].strip(" -–—•*").lower()
        for m in markers:
            if prefix.endswith(m):
                prefix = prefix[:-len(m)].strip(" -–—•*")
                break
        if prefix == "" or prefix.endswith(":"):
            return bool(vs[0]["unit"]) or re.fullmatch(r"[\s\d.,%+\-–~≈<>≤≥]+", line) is not None or prefix.endswith(":")
    return False


def cell_segments(text, lex):
    """A cell may hold several labelled values ("Label: value" on separate lines). Returns [(label, line, value)]."""
    out = []
    for line in [x.strip() for x in (text or "").splitlines() if x.strip()]:
        vs = parse_values(line, lex)
        if not vs:
            continue
        pos = 0
        for i, v in enumerate(vs):
            label = line[pos:v["start"]].strip(" :–-•")
            if len(vs) == 1:
                v = dict(v, trail=line[v["end"]:].strip(" ()–-•,;."))  # words after a lone value qualify it
            out.append((label, line, v))
            pos = v["end"]
    return out


# --- header segments -> slots ----------------------------------------------------------------------------------------

def _stem(w):
    """English plural normalisation only (morphology, no domain content)."""
    if len(w) > 3 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is")):
        return w[:-1]
    return w


def _norm(s):
    return " ".join(_stem(w) for w in re.sub(r"[^\w%/°²³]+", " ", (s or "").lower()).split())


def _name_key(s):
    """Identity key of a name: case-folded words only. No plural stemming ("DW2450WS" is not "DW2450W") and a "+"
    attached to a word is kept ("Mod+" is not "Mod"); names are never merged on similar spellings."""
    s = re.sub(r"[^\w%/°²³+]+", " ", (s or "").lower())
    return " ".join(re.sub(r"(?<!\w)\+", " ", s).split())


def _dims_ok(kind_body, unit):
    if unit is None:
        return True
    kd = units.pad(kind_body["dims"])
    if kind_body.get("scale") == "level" or units.SCALE.get(unit) == "level":
        return kind_body.get("scale") == "level" and units.SCALE.get(unit) == "level"
    return units.same_dims(kd, units.dims_of(unit))


def place(segment, lex, names, unit):
    """Slots named by one header segment. Returns a dict: kinds, settings, quantity conditions, entities, units,
    unplaced words. Everything is identified through universe items; unexplained words are returned, not dropped."""
    out = {"kinds": [], "settings": [], "qconds": {}, "entities": [], "units": [], "extent": [], "unplaced": [],
           "values": []}
    text = " " + _norm(segment) + " "
    raw = segment or ""

    # an entity named by the document (structured names): the whole segment, or the segment without a parenthesis
    core = re.sub(r"\([^)]*\)", " ", raw).strip()
    for cand in (raw.strip(), core):
        key = _name_key(cand)
        if key and key in names:
            out["entities"].append(names[key])
            inner = re.findall(r"\(([^)]*)\)", raw) if cand == core else []
            for x in inner:
                sub = place(x, lex, {}, unit)
                for k in out:
                    if k == "qconds":
                        out[k].update(sub[k])
                    elif k != "entities":
                        out[k] += sub[k]
            return out

    # quantity conditions: a value whose dimension is a condition concept's, next to one of its markers
    explained = set()
    for cid, c in lex.qconds.items():
        for v in parse_values(raw, lex):
            if v["unit"] and units.same_dims(units.dims_of(v["unit"]), units.dim(**c["quantity_dims"])):
                around = _norm(raw)
                if any(f" {m} " in f" {around} " for m in c["markers"]):
                    n = v["numbers"][0][0]
                    out["qconds"][cid] = [n, n, v["unit"]]
                    explained.add(v["start"])
                    span = _norm(raw[v["start"]:v["end"]])
                    text = text.replace(" " + span + " ", " ")
                    for m in c["markers"]:
                        text = text.replace(f" {m} ", " ")
    # any other value with a unit in a header (a variant such as "500GB", an unexplained condition) is not absorbed:
    # it stays unplaced, so the content cannot become complete for a thing the header does not name
    for v in parse_values(raw, lex):
        if v["unit"] and v["start"] not in explained:
            span = _norm(raw[v["start"]:v["end"]])
            text = text.replace(" " + span + " ", " ")
            out["unplaced"].append(span.replace(" ", ""))
            out["values"].append(span)
    # settings: a numbered setting word with its number, a sequence of named settings, or one named setting
    for w in lex.setting_numbered:
        for m in re.finditer(rf" ({re.escape(w)}) (\d+|[ivx]+) ", text):
            out["settings"].append(f"{m.group(1)} {m.group(2)}")
        text = re.sub(rf" {re.escape(w)} (\d+|[ivx]+) ", " ", text)
    found = []
    for w in lex.setting_named:  # longest first; kept in the order the text gives them
        pos = text.find(f" {w} ")
        while pos >= 0:
            found.append((pos, w))
            text = text[:pos] + " " + "\0" * len(w) + " " + text[pos + len(w) + 2:]
            pos = text.find(f" {w} ")
    out["settings"] += [w for _, w in sorted(found)]
    text = text.replace("\0", "")
    # extent words: the value is the upper or lower end of the quantity's variation (maximum, minimum)
    for end, ws in lex.lang["extent_words"].items():
        for w in ws:
            if f" {w} " in text:
                out["extent"].append(end)
                text = text.replace(f" {w} ", " ")
    # units written as words in the header
    for s, u in lex.surfaces:
        if sum(ch.isalpha() for ch in s) >= 2 and s.lower() not in lex.stop and f" {s.lower()} " in text:
            out["units"].append(u)
            text = text.replace(f" {s.lower()} ", " ")
    hunit = unit or (out["units"][0] if out["units"] else None)
    # kinds: the longest anchor term of a kind whose dimension agrees with the value's unit
    best, cands = 0, []
    for kid, kb in lex.kinds.items():
        if not _dims_ok(kb, hunit):
            continue
        for t in kb["terms"]:
            tt = " " + _norm(t) + " "
            if tt.strip() and tt in text:
                n = len(tt.split())
                if n > best:
                    best, cands = n, []
                if n == best:
                    cands.append((kid, tt))
    if cands:
        out["kinds"] = sorted({k for k, _ in cands})
        for _, tt in cands:
            text = text.replace(tt, " ")
    out["unplaced"] += [w for w in text.split() if w not in lex.stop and not w.isdigit()]
    return out


# --- proposals ----------------------------------------------------------------------------------------------------------

def _propose(store, body, premises, summary, situating=None):
    """A proposal of the acquisition service: content, inference record and standing (the MS1 contract pattern), not
    situated in any inquiry, so that every later inquiry can use it."""
    ir = Item(f"IR:{SERVICE}:{_h(summary, sorted(premises), body)}", "inference_record",
              {"service": SERVICE, "inquiry": None, "summary": summary, "premises": sorted(premises)}, PROGRAM)
    store.propose(ir, f"{SERVICE} inference")
    cid = f"P:{_h(body)}"
    store.propose(Item(cid, "content", body, PROGRAM, situating or {}), summary)
    grounds = [ir.id] + sorted(premises)
    store.propose(Item(f"ST:{cid}", "standing", {"of": cid, "attitude": "proposed", "holder": "program",
                                                 "grounds": grounds, "label": standing.label(store, grounds)},
                       dict(PROGRAM, source="contract")), "standing of a proposal")
    return cid


def acquire_document(store, doc):
    """Acquire one document's tables. Returns a summary with item ids (for audits and tests)."""
    lex = Lexicon(store)
    host = re.sub(r"^https?://([^/]+).*$", r"\1", doc["url"])
    src = {"source": doc["url"], "holder": host, "basis": "document statement"}
    summary = {"records": [], "contents": [], "incomplete": [], "ambiguities": [], "methods": [], "entities": []}

    # entities named by the document's structure (title segment, headings, links, structured data)
    names = {}
    for n in doc["names"]:
        key = _name_key(n["text"])
        if len(key) >= 2 and len(key.split()) <= 8 and any(ch.isdigit() or ch.isupper() for ch in n["text"]):
            names.setdefault(key, f"E:{_h(key)}")
    for t in doc["tables"]:
        for c in t["cells"]:
            for ln in c.get("links", ()):
                key = _name_key(ln)
                if len(key) >= 2 and len(key.split()) <= 8 and any(ch.isdigit() or ch.isupper() for ch in ln):
                    names.setdefault(key, f"E:{_h(key)}")
    # the document's subject: the structured-data product name if there is exactly one, else a unique title segment
    # (a title segment is only a candidate: it becomes the subject when a table header of the same document names it,
    # so that an article title is never taken for a thing)
    subject = None
    headers = {_name_key(re.sub(r"\([^)]*\)", " ", c["text"])) for t in doc["tables"] for c in t["cells"]}
    for sources, needs_header in ((("json-ld-product",), False), (("title_segment",), True)):
        cands = {_name_key(n["text"]) for n in doc["names"] if n["source"] in sources}
        if needs_header:
            cands = {k for k in cands if k in headers}
        if len(cands) == 1:
            key = next(iter(cands))
            names.setdefault(key, f"E:{_h(key)}")
            subject = names[key]
            break

    def entity(eid):
        if not store.has(eid):
            label = next(k for k, v in names.items() if v == eid)
            store.acquire(Item(eid, "entity", {"label": label}, src))
            summary["entities"].append(eid)
        return eid

    # methods: sections whose heading a method concept's anchors name
    methods = {}
    for hd in doc["headings"]:
        t = " " + _norm(hd["text"]) + " "
        if any(" " + _norm(m) + " " in t for m in lex.method_terms):
            body_text = " ".join(b["text"] for b in doc["blocks"] if hd["index"] in b["sectionPath"])
            mid = f"M:{_h(doc['url'], hd['index'])}"
            if not store.has(mid):
                store.acquire(Item(mid, "method", {"concept": lex.method, "heading": hd["text"], "section": hd["index"],
                                                   "text_sha256": hashlib.sha256(body_text.encode()).hexdigest()}, src))
            methods[hd["index"]] = mid
            summary["methods"].append(mid)

    for t in doc["tables"]:
        cells = {(c["row"], c["col"]): c for c in t["cells"]}
        slots = {}  # every grid slot a cell covers (row and column spans), so a spanning header heads each column
        for c in t["cells"]:
            for dr in range(max(1, c.get("rowspan") or 1)):
                for dc in range(max(1, c.get("colspan") or 1)):
                    slots.setdefault((c["row"] + dr, c["col"] + dc), (c["row"], c["col"]))
        isval = {k: is_value_cell(c["text"], lex) for k, c in cells.items()}
        # header rows: the leading rows with no value cell, unless their first cell is a "Label:" key (a body row of
        # a key-value table); header columns: the cells left of each row's first value
        nrows = max((r0 for r0, _ in cells), default=-1) + 1
        flagged = any(c.get("header") for c in t["cells"])
        header_rows = []
        for r0 in range(nrows):
            row = [cells[k] for k in sorted(cells) if k[0] == r0]
            if flagged:
                # the source marks header cells: a leading row heads the columns when every non-empty cell of it is
                # marked, even if it holds a value ("500GB" names a variant); a body row whose values were not read
                # is not a header
                if not row or not all(x.get("header") for x in row if x["text"].strip()):
                    break
                for x in row:
                    isval[(r0, x["col"])] = False
            elif any(isval[(r0, x["col"])] for x in row) or (row and row[0]["text"].strip().endswith(":")):
                break
            header_rows.append(r0)
        first_row = {c0: (max(header_rows) + 1 if header_rows else 0) for _, c0 in cells}
        first_col = {}
        for (r0, c0), v0 in isval.items():
            if v0:
                first_col[r0] = min(first_col.get(r0, c0), c0)
        tmethods = [m for i, m in methods.items() if i in (t.get("sectionPath") or [])]
        # things the table names: a cell whose text, a line of it, or a link is a structured name
        table_names = set()
        for c in t["cells"]:
            for x in [c["text"]] + c["text"].splitlines() + list(c.get("links", ())):
                k = _name_key(re.sub(r"\([^)]*\)", " ", x))
                if k in names:
                    table_names.add(names[k])
        for (r, c), cell in sorted(cells.items()):
            if not isval[(r, c)]:
                continue
            # header paths: the non-value cells above the column's first value, left of the row's first value
            def path(keys):
                out = []
                for key in keys:
                    o = slots.get(key)
                    if o is not None and not isval[o] and cells[o]["text"].strip() and cells[o]["text"].strip() not in out:
                        out.append(cells[o]["text"].strip())
                return out
            colpath = path([(rr, c) for rr in range(first_row[c])])
            rowpath = path([(r, cc) for cc in range(first_col[r])])
            for k, (label, line, v) in enumerate(cell_segments(cell["text"], lex)):
                rid = f"R:{_h(doc['url'], t['index'], r, c, k)}"
                rec = {"form": "table cell", "table": t["index"], "row": r, "col": c, "segment": k, "text": line,
                       "column_headers": colpath, "row_headers": rowpath, "inner_label": label or None,
                       "caption": t.get("caption"), "heading_path": t.get("headingPath"), "locator": cell["locator"],
                       "document_sha256": doc["sha256"]}
                if not store.has(rid):
                    store.acquire(Item(rid, "record", rec, src))
                summary["records"].append(rid)
                aid = _propose(store, {"form": "attribution", "holder": host, "reports": rid,
                                       "source_type_operator_asserted": doc.get("sourceTypeOperatorAsserted")},
                               [rid], "the source reports this record (attribution, not adoption)")
                _interpret(store, lex, rid, rec, v, label, colpath, rowpath, names, subject, entity, aid, tmethods,
                           summary, table_names)
    return summary


def _interpret(store, lex, rid, rec, v, label, colpath, rowpath, names, subject, entity, aid, tmethods, summary,
               others_named=frozenset()):
    unit = v["unit"]
    segs = [s for s in colpath + rowpath + ([label] if label else []) + ([v["trail"]] if v.get("trail") else []) if s]
    placed = [place(s, lex, names, unit) for s in segs]
    # a header that fills no slot, has the shape of a name, and heads values whose other axis names a quantity kind,
    # names their bearer (one axis bears the things, the other the quantity); if both axes carry such names, the
    # bearer stays undecided
    edit = {_norm(w) for w in lex.lang.get("editorial_words", ())}
    edit_keys = {_name_key(w) for w in lex.lang.get("editorial_words", ())}

    def name_shaped(seg, p):
        words = [w for w in _norm(seg).split() if w not in edit]
        mixed = any(re.search(r"[a-z]", w) and re.search(r"\d", w) for w in words)
        return (not p["kinds"] and not p["settings"] and not p["qconds"] and not p["entities"] and not p["values"]
                and words
                and any(ch.isupper() or ch.isdigit() for ch in seg) and len(words) <= 8
                and (len(words) >= 2 or mixed))
    col_n = [(s, p) for s, p in zip(colpath, placed[:len(colpath)]) if name_shaped(s, p)]
    row_n = [(s, p) for s, p in zip(rowpath, placed[len(colpath):len(colpath) + len(rowpath)]) if name_shaped(s, p)]
    col_k = any(p["kinds"] for p in placed[:len(colpath)])
    row_k = any(p["kinds"] for p in placed[len(colpath):len(colpath) + len(rowpath)])
    for axis, other_has_kind in ((col_n, row_k), (row_n, col_k)):
        if len(axis) == 1 and other_has_kind and not (col_n and row_n):
            seg, p = axis[0]
            key = " ".join(w for w in _name_key(seg).split() if w not in edit_keys)
            names.setdefault(key, f"E:{_h(key)}")
            p["entities"].append(names[key])
            p["unplaced"], p["extent"], p["units"] = [], [], []  # the whole header is a name ("Soundbar Max")
    if unit is None:
        hu = sorted({u for p in placed for u in p["units"]})
        unit = hu[0] if len(hu) == 1 else None
    kinds = sorted({k for p in placed for k in p["kinds"]})
    ents = sorted({e for p in placed for e in p["entities"]})
    settings = [s for p in placed for s in p["settings"]]
    extents = sorted({e for p in placed for e in p["extent"]})
    qconds = {}
    for p in placed:
        qconds.update(p["qconds"])
    unplaced = [w for p in placed for w in p["unplaced"]]
    incomplete = []
    if unplaced:
        incomplete.append("header words not placed in any slot: " + " ".join(unplaced))
    if not kinds:
        incomplete.append("no quantity kind named")
    if unit is None and not all(lex.kinds[k]["dims"] == list(units.NONE) for k in kinds):
        incomplete.append("no unit")
    if len(ents) > 1:
        incomplete.append("several bearers named")
    if len(extents) > 1:
        incomplete.append("both ends of an extent named")
    # the subject is a default bearer only in a table that names no other thing (a comparison table's rows are
    # never the subject's by default)
    default = subject if not (others_named - {subject}) else None
    bearer = ents[0] if len(ents) == 1 else default
    if bearer is None:
        incomplete.append("bearer not established")
    if v["form"] == "range" and any(a[0] > b[0] for a, b in [v["numbers"][:2]] if len(v["numbers"]) == 2):
        incomplete.append("range bounds out of order")
    if unit is not None and units.SCALE.get(unit) != "level" and any(lex.kinds[k].get("scale") == "level" for k in kinds):
        incomplete.append("level kind without a level unit")
    if bearer:
        entity(bearer)

    # value readings: number readings x forms; a list of values paired with a list of named settings
    forms = []
    nums = v["numbers"]
    if v["form"] in ("range", "list") and len(settings) == len(nums) and len(nums) > 1:
        for s, rd in zip(settings, nums):
            forms.append(({"setting": s}, [(x, x) for x in rd]))
        settings = []
    else:
        if v["form"] == "range":
            readings = [(a, b) for a in nums[0] for b in nums[1]]
        elif v["form"] == "tolerance":
            readings = [(a - b, a + b) for a in nums[0] for b in nums[1]]
        elif v["form"] == "list":
            readings = None
            incomplete.append("a list of values without one condition per value")
        else:
            readings = [(a, a) for a in nums[0]]
        if readings is not None:
            forms.append(({}, readings))
    if len(settings) > 1:
        incomplete.append("several settings for one value")
    conds = dict(qconds)
    if settings:
        conds[lex.setting] = settings[0]

    premises = [rid, aid] + list(tmethods)
    for extra, readings in forms:
        c2 = dict(conds)
        if "setting" in extra:
            c2[lex.setting] = extra["setting"]
        alts = []
        for lo, hi in readings:
            for kid in (kinds or [None]):
                lo2, hi2 = lo, hi
                if v["bound"] == "upper":
                    lo2 = None
                elif v["bound"] == "lower":
                    hi2 = None
                body = {"form": "quantity", "bearer": bearer, "kind": kid, "lo": lo2, "hi": hi2, "unit": unit,
                        "conditions": c2, "scope": "conditional" if c2 else "invariant",
                        "invariance": None if c2 else "value stated by the source without conditions",
                        "holds_of": "individual", "interprets": rid, "approximate": v["bound"] == "approximate",
                        "extent": extents[0] if extents else None}
                if incomplete:
                    body["incomplete"] = list(incomplete)
                alts.append(body)
        if len(alts) > 1:
            amb = f"A:{_h(rid, extra)}"
            reasons = []
            if len({(b['lo'], b['hi']) for b in alts}) > 1:
                reasons.append("number notation admits several readings")
            if len({b['kind'] for b in alts}) > 1:
                reasons.append("several quantity kinds fit the header and unit")
            if not store.has(amb):
                store.acquire(Item(amb, "ambiguity", {"record": rid, "reasons": reasons}, thaw(store.get(rid).provenance)))
            summary["ambiguities"].append(amb)
            for b in alts:
                b["alternative_of"] = amb
        for b in alts:
            cid = _propose(store, b, premises + ([b["alternative_of"]] if "alternative_of" in b else []),
                           "candidate interpretation of a record (structure placed in slots)")
            summary["contents"].append(cid)
            if "incomplete" in b:
                summary["incomplete"].append(cid)
