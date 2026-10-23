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
        self.separators = set(self.lang.get("separators", ()))
        self.method_markers = sorted((_norm(m) for m in self.lang.get("method_markers", ())), key=len, reverse=True)
        self.setting = next(i for i, c in cs.items() if c.get("value_type") == "setting")
        self.setting_numbered = sorted(cs[self.setting]["numbered"], key=len, reverse=True)
        self.setting_named = sorted(cs[self.setting]["named"], key=len, reverse=True)
        self.qconds = {i: c for i, c in cs.items() if c.get("category") == "condition" and c.get("value_type") == "quantity"}
        # named conditions: a condition concept whose values are items (a test material and its particle classes)
        self.nvalues = sorted(((_norm(t), i, c["of"]) for i, c in cs.items() if c.get("category") == "condition value"
                               for t in c.get("terms", ())), key=lambda x: -len(x[0]))
        self.parts = sorted(((_norm(t), i) for i, c in cs.items() if c.get("category") == "part kind"
                             for t in c.get("terms", ())), key=lambda x: -len(x[0]))
        # the quantity a part kind is characterised by (a container's volume): its role profile, as knowledge
        self.characteristic = {i: c.get("characteristic_kinds", []) for i, c in cs.items() if c.get("category") == "part kind"}
        self.artefacts = sorted(((_norm(t), i) for i, c in cs.items() if c.get("category") == "artefact kind"
                                 for t in c.get("terms", ())), key=lambda x: -len(x[0]))
        self.labels = {i: c.get("label", i) for i, c in cs.items()}
        # relation concepts are found by the structural role their knowledge item declares, never by name
        roles = {r.body.get("structural_role"): r.id for r in store.of("relation_concept") if r.body.get("structural_role")}
        self.parthood, self.instantiation = roles.get("parthood"), roles.get("instantiation")
        self.method = next(i for i, c in cs.items() if c.get("category") == "method")
        self.method_terms = sorted(cs[self.method]["terms"], key=len, reverse=True)
        # test standards are method items (S0 D16, D18) with lexical anchors
        self.standards = sorted(((_norm(t), m.id) for m in store.of("method") if m.body.get("category") == "test standard"
                                 for t in m.body.get("terms", ())), key=lambda x: -len(x[0]))
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


def label_text(text, labelled=False):
    """A cell whose first line is a label followed by lines of notes is a label cell: its first line labels the row or
    column, and the notes are commentary, never values of the bearer (they may describe other things entirely).
    ``labelled``: the cell's position already makes it a label (the leftmost cell of a row with values to its right)."""
    lines = [x.strip() for x in (text or "").splitlines() if x.strip()]
    if len(lines) > 1 and (labelled or not re.search(r"\d", lines[0])):
        return lines[0]
    return (text or "").strip()


def is_value_cell(text, lex):
    """A cell states values when one of its lines does: a line whose first value comes first (after a bound or
    approximation marker or a list bullet) or right after a "Label:". A header that mentions a quantity inside words
    ("level at 3 ft") or a name with digits ("model 7") is not a value cell, and neither is a label cell with notes."""
    markers = sorted({w for ws in lex.lang["bound_markers"].values() for w in ws}, key=len, reverse=True)
    if label_text(text) != (text or "").strip():
        return False
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
    """A cell may hold several labelled values ("Label: value" on separate lines). Returns [(label, line, value)].
    A value in parentheses right after another value restates it in another unit when the dimensions agree
    ("13.2 lb (6 kg)": a second reading of the same quantity) and qualifies it when they differ ("562 sq. ft. (5 air
    changes per hour)": a condition of the first value, placed with it)."""
    out = []
    for line in [x.strip() for x in (text or "").splitlines() if x.strip()]:
        vs = parse_values(line, lex)
        if not vs:
            continue
        # "Label: value": numbers written before the colon belong to the label ("Sub-45 dBA PM1 CADR: 128 cfm" states
        # one value, whose label carries a condition), never a value of their own
        colon = max((m.start() for m in re.finditer(r":", line) if any(v["start"] > m.start() for v in vs)
                     and line[m.start() + 1:min(v["start"] for v in vs if v["start"] > m.start())].strip() == ""),
                    default=-1)
        lead = ""
        if colon > 0 and any(v["start"] < colon for v in vs):
            lead = line[:colon]
            vs = [v for v in vs if v["start"] > colon]
        kept = []
        for v in vs:
            prev = kept[-1] if kept else None
            between = line[prev["end"]:v["start"]] if prev else ""
            if prev and between.strip() == "=":
                prev["end"] = v["end"]  # "42.8 °C = 109 F": the same value restated, not a second statement
                continue
            if (prev and between.strip() == "(" and prev["unit"] and v["unit"]
                    and not units.same_dims(units.dims_of(prev["unit"]), units.dims_of(v["unit"]))):
                close = line.find(")", v["end"])
                prev["qualifier"] = line[v["start"]:close if close > 0 else len(line)].strip()
                prev["end"] = close + 1 if close > 0 else len(line)
                continue
            kept.append(dict(v))
        pos = len(lead) if lead else 0
        for v in kept:
            label = (lead + " " if lead and pos == len(lead) else "") + line[pos:v["start"]]
            label = label.strip(" :–-•(")
            if v.get("bound"):  # "about", "up to": part of the value (its bound), not of the label
                for m in sorted((w for ws in lex.lang["bound_markers"].values() for w in ws), key=len, reverse=True):
                    if label.lower().endswith(m):
                        label = label[:-len(m)].strip(" :–-•(")
                        break
            if len(kept) == 1:
                v = dict(v, trail=line[v["end"]:].strip(" ()–-•,;."))  # words after a lone value qualify it
            if v.get("qualifier"):
                v["trail"] = (v["qualifier"] + " " + v.get("trail", "")).strip()
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


def _empty():
    return {"kinds": [], "settings": [], "aliases": [], "qconds": {}, "nconds": {}, "entities": [], "parts": [],
            "bearer_kinds": [], "standards": [], "procedures": [], "units": [], "extent": [], "values": [],
            "unplaced": []}


def _merge(out, sub, skip=()):
    for k, v in sub.items():
        if k in skip:
            continue
        if isinstance(v, dict):
            out[k].update(v)
        else:
            out[k] += v


def _take(text, terms):
    """Occurrences of the longest anchor terms in normalised ``text``, in text order. Returns (ids, remaining)."""
    found = []
    for t, i in terms:
        tt = f" {t} "
        if not t:
            continue
        pos = text.find(tt)
        while pos >= 0:
            found.append((pos, i))
            text = text[:pos] + " " + "\0" * len(t) + " " + text[pos + len(t) + 2:]
            pos = text.find(tt)
    return [i for _, i in sorted(found)], text.replace("\0", "")


def _place_text(raw, lex, unit):
    """Slots named by a header text without parentheses. Every slot is identified through universe items."""
    out = _empty()
    text = " " + _norm(raw) + " "
    # quantity conditions: a value whose dimension is a condition concept's, next to one of its markers
    explained = set()
    for cid, c in lex.qconds.items():
        for v in parse_values(raw, lex):
            if v["unit"] and units.same_dims(units.dims_of(v["unit"]), units.dim(**c["quantity_dims"])):
                around = _norm(raw)
                if any(f" {_norm(m)} " in f" {around} " for m in c["markers"]):
                    n = v["numbers"][0][0]
                    out["qconds"][cid] = [n, n, v["unit"]]
                    explained.add(v["start"])
                    span = _norm(raw[v["start"]:v["end"]])
                    text = text.replace(" " + span + " ", " ")
                    for m in c["markers"]:
                        text = text.replace(f" {_norm(m)} ", " ")
    # any other value with a unit in a header (a variant such as "500GB", an unexplained condition) is not absorbed:
    # it stays unplaced, so the content cannot become complete for a thing the header does not name
    for v in parse_values(raw, lex):
        if v["unit"] and v["start"] not in explained:
            span = _norm(raw[v["start"]:v["end"]])
            text = text.replace(" " + span + " ", " ")
            out["unplaced"].append(span.replace(" ", ""))
            out["values"].append(span)
    # settings: a numbered setting word with its number, or named settings in text order
    for w in lex.setting_numbered:
        for m in re.finditer(rf" ({re.escape(w)}) (\d+|[ivx]+) ", text):
            out["settings"].append((m.start(), f"{m.group(1)} {m.group(2)}"))
        text = re.sub(rf" {re.escape(w)} (\d+|[ivx]+) ", " \0 ", text)
    named, text = _take(text, [(w, w) for w in lex.setting_named])
    out["settings"] = [s for _, s in sorted(out["settings"])] + named
    # extent words: the value is the upper or lower end of the quantity's variation (maximum, minimum)
    for end, ws in lex.lang["extent_words"].items():
        for w in ws:
            if f" {w} " in text:
                out["extent"].append(end)
                text = text.replace(f" {w} ", " ")
    # units written as words in the header
    for s, u in lex.surfaces:
        if sum(ch.isalpha() for ch in s) >= 2 and s.lower() not in lex.stop and f" {_norm(s)} " in text:
            out["units"].append(u)
            text = text.replace(f" {_norm(s)} ", " ")
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
    # values of named conditions (a test material), test standards, parts and the bearer's artefact kind
    vals, text = _take(text, [(t, (i, of)) for t, i, of in lex.nvalues])
    for i, of in vals:
        out["nconds"].setdefault(of, [])
        if i not in out["nconds"][of]:
            out["nconds"][of].append(i)
    out["standards"], text = _take(text, lex.standards)
    # coordinated modifiers sharing a head noun name one part each ("freshwater/wastewater tank")
    for m in re.finditer(r" ([^\W\d_]+)/([^\W\d_]+) ([^\W\d_]+) ", text):
        a, b, head = m.group(1), m.group(2), m.group(3)
        pa = [i for t, i in lex.parts if t in (f"{a} {head}", f"{a}{head}")]
        pb = [i for t, i in lex.parts if t in (f"{b} {head}", f"{b}{head}")]
        if pa and pb:
            out["parts"] += [pa[0], pb[0]]
            text = text.replace(m.group(0), " ")
    found, text = _take(text, lex.parts)
    out["parts"] += found
    out["bearer_kinds"], text = _take(text, lex.artefacts)
    axis = {_norm(w) for w in lex.lang.get("axis_words", ())}  # words naming the table's own axes ("Spec")
    out["unplaced"] += [w for w in text.split() if w not in lex.stop and not w.isdigit() and w not in axis
                        and w not in lex.separators and re.search(r"[^\W\d_]", w)]
    return out


def place(segment, lex, names, unit):
    """Slots named by one header segment. A name the document gives (whole, or without its parentheses) is a referent.
    A parenthesis is placed on its own: a procedure ("measured from 3 ft. away with a meter") gives a method and its
    measuring conditions; a second designation of the same setting ("Speed 1 (Low)") is an alias, not a second
    setting; anything else adds its slots. Unexplained words are returned, never dropped."""
    raw = segment or ""
    inner = re.findall(r"\(([^)]*)\)", raw)
    core = re.sub(r"\([^)]*\)", " ", raw).strip()
    out = _empty()
    for cand in (raw.strip(), core):
        key = _name_key(cand)
        if key and key in names:
            out["entities"].append(names[key])
            if cand == raw.strip():
                return out
            break
    if not out["entities"]:
        _merge(out, _place_text(core, lex, unit))
    for x in inner:
        nx = " " + _norm(x) + " "
        if any(nx.startswith(f" {m} ") for m in lex.method_markers):
            sub = _place_text(x, lex, unit)
            out["procedures"].append(x.strip())
            out["qconds"].update(sub["qconds"])
            out["units"] += sub["units"]
            continue
        sub = _place_text(x, lex, unit)
        only_settings = sub["settings"] and not any(sub[k] for k in sub if k not in ("settings",))
        if only_settings and out["settings"]:
            out["aliases"] += sub["settings"]
            continue
        _merge(out, sub)
    return out


# --- proposals ----------------------------------------------------------------------------------------------------------

def _propose(store, body, premises, summary, situating=None):
    """A proposal of the acquisition service: content, inference record and standing (the MS1 contract pattern), not
    situated in any inquiry, so that every later inquiry can use it."""
    ir = Item(f"IR:{SERVICE}:{_h(summary, sorted(premises), body)}", "inference_record",
              {"service": SERVICE, "inquiry": None, "summary": summary, "premises": sorted(premises)}, PROGRAM)
    store.propose(ir, f"{SERVICE} inference")
    cid = f"P:{_h(body)}"
    grounds = [ir.id] + sorted(premises)
    if store.has(f"ST:{cid}") and list(store.get(f"ST:{cid}").body["grounds"]) != grounds:
        cid = f"P:{_h(body, sorted(premises))}"  # the same content supported by another record: its own proposal
    store.propose(Item(cid, "content", body, PROGRAM, situating or {}), summary)
    store.propose(Item(f"ST:{cid}", "standing", {"of": cid, "attitude": "proposed", "holder": "program",
                                                 "grounds": grounds, "label": standing.label(store, grounds)},
                       dict(PROGRAM, source="contract")), "standing of a proposal")
    return cid


def _segments(h):
    return [x for x in re.split(r"\s*[:|–—]\s*|\s+-\s+", h or "") if x.strip()]


def _shaped(s):
    words = _name_key(re.sub(r"\([^)]*\)", " ", s)).split()
    mixed = any(re.search(r"[a-z]", w) and re.search(r"\d", w) for w in words)
    return bool(words) and len(words) <= 8 and any(ch.isupper() or ch.isdigit() for ch in s) and (len(words) >= 2 or mixed)


def context_designation(heading_path):
    """The designation two heading levels agree on (the table's section context, S0 T7, 4.3), or None."""
    if len(heading_path or ()) < 2:
        return None
    a = {_name_key(re.sub(r"\([^)]*\)", " ", x)) for x in _segments(heading_path[-1]) if _shaped(x)}
    b = {_name_key(re.sub(r"\([^)]*\)", " ", x)) for x in _segments(heading_path[-2]) if _shaped(x)}
    common = a & b
    return next(iter(common)) if len(common) == 1 else None


def acquire_document(store, doc):
    """Acquire one document's tables. Returns a summary with item ids (for audits and tests)."""
    lex = Lexicon(store)
    url = doc["url"]
    host = re.sub(r"^https?://([^/]+).*$", r"\1", url)
    src = {"source": url, "holder": host, "basis": "document statement"}
    summary = {"records": [], "contents": [], "incomplete": [], "ambiguities": [], "methods": [], "entities": [],
               "relations": []}

    # referents of this document (S0 D3): a designation denotes a referent of the document that uses it; equal
    # identity keys within one document denote one referent (the holder's own usage); nothing is shared with another
    # document (identity across documents is a recognition content, never a merge)
    names = {}

    def ref_id(key):
        return f"E:{_h(url, key)}"

    def thing_name(text):
        """A designation of a thing: shaped like a name, not a comparison of things, and not explained by universe
        items (a heading "Filter Life" names a quantity of a part, not a thing)."""
        key = _name_key(text)
        if not (len(key) >= 2 and len(key.split()) <= 8 and any(ch.isdigit() or ch.isupper() for ch in text)):
            return None
        if any(f" {_norm(m)} " in f" {_norm(text)} " for m in lex.lang.get("comparison_markers", ())):
            return None
        if set(_norm(text).split()) & {_norm(w) for w in lex.lang.get("predication_words", ())}:
            return None  # a sentence ("The X is one of ..."), not a name
        p = _place_text(text, lex, None)
        if any(p[k] for k in ("kinds", "settings", "parts", "nconds", "standards", "qconds")):
            return None
        if p["bearer_kinds"] and not p["unplaced"]:
            return None  # the kind's own designation ("Robot vacuum"), not the name of a thing
        return key

    for n in doc["names"]:
        key = thing_name(n["text"])
        if key:
            names.setdefault(key, ref_id(key))
    for t in doc["tables"]:
        for c in t["cells"]:
            for ln in c.get("links", ()):
                key = thing_name(ln)
                if key:
                    names.setdefault(key, ref_id(key))
    # the document's subject: the structured-data product name if there is exactly one, else a unique title segment
    # that a table header of the same document names
    subject = None
    headers = {_name_key(re.sub(r"\([^)]*\)", " ", c["text"])) for t in doc["tables"] for c in t["cells"]}
    for sources, needs_header in ((("json-ld-product",), False), (("title_segment",), True)):
        cands = {_name_key(n["text"]) for n in doc["names"] if n["source"] in sources}
        if needs_header:
            cands = {k for k in cands if k in headers}
        cands = {k for k in cands if thing_name(next(n["text"] for n in doc["names"] if _name_key(n["text"]) == k))}
        if len(cands) == 1:
            key = next(iter(cands))
            subject = names.setdefault(key, ref_id(key))
            break

    labels = {}

    def entity(eid, body=None):
        if not store.has(eid):
            label = next((k for k, v in names.items() if v == eid), None)
            b = body or {"label": label}
            b = dict(b, document=url)
            store.acquire(Item(eid, "entity", b, src))
            summary["entities"].append(eid)
        return eid

    # methods: sections whose heading a method concept's anchors name
    methods = {}
    for hd in doc["headings"]:
        t = " " + _norm(hd["text"]) + " "
        if any(" " + _norm(m) + " " in t for m in lex.method_terms):
            body_text = " ".join(b["text"] for b in doc["blocks"] if hd["index"] in b["sectionPath"])
            mid = f"M:{_h(url, hd['index'])}"
            if not store.has(mid):
                store.acquire(Item(mid, "method", {"concept": lex.method, "category": "procedure", "document": url,
                                                   "heading": hd["text"], "section": hd["index"],
                                                   "text_sha256": hashlib.sha256(body_text.encode()).hexdigest()}, src))
            methods[hd["index"]] = mid
            summary["methods"].append(mid)

    def procedure(text):
        """A procedure the document describes in a header (S0 D16): one method item per distinct description."""
        mid = f"M:{_h(url, _norm(text))}"
        if not store.has(mid):
            store.acquire(Item(mid, "method", {"concept": lex.method, "category": "procedure", "document": url,
                                               "text_sha256": hashlib.sha256(text.encode()).hexdigest()}, src))
            summary["methods"].append(mid)
        return mid

    ctx = {"store": store, "lex": lex, "names": names, "entity": entity, "procedure": procedure, "summary": summary,
           "src": src, "url": url, "labels": labels}
    for t in doc["tables"]:
        cells = {(c["row"], c["col"]): c for c in t["cells"]}
        slots = {}  # every grid slot a cell covers (row and column spans), so a spanning header heads each column
        for c in t["cells"]:
            for dr in range(max(1, c.get("rowspan") or 1)):
                for dc in range(max(1, c.get("colspan") or 1)):
                    slots.setdefault((c["row"] + dr, c["col"] + dc), (c["row"], c["col"]))
        isval = {k: is_value_cell(c["text"], lex) for k, c in cells.items()}
        # the leftmost cell of a row with a single-line value cell to its right labels the row, even when its notes
        # contain numbers: its first line is the label and its notes are never read as values
        labelled = set()
        for (r0, c0), c in cells.items():
            left = min(cc for rr, cc in cells if rr == r0)
            if c0 == left and len([x for x in c["text"].splitlines() if x.strip()]) > 1 and any(
                    isval[(r0, cc)] and len(cells[(r0, cc)]["text"].strip().splitlines()) == 1
                    for rr, cc in cells if rr == r0 and cc > c0):
                labelled.add((r0, c0))
                isval[(r0, c0)] = False
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
        # things the table names: a cell whose text, a line of it, or a link is a document designation
        table_names = set()
        for c in t["cells"]:
            lines = [x.strip() for x in c["text"].splitlines() if x.strip()]
            first = lines[0] if lines else ""
            for x in [c["text"], first] + [ln for ln in c.get("links", ()) if _name_key(ln) == _name_key(first)]:
                k = _name_key(re.sub(r"\([^)]*\)", " ", x))
                if k in names:
                    table_names.add(names[k])
        # the table's context: a designation its section headings agree on names the bearer of an unnamed table
        cd = context_designation(t.get("headingPath"))
        cd = thing_name(cd) if cd else None
        context = names.setdefault(cd, ref_id(cd)) if cd else None
        default = context or subject
        if table_names - {default}:
            default = None  # a table that names other things gives no default bearer
        scope = f"T:{_h(url, t['index'])}"  # one table: one measuring series of the document
        for (r, c), cell in sorted(cells.items()):
            if not isval[(r, c)]:
                continue

            def path(keys):
                out = []
                for key in keys:
                    o = slots.get(key)
                    lt = label_text(cells[o]["text"], o in labelled) if o is not None else ""
                    if o is not None and not isval[o] and lt and lt not in out:
                        out.append(lt)
                return out
            colpath = path([(rr, c) for rr in range(first_row[c])])
            rowpath = path([(r, cc) for cc in range(first_col[r])])
            for k, (label, line, v) in enumerate(cell_segments(cell["text"], lex)):
                rid = f"R:{_h(url, t['index'], r, c, k)}"
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
                _interpret(ctx, rid, rec, v, label, colpath, rowpath, default, aid, tmethods, scope)
    return summary


def _part_referent(ctx, whole, part_kind, premises):
    """The part of ``whole`` of kind ``part_kind`` (S0 3.8: entities have parts), with a ``part_of`` relation content
    proposed from the record. One referent per whole and part kind within a document."""
    store, lex = ctx["store"], ctx["lex"]
    pid = f"E:{_h(ctx['url'], whole, part_kind)}"
    if not store.has(pid):
        wl = store.get(whole).body.get("label")
        ctx["entity"](pid, {"label": f"{lex.labels.get(part_kind, part_kind)} of {wl}", "part_kind": part_kind,
                            "whole": whole})
    rel = _propose(store, {"form": "relation", "relation": lex.parthood, "subject": pid, "object": whole}, premises,
                   "the record names a part of the bearer (S0 3.8)")
    if rel not in ctx["summary"]["relations"]:
        ctx["summary"]["relations"].append(rel)
    return pid, rel


def _interpret(ctx, rid, rec, v, label, colpath, rowpath, default, aid, tmethods, scope):
    store, lex, names, summary = ctx["store"], ctx["lex"], ctx["names"], ctx["summary"]
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
                and not p["nconds"] and not p["parts"] and not p["standards"]
                and not (p["bearer_kinds"] and not p["unplaced"])
                and not set(words) & {_norm(w) for w in lex.lang.get("predication_words", ())}
                and words and any(ch.isupper() or ch.isdigit() for ch in seg) and len(words) <= 8
                and (len(words) >= 2 or mixed))
    col_n = [(s, p) for s, p in zip(colpath, placed[:len(colpath)]) if name_shaped(s, p)]
    row_n = [(s, p) for s, p in zip(rowpath, placed[len(colpath):len(colpath) + len(rowpath)]) if name_shaped(s, p)]
    col_k = any(p["kinds"] for p in placed[:len(colpath)])
    row_k = any(p["kinds"] for p in placed[len(colpath):len(colpath) + len(rowpath)])
    for axis, other_has_kind in ((col_n, row_k), (row_n, col_k)):
        if len(axis) == 1 and other_has_kind and not (col_n and row_n):
            seg, p = axis[0]
            key = " ".join(w for w in _name_key(re.sub(r"\([^)]*\)", " ", seg)).split() if w not in edit_keys)
            names.setdefault(key, f"E:{_h(ctx['url'], key)}")
            p.update(_empty())
            p["entities"].append(names[key])  # the whole header is a name ("Soundbar Max")

    def every(k):
        return [x for p in placed for x in p[k]]
    if unit is None:
        hu = sorted(set(every("units")))
        unit = hu[0] if len(hu) == 1 else None
    kinds = sorted(set(every("kinds")))
    parts_named = list(dict.fromkeys(every("parts")))
    if not kinds and parts_named and unit:
        # no kind word: the named part's characteristic quantity, when the value's unit has its dimension
        chars = {k for p in parts_named for k in lex.characteristic.get(p, ()) if _dims_ok(lex.kinds[k], unit)}
        if len(chars) == 1 and all(lex.characteristic.get(p) for p in parts_named):
            kinds = sorted(chars)
    ents = sorted(set(every("entities")))
    settings = every("settings")
    aliases = every("aliases")
    extents = sorted(set(every("extent")))
    parts = list(dict.fromkeys(every("parts")))
    # a kind defined relative to a part (operating time on one charge of the battery) keeps the whole as bearer: the
    # part it names is the kind's reference, not the bearer
    refs = {lex.kinds[k].get("relative_to_part") for k in kinds if k in lex.kinds}
    parts = [p for p in parts if p not in refs]
    bearer_kinds = sorted(set(every("bearer_kinds")))
    qconds, nconds = {}, {}
    for p in placed:
        qconds.update(p["qconds"])
        for k, vs in p["nconds"].items():
            nconds.setdefault(k, [])
            nconds[k] += [x for x in vs if x not in nconds[k]]
    method_ids = sorted({ctx["procedure"](x) for x in every("procedures")} | set(every("standards")))
    if not method_ids and len(tmethods) == 1:
        method_ids = list(tmethods)
    unplaced = every("unplaced")
    incomplete = []
    if unplaced:
        incomplete.append("header words not placed in any slot: " + " ".join(unplaced))
    if not kinds:
        incomplete.append("no quantity kind named")
    if len(kinds) > 1:
        incomplete.append("several quantity kinds fit")
    kb = lex.kinds[kinds[0]] if len(kinds) == 1 else None
    if kb and kb.get("determinable") == "dimension":
        incomplete.append(f"{kinds[0]} is a dimension class, not a determinable of the bearer")
    if unit is None and not all(lex.kinds[k]["dims"] == list(units.NONE) for k in kinds):
        incomplete.append("no unit")
    if len(ents) > 1:
        incomplete.append("several bearers named")
    if len(extents) > 1:
        incomplete.append("both ends of an extent named")
    paired_parts = len(parts) > 1 and v["form"] == "list" and len(parts) == len(v["numbers"])
    if len(parts) > 1 and not paired_parts:
        incomplete.append("several parts named")
    if any(len(vs) > 1 for vs in nconds.values()):
        incomplete.append("several values of one condition")
    whole = ents[0] if len(ents) == 1 else default
    if whole is None:
        incomplete.append("bearer not established")
    if v["form"] == "range" and any(a[0] > b[0] for a, b in [v["numbers"][:2]] if len(v["numbers"]) == 2):
        incomplete.append("range bounds out of order")
    if unit is not None and units.SCALE.get(unit) != "level" and any(lex.kinds[k].get("scale") == "level" for k in kinds):
        incomplete.append("level kind without a level unit")
    premises = [rid, aid] + method_ids
    bearer = whole
    if whole:
        ctx["entity"](whole)
        for k in bearer_kinds:  # the header names the kind of the bearer (S0 3.8 Kind): a relation, not a word
            rel = _propose(store, {"form": "relation", "relation": lex.instantiation, "subject": whole, "object": k},
                           [rid, aid], "the record names the kind of the bearer")
            if rel not in summary["relations"]:
                summary["relations"].append(rel)
        if len(parts) == 1:
            bearer, rel = _part_referent(ctx, whole, parts[0], [rid, aid])
            premises.append(rel)
        part_bearers = [_part_referent(ctx, whole, p, [rid, aid]) for p in parts] if paired_parts else []

    # value readings: number readings x forms; a list of values paired with a list of named settings
    forms = []
    nums = v["numbers"]
    span = kb.get("span") if kb else None
    if span:
        if v["form"] == "range" and len(nums) == 2:
            forms = [({"kind": span["lower"]}, [(x, x) for x in nums[0]]),
                     ({"kind": span["upper"]}, [(x, x) for x in nums[1]])]
        else:
            incomplete.append("a span needs its two limits")
            forms = [({}, [(x, x) for x in nums[0]])]
    elif whole and paired_parts:
        for (pid, rel), rd in zip(part_bearers, nums):  # one value per named part, in the order given
            forms.append(({"bearer": pid, "rel": rel}, [(x, x) for x in rd]))
    elif v["form"] in ("range", "list") and len(settings) == len(nums) and len(nums) > 1 and not (
            v["form"] == "range" and [s.split()[-1] for s in settings] == [
                lex.lang.get("range_end_words", {}).get(e, [None])[0] for e in ("lower", "upper")]):
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
    ends = lex.lang.get("range_end_words", {})
    if v["form"] == "range" and len(settings) == 2 and settings[0] in ends.get("lower", ()) \
            and settings[1] in ends.get("upper", ()):
        settings = []  # "(low – high)": the two ends of the range, not two settings
    if len(settings) > 1:
        incomplete.append("several settings for one value")
    conds = dict(qconds)
    for k, vs in nconds.items():
        conds[k] = vs[0]
    if settings:
        conds[lex.setting] = "V:setting:" + settings[0]
    interval = "variation" if v["form"] == "range" and not span else "measurement"

    for extra, readings in forms:
        c2 = dict(conds)
        if "setting" in extra:
            c2[lex.setting] = "V:setting:" + extra["setting"]
        kids = [extra["kind"]] if "kind" in extra else (kinds or [None])
        b_here = extra.get("bearer", bearer)
        alts = []
        for lo, hi in readings:
            for kid in kids:
                lo2, hi2 = lo, hi
                if v["bound"] == "upper":
                    lo2 = None
                elif v["bound"] == "lower":
                    hi2 = None
                defining = lex.kinds[kid].get("defining_conditions", []) if kid in lex.kinds else []
                unspecified = {d: scope for d in defining if d not in c2}
                if not method_ids:
                    unspecified["method"] = scope
                body = {"form": "quantity", "bearer": b_here, "kind": kid, "lo": lo2, "hi": hi2, "unit": unit,
                        "conditions": c2, "scope": "conditional" if c2 else "invariant",
                        "invariance": None if c2 else "value stated by the source without conditions",
                        "holds_of": "individual", "interprets": rid, "approximate": v["bound"] == "approximate",
                        "extent": extents[0] if extents else None, "interval": interval,
                        "methods": method_ids, "unspecified": unspecified}
                if aliases:
                    body["setting_aliases"] = ["V:setting:" + a for a in aliases]
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
            cid = _propose(store, b, premises + ([extra["rel"]] if "rel" in extra else [])
                           + ([b["alternative_of"]] if "alternative_of" in b else []),
                           "candidate interpretation of a record (structure placed in slots)")
            summary["contents"].append(cid)
            if "incomplete" in b:
                summary["incomplete"].append(cid)
