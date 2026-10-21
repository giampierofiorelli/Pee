"""X2 arms B2-flat, B2 and B2S: Crawler records -> Pee items -> interpretations -> requirement verdicts, through the MS1
store and contract (PREREGISTRATION.md sections 1, 2 and 4).

* Records enter the store by acquisition, attributed to their source. Crawler's interpretations are quarantined.
* The ONLY access to Crawler's parsed value is ``segmentation_of``: it returns the whitelisted structural fields of
  section 1 (kind, numbers, unit or currency symbol, axes) and nothing else. Crawler's bound, approximation,
  qualifier, alternative and every other interpretation are never read.
* A structural hypothesis from Crawler is admitted only after verification against the raw text (every number and
  axis letter occurs there; the unit symbol means something in Pee's metrology and occurs in the value or the label).
  It is then one more alternative reading of the record (P3), interpreted by the same Pee code as Pee's own reading.
* P1 closed reading, P2 interval ends, P3 alternative readings, P4 recognition: see the prereg; no rule names a domain.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import contract  # noqa: E402
from universe.store import Item, Store  # noqa: E402

from .knowledge import Knowledge, stem, tokens  # noqa: E402
from .reading import NUM, Reader, normalise  # noqa: E402

QUARANTINED = "crawler_interpretation"
SEGMENTATION_FIELDS = ("kind", "number", "numbers", "min", "max", "amount", "maxAmount", "unit", "currency", "axes")
MEETS, FAILS, ND = "meets", "fails", "not_determinable"
INTERPRETABLE = ("exact", "approx", "range", "list", "upper", "lower", "tuple_unlabelled")
BLOCKING = INTERPRETABLE + ("unread", "disputed")
MODES = ("flat", "struct", "seg")
CRAWLER_READER = "Crawler 7d091ef value segmentation (structural hypothesis)"


def strip_quarantine(row):
    return {k: v for k, v in row.items() if k != QUARANTINED}


def segmentation_of(row):
    """The single access point to Crawler's parsed value: whitelisted structural fields only, or None."""
    block = row.get(QUARANTINED) or {}
    raw = block.get("value_json")
    if not raw:
        return None
    v = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(v, dict):
        return None
    return {k: v[k] for k in SEGMENTATION_FIELDS if k in v}


class Records:
    """The adapter export without Crawler's interpretations; optionally restricted to some revisions."""

    def __init__(self, path, revisions=None):
        with open(path) as f:
            d = json.load(f)
        keep = set(revisions) if revisions is not None else None
        self.products = {p["product_id"]: strip_quarantine(p) for p in d["products"]}
        self.revisions = {r["revision_id"]: r for r in d["revisions"]}
        self.sources = {s["source_id"]: strip_quarantine(s) for s in d["sources"]}
        self.by_product, self.segmentation = {}, {}
        for x in d["declarations"]:
            if keep is not None and x["revision_id"] not in keep:
                continue
            self.segmentation[x["declaration_id"]] = segmentation_of(x)
            self.by_product.setdefault(x["product_id"], []).append(strip_quarantine(x))

    def provenance(self, decl):
        rev = self.revisions.get(decl["revision_id"], {})
        src = self.sources.get(rev.get("source_id"), {})
        return {"source": rev.get("url") or "unknown url", "holder": src.get("host") or "unknown host",
                "basis": "document statement"}


class Target:
    def __init__(self, concept, qualifiers, conditions, unit=None, extent=None):
        self.concept, self.qualifiers, self.conditions, self.unit, self.extent = (concept, qualifiers, conditions,
                                                                                  unit, extent)


def _close(a, b, tol=1e-6):
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))


class ArmB:
    def __init__(self, records, mode="seg", with_categories=True):
        assert mode in MODES
        self.mode = mode
        self.k = Knowledge(with_categories=with_categories)
        self.r = Reader(self.k)
        self.rec = records
        L = self.k.lang
        self.stop = set(L["stopwords"])
        self.ext_upper = {stem(w) for w in L["extent_upper"]}
        self.ext_lower = {stem(w) for w in L["extent_lower"]}
        self.ext_neutral = {stem(w) for w in L["extent_neutral"]}

    # --- record view per mode -------------------------------------------------------------------------------
    def _view(self, d):
        if self.mode == "flat":  # label and raw value only, attributed to the product
            return {"declaration_id": d["declaration_id"], "property": d["property"], "raw_value": d["raw_value"],
                    "section": None, "component": None, "variant_id": None}
        return d

    # --- recognition (P4) -----------------------------------------------------------------------------------
    def _dims_ok(self, c, dims):
        if dims is None:
            return True
        if c["dims"] == "currency":
            return len(dims) == 1 and dims[0][0].startswith("CUR_")
        if not isinstance(c["dims"], dict):
            return False
        return tuple(sorted((k, v) for k, v in c["dims"].items() if v)) == dims

    def _match_term(self, toks, tt):
        """Positions where term tokens tt occur in toks, allowing one stopword between consecutive term tokens."""
        out = []
        for i in range(len(toks)):
            if toks[i] != tt[0]:
                continue
            pos, j, ok = [i], i, True
            for t in tt[1:]:
                if j + 1 < len(toks) and toks[j + 1] == t:
                    j += 1
                elif j + 2 < len(toks) and toks[j + 1] in self.stop and toks[j + 2] == t:
                    j += 2
                else:
                    ok = False
                    break
                pos.append(j)
            if ok:
                out.append(pos)
        return out

    def recognise(self, phrase_tokens, concepts, dims=None, want_tuple=None, eq=None, neutral=frozenset(),
                  context_tokens=()):
        """Concept named by the phrase (or, failing that, by phrase + context) whose dimension agrees with dims.
        Returns (concept id, qualifiers) or (None, reason). Context tokens (a section heading) may name the concept
        but never add qualifiers."""
        r = self._recognise(phrase_tokens, concepts, dims, want_tuple, eq, neutral)
        if r[0] is None and context_tokens:
            ctx = [stem(t) for t in context_tokens]
            r2 = self._recognise(list(context_tokens) + list(phrase_tokens), concepts, dims, want_tuple, eq,
                                 neutral | frozenset(ctx))
            if r2[0] is not None:
                return r2
        return r

    def _recognise(self, phrase_tokens, concepts, dims, want_tuple, eq, neutral):
        toks = [stem(t) for t in phrase_tokens]
        best, cands = 0, []
        for cid, c in concepts.items():
            for term in c["terms"]:
                tt = [stem(t) for t in tokens(term)]
                if not tt or not self._dims_ok(c, dims):
                    continue
                for pos in self._match_term(toks, tt):
                    n = len(tt)
                    if n > best:
                        best, cands = n, []
                    if n == best:
                        cands.append((cid, pos))
        if not cands:
            if dims == () and toks:  # an unnamed count: the counted thing names it
                quals = self._quals(toks, set(), concepts, (), eq, neutral)
                counts = sorted(cid for cid, c in concepts.items() if c.get("counted") and c["origin"] == "general")
                return (counts[0], quals) if quals and counts else (None, "nothing_named")
            if dims:  # P4: a dimensioned value naming no known quantity is the generic quantity of that dimension
                gen = sorted(cid for cid, c in concepts.items() if c.get("generic") and self._dims_ok(c, dims))
                if len(gen) == 1:
                    quals = self._quals(toks, set(), concepts, concepts[gen[0]]["dims"], eq, neutral, gen[0])
                    if quals:
                        return gen[0], quals
            return None, "no_concept_named_for_this_unit"
        if any(concepts[c]["origin"] != "general" for c, _ in cands):
            cands = [x for x in cands if concepts[x[0]]["origin"] != "general"]
        if want_tuple is not None and len({c for c, _ in cands}) > 1:
            pref = [x for x in cands if bool(concepts[x[0]].get("tuple_of_axes")) == want_tuple]
            cands = pref or cands
        ids = sorted({c for c, _ in cands})
        if len(ids) > 1:
            nongen = [i for i in ids if not concepts[i].get("generic")]
            if len(nongen) == 1:  # a specific concept is preferred over a generic one named by the same word
                ids = nongen
                cands = [x for x in cands if x[0] in ids]
            else:
                return None, "ambiguous: " + ", ".join(ids)
        cid, pos = cands[0]
        return cid, self._quals(toks, set(pos), concepts, concepts[cid]["dims"], eq, neutral, cid)

    def _quals(self, toks, used, concepts, dims, eq, neutral=frozenset(), cid=None):
        same_dim_terms = set()
        for c in concepts.values():
            if c["dims"] == dims or (isinstance(dims, tuple) and self._dims_ok(c, dims)):
                same_dim_terms |= {stem(t) for t in c["terms"] if len(tokens(t)) == 1}
        # words of the concept's own definition are implied by it: they do not narrow the quantity
        defined = {stem(t) for t in tokens(concepts[cid].get("label", ""))} - self.stop if cid else set()
        q = set()
        for j, t in enumerate(toks):
            if (j in used or t in self.stop or t in same_dim_terms or t in neutral or t in defined
                    or not any(ch.isalnum() for ch in t)):
                continue
            q.add((eq or {}).get(t, t))
        return frozenset(q)

    # --- alternative value segmentations (P3) ---------------------------------------------------------------
    def _crawler_groups(self, d, text, lunit):
        """Crawler's segmentation turned into value groups, verified against the raw text. None if unverifiable."""
        s = self.rec.segmentation.get(d["declaration_id"]) if self.mode == "seg" else None
        if not s:
            return None
        kind = s.get("kind")
        if kind in ("quantity", "number"):
            nums, form = [s.get("number")], "single"
        elif kind == "range":
            nums, form = [s.get("min"), s.get("max")], "range"
        elif kind == "dimensions":
            nums, form = list(s.get("numbers") or []), "tuple"
        elif kind == "options":
            nums, form = list(s.get("numbers") or []), "list"
        elif kind == "price":
            nums, form = ([s.get("amount"), s.get("maxAmount")], "range") if s.get("maxAmount") is not None \
                else ([s.get("amount")], "single")
        else:
            return None
        if not nums or any(not isinstance(n, (int, float)) for n in nums):
            return None
        occ = [(m.start(), m.end(), float(m.group(1))) for m in NUM.finditer(text)]
        spans, k = [], 0
        for n in nums:  # every number occurs in the raw text, in order
            while k < len(occ) and not _close(occ[k][2], float(n)):
                k += 1
            if k == len(occ):
                return None
            spans.append(occ[k])
            k += 1
        sym = s.get("currency") if kind == "price" else s.get("unit")
        unit = None
        if sym:
            unit = self.r.parse_unit_text(str(sym))
            if unit is None:
                return None  # a symbol Pee's metrology does not know is unusable
            found = [m for m in self.r.mentions(text) if m["unit"] is not None and m["unit"].id == unit.id]
            if not found and not (lunit is not None and lunit.id == unit.id):
                return None  # the unit occurs neither in the value nor in the label
        start, end = spans[0][0], spans[-1][1]
        for m in self.r.mentions(text):  # extend over a unit written right after the last number
            if m["num_start"] == spans[-1][0] and m["unit"] is not None:
                end = max(end, m["end"])
            if m["num_start"] == spans[0][0]:
                start = min(start, m["start"])
        axes, axis_spans = None, []
        if form == "tuple":
            ax = s.get("axes")
            if ax:
                if len(ax) != len(nums):
                    return None
                low = text.lower()
                axes = []
                for a, sp in zip(ax, spans):  # each axis letter or word occurs as a word next to its number
                    a = str(a).lower()
                    lo = max(0, sp[0] - 12)
                    hits = [m for m in re.finditer(r"(?<![a-z])" + re.escape(a) + r"(?![a-z])", low[lo: sp[1] + 12])]
                    if not hits:
                        return None
                    h = min(hits, key=lambda m: abs(lo + m.start() - sp[0]))
                    axis_spans.append((lo + h.start(), lo + h.end()))
                    axes.append(self.r.axis_words.get(a))
                if not all(axes):
                    return None
        return [{"form": form, "values": [float(n) for n in nums], "unit": unit, "units": [unit] * len(nums),
                 "mixed_units": False, "axes": axes, "start": start, "end": end, "prefix": text[:start],
                 "suffix": text[end:], "axis_spans": axis_spans}]

    # --- readings of one product ------------------------------------------------------------------------------
    def readings(self, pid, concepts, eq, neutral=frozenset()):
        out = []
        for d0 in self.rec.by_product.get(pid, []):
            d = self._view(d0)
            phrase, lunit, laxes, lquals, lconds, unit_words = self.r.split_label(d["property"])
            ptoks = tokens(phrase) + lquals + tokens(d.get("component") or "")
            ctx = tokens(d.get("section") or "") if self.mode != "flat" else []
            groups, explained, text = self.r.groups(d["raw_value"] or "")
            sources = [("pee", groups, explained)]
            cg = self._crawler_groups(d0, text, lunit)
            if cg:  # words left over are judged by Pee alone (P1); the segmentation only supplies numbers and form
                sources.append(("crawler", cg, explained + [(g["start"], g["end"]) for g in cg]
                                + [sp for g in cg for sp in g["axis_spans"]]))
            for src, gs, expl in sources:
                for rd in self._interpret(d, src, gs, expl, text, ptoks, ctx, lunit, laxes, lconds, unit_words,
                                          concepts, eq, neutral):
                    out.append(rd)
        return self._agree(out)

    def _interpret(self, d, src, groups, explained, text, ptoks, ctx, lunit, laxes, lconds, unit_words, concepts, eq,
                   neutral):
        out = []
        if not groups:
            return out
        main = groups[0]
        words, symbols = self.r.residue(text, explained, main)
        rq = frozenset((eq or {}).get(w, w) for w in words if w not in neutral)
        vconds = []
        for g in groups:
            vconds += self.r.conditions(g["suffix"])
        for gi, g in enumerate(groups):
            unit = g["unit"] or lunit
            ptoks_g = ptoks
            if unit is None and len(unit_words) == 1:  # P4: a unit named inside the label applies, and is no qualifier
                unit = unit_words[0][1]
                ptoks_g = [t for t in ptoks if t != unit_words[0][0]]
            if gi > 0 and g["unit"] is None:
                continue
            if g["mixed_units"]:
                continue
            dims = unit.dims if unit is not None else None
            cid, q = self.recognise(ptoks_g, concepts, dims=dims, want_tuple=(g["form"] == "tuple"), eq=eq,
                                    neutral=neutral, context_tokens=ctx)
            if cid is None and unit is not None:
                alt = self._reread_unit(ptoks_g, concepts, unit, eq, neutral)
                if alt:
                    cid, q, unit = alt
            conds = lconds + vconds
            if cid is None and unit is None and rq and g["form"] == "single" and gi == 0:
                # P4: a unitless number followed by words that are not a unit counts the thing they name
                cid, q = self.recognise(ptoks_g + sorted(rq), concepts, dims=(), eq=eq, neutral=neutral)
                if cid is not None and not symbols:
                    out.append(self._reading(d, src, cid, q | rq, "exact", [(g["values"][0], g["values"][0])],
                                             None, conds))
                    continue
                cid = None
            if cid is None:
                if unit is None:
                    c0, q0 = self.recognise(ptoks, concepts, dims=None, eq=eq, neutral=neutral, context_tokens=ctx)
                    if c0:
                        out.append(self._reading(d, src, c0, q0 | rq, "no_unit", [], None, conds))
                continue
            q = q | rq
            c = concepts[cid]
            if symbols:  # P1: an unexplained symbol blocks a conclusion from this reading
                out.append(self._reading(d, src, cid, q, "unread", [], unit, conds))
                continue
            if unit is None and c["dims"] != {}:
                out.append(self._reading(d, src, cid, q, "no_unit", [], None, conds))
                continue
            vals = [unit.to_coherent(v) if unit is not None else v for v in g["values"]]
            if g["form"] == "tuple":
                axes = g["axes"] if g["axes"] and all(g["axes"]) else laxes
                axis_concepts = {cc.get("axis"): i for i, cc in concepts.items() if cc.get("axis")}
                if axes and len(axes) == len(vals) and len(set(axes)) == len(axes):
                    for a, v in zip(axes, vals):
                        if a in axis_concepts:
                            out.append(self._reading(d, src, axis_concepts[a], q, "exact", [(v, v)], unit, conds))
                elif len(vals) == 3:
                    # P3: three unlabelled extents of a solid; the asked axis is one of them, which one is open
                    for a, i2 in axis_concepts.items():
                        out.append(self._reading(d, src, i2, q, "tuple_unlabelled", [(v, v) for v in vals], unit,
                                                 conds))
                else:
                    for a, i2 in axis_concepts.items():
                        out.append(self._reading(d, src, i2, q, "axes_unlabelled", [], unit, conds))
                continue
            if c.get("tuple_of_axes"):
                continue
            bound = self.r.bound_of(g)
            if g["form"] == "tolerance" and len(g["values"]) == 2:
                x, tol = vals[0], g["values"][1] * (unit.factor if unit is not None else 1.0)
                form, iv = "range", [(x - abs(tol), x + abs(tol))]
            elif g["form"] == "range":
                form, iv = "range", [(min(vals), max(vals))]
            elif g["form"] == "list":
                form, iv = "list", [(v, v) for v in vals]
            else:
                v = vals[0]
                if bound == "approx":
                    t = self.k.tol["approximate_relative"] * abs(v)
                    form, iv = "approx", [(v - t, v + t)]
                elif bound in ("upper", "lower"):
                    form, iv = bound, [(v, v)]
                else:
                    form, iv = "exact", [(v, v)]
            out.append(self._reading(d, src, cid, q, form, iv, unit, conds))
        return out

    def _agree(self, rds):
        """P3: when Pee's and Crawler's segmentations of a declaration give the same interpretations, Pee's readings
        are kept (their only premise is the record); when only one segmentation reads it, its readings are kept;
        otherwise both sets are kept as alternatives ('alt'), and a verdict must hold under each of them."""
        by = {}
        for r in rds:
            by.setdefault(r["decl"], {}).setdefault(r["source"], []).append(r)
        sig = lambda v: sorted({(r["concept"], tuple(sorted(r["qualifiers"])), r["form"],  # noqa: E731
                                 tuple(tuple(round(x, 9) for x in iv) for iv in r["iv"]), r["dims"]) for r in v})
        out = []
        for decl, srcs in by.items():
            if len(srcs) == 1:
                out += next(iter(srcs.values()))
            elif sig(srcs["pee"]) == sig(srcs["crawler"]):
                out += [dict(r, agreed_by=("pee", "crawler")) for r in srcs["pee"]]
            else:
                out += [dict(r, alt=True) for r in srcs["pee"] + srcs["crawler"]]
        return out

    def _per_decl(self, decided, rds, tgt):
        """Verdict of each declaration under each of its segmentations (P3). A declaration concludes only if every
        segmentation that reads it gives the same verdict about the target; one that reads it as something else
        disagrees."""
        readers = {}
        for r in rds:
            readers.setdefault(r["decl"], set()).add(r["source"])
        per = {}
        for r, v, why in decided:
            per.setdefault(r["decl"], {}).setdefault(r["source"], []).append((r, v, why))
        out = []
        for decl, srcs in per.items():
            verdicts = {}
            for src, lst in srcs.items():
                vs = {v for _, v, _ in lst}
                if len(vs) > 1 and (MEETS in vs and FAILS in vs):
                    verdicts[src] = ND
                elif MEETS in vs or FAILS in vs:
                    blocked = any(v == ND and r["form"] in BLOCKING for r, v, _ in lst)
                    verdicts[src] = ND if blocked else (MEETS if MEETS in vs else FAILS)
                else:
                    verdicts[src] = ND
            missing = readers.get(decl, set()) - set(srcs)
            if len(set(verdicts.values())) == 1 and not missing:
                v = next(iter(verdicts.values()))
                for src, lst in srcs.items():
                    for r, _, why in lst:
                        out.append((r, v, why))
                    break  # one segmentation's readings stand for the declaration
            else:
                r0 = next(iter(srcs.values()))[0][0]
                out.append((dict(r0, form="disputed"), ND, "segmentations_disagree"))
        return out

    def _reread_unit(self, ptoks, concepts, unit, eq, neutral):
        for cid, c in concepts.items():
            rd = c.get("unit_readings")
            if not rd:
                continue
            for surface, target in rd.items():
                u0 = self.r.parse_unit_text(surface)
                if u0 is not None and u0.id == unit.id:
                    u2 = self.k.units[target]
                    c2, q2 = self.recognise(ptoks, {cid: c}, dims=u2.dims, eq=eq, neutral=neutral)
                    if c2:
                        return c2, q2, u2
        return None

    def _reading(self, d, src, cid, q, form, iv, unit, conds):
        return {"decl": d["declaration_id"], "source": src, "concept": cid, "qualifiers": frozenset(q), "form": form,
                "iv": iv, "unit": unit.id if unit is not None else None, "dims": unit.dims if unit is not None else (),
                "scale": getattr(unit, "scale", None), "reference": getattr(unit, "reference", None), "conds": conds,
                "variant": d.get("variant_id")}

    # --- requirement target -------------------------------------------------------------------------------
    def _neutral(self, q):
        """P4: words naming the product's own kind denote the whole product; they never narrow a quantity."""
        return frozenset(stem(t) for t in tokens(q.get("category_words") or "") if t not in self.stop)

    def _unit_and_scale(self, text):
        """A requirement's unit text, with number multipliers ('million keystrokes') taken out as a scale."""
        scale, words = 1.0, []
        for w in (text or "").split():
            if w.lower() in self.r.multipliers:
                scale *= self.r.multipliers[w.lower()]
            else:
                words.append(w)
        return " ".join(words), scale

    def target(self, q, concepts, eq, neutral=frozenset()):
        utext, self._scale = self._unit_and_scale(q.get("unit"))
        q = dict(q, unit=utext)
        unit = self.r.parse_unit_text(q.get("unit") or "")
        ptoks = tokens(q["property"])
        extent = None
        st = [stem(t) for t in ptoks]
        if any(t in self.ext_upper for t in st):
            extent = "upper"
        if any(t in self.ext_lower for t in st):
            extent = None if extent else "lower"  # both ends named: no single end
        if extent:  # P2: a word naming an end of an extent selects that end; it does not narrow the quantity
            drop = self.ext_upper | self.ext_lower | self.ext_neutral
            ptoks = [t for t in ptoks if stem(t) not in drop]
        if unit is None and (q.get("unit") or "").strip():
            ptoks += tokens(q["unit"])
            dims = ()
        else:
            dims = unit.dims if unit is not None else ()
        cid, quals = self.recognise(ptoks, concepts, dims=dims, want_tuple=False, eq=eq, neutral=neutral)
        if cid is None and unit is not None:
            alt = self._reread_unit(ptoks, concepts, unit, eq, neutral)
            if alt:
                cid, quals, unit = alt
        conds = self.r.conditions("at " + q["conditions"]) if q.get("conditions") else []
        return Target(cid, quals, conds, unit, extent), (None if cid else quals)

    # --- decisions ----------------------------------------------------------------------------------------
    def _cond_ok(self, tconds, rconds):
        tol = self.k.tol["agreement_relative"]
        for tc in tconds:
            if tc[0] == "num":
                ok = any(rc[0] == "num" and rc[1] == tc[1] and rc[2] == tc[2] and
                         abs(rc[3] - tc[3]) <= tol * max(1.0, abs(tc[3])) for rc in rconds)
            else:
                ok = any(rc[0] == "text" and rc[2] == tc[2] for rc in rconds)
            if not ok:
                return False
        return True

    @staticmethod
    def _cmp(x, op, L, eps):
        if op == "at_least":
            return x >= L - eps
        if op == "at_most":
            return x <= L + eps
        if op == "more_than":
            return x > L + eps
        return x < L - eps

    def decide(self, rd, op, L, extent=None):
        eps = 1e-9 * max(1.0, abs(L))
        form, iv = rd["form"], rd["iv"]
        if form not in INTERPRETABLE:
            return ND, form
        if extent and form in ("range", "list"):  # P2: the named end of the extent is the value asked about
            v = max(hi for _, hi in iv) if extent == "upper" else min(lo for lo, _ in iv)
            form, iv = "extent_" + extent, [(v, v)]
        if form == "upper":
            v = iv[0][0]
            if op in ("at_most", "less_than") and self._cmp(v, op, L, eps):
                return MEETS, "declared upper bound already satisfies the limit"
            if op in ("at_least", "more_than") and not self._cmp(v, op, L, eps):
                return FAILS, "declared upper bound is below the required minimum"
            return ND, "bound_only"
        if form == "lower":
            v = iv[0][0]
            if op in ("at_least", "more_than") and self._cmp(v, op, L, eps):
                return MEETS, "declared lower bound already satisfies the limit"
            if op in ("at_most", "less_than") and not self._cmp(v, op, L, eps):
                return FAILS, "declared lower bound is above the allowed maximum"
            return ND, "bound_only"
        allok = all(self._cmp(lo, op, L, eps) and self._cmp(hi, op, L, eps) for lo, hi in iv)
        allfail = all(not self._cmp(lo, op, L, eps) and not self._cmp(hi, op, L, eps) for lo, hi in iv)
        if allok:
            return MEETS, form
        if allfail:
            return FAILS, form
        return ND, "range_or_list_straddles" if form != "tuple_unlabelled" else "verdict_depends_on_axis_reading"

    def _compatible_scale(self, target_unit, rd):
        if rd["scale"] != "level":
            return True
        tref = getattr(target_unit, "reference", None)
        return tref in (None, "unspecified") or tref == rd["reference"]

    # --- store ---------------------------------------------------------------------------------------------
    def _store(self, q, pids):
        st = Store()
        st.register_kind("requirement", "X2: a buyer's stated requirement (S0 7.4 goals and norms)")
        st.register_kind("structural_hypothesis", "X2: Crawler's verified value segmentation, a reading hypothesis")
        for pid in pids:
            for d in self.rec.by_product.get(pid, []):
                st.acquire(Item(d["declaration_id"], "record", self._view(d), self.rec.provenance(d)))
        rid = f"REQ:{q['id']}"
        st.acquire(Item(rid, "requirement", {k: v for k, v in q.items() if k != "author_note"},
                        {"source": "X2 question set", "holder": "buyer (question author)",
                         "basis": "stated requirement"}))
        st.acquire(Item(f"I:{q['id']}", "inquiry", {"question": rid, "roles": {f"p{n}": p for n, p in enumerate(pids)},
                                                   "conditions": {}, "scope_assumptions": []},
                        {"source": "X2 harness", "holder": "harness", "basis": "definition"}))
        return st, st.get(f"I:{q['id']}")

    def _premises(self, st, rd):
        prem = [rd["decl"]]
        if rd["source"] == "crawler":  # a reading only Crawler's segmentation yields rests on that hypothesis
            sid = f"SEG:{rd['decl']}"
            if not st.has(sid):
                st.acquire(Item(sid, "structural_hypothesis", self.rec.segmentation.get(rd["decl"]),
                                {"source": rd["decl"], "holder": CRAWLER_READER, "basis": "hypothesis"}))
            prem.append(sid)
        return prem

    def _propose_reading(self, st, inq, rd):
        body = {"form": "interpretation", "bearer": None, "concept": rd["concept"],
                "qualifiers": sorted(rd["qualifiers"]), "value_form": rd["form"], "intervals": rd["iv"],
                "unit": rd["unit"], "conditions": [list(map(str, c)) for c in rd["conds"]], "interprets": rd["decl"],
                "segmentation": rd.get("agreed_by") or (rd["source"],)}
        return contract._propose(st, "reading", inq, body, self._premises(st, rd),
                                 "reading of a declaration (hypothesis)")

    # --- answers ------------------------------------------------------------------------------------------
    def answer(self, q):
        cat = self.k.category_of(q.get("category_words"))
        concepts = self.k.concepts_for(cat)
        eq = self.k.qualifier_equivalents(cat)
        neutral = self._neutral(q)
        if q["type"] == "limit":
            return self._limit(q, concepts, eq, cat, neutral)
        return self._compare(q, concepts, eq, cat, neutral)

    def _limit(self, q, concepts, eq, cat, neutral):
        pid = q["product_id"]
        st, inq = self._store(q, [pid])
        tgt, _ = self.target(q, concepts, eq, neutral)
        base = {"id": q["id"], "arm_mode": self.mode, "category_knowledge": cat["category"]["id"] if cat else None}
        if tgt.concept is None:
            return dict(base, verdict=ND, reason="requirement_not_understood", grounds=[], store_events=st.seq)
        v = float(q["value"]) * self._scale
        L = tgt.unit.to_coherent(v) if tgt.unit is not None else v
        rds = self.readings(pid, concepts, eq, neutral)
        same = [r for r in rds if r["concept"] == tgt.concept]
        exact = [r for r in same if r["qualifiers"] == tgt.qualifiers]
        if not exact:
            reason = "related_quantity_only" if same else "not_declared"
            return dict(base, verdict=ND, reason=reason, grounds=[], target=tgt.concept, store_events=st.seq)
        prod = [r for r in exact if not r["variant"]]
        if not prod:
            return dict(base, verdict=ND, reason="variant_only", grounds=[], target=tgt.concept, store_events=st.seq)
        if tgt.conditions:
            prod = [r for r in prod if self._cond_ok(tgt.conditions, r["conds"])]
            if not prod:
                return dict(base, verdict=ND, reason="conditions_other_or_unstated", grounds=[],
                            target=tgt.concept, store_events=st.seq)
        tdims = tgt.unit.dims if tgt.unit is not None else ()
        incommensurable = [r for r in prod if r["form"] not in ("no_unit",) and r["dims"] != tdims
                           and r["form"] not in ("unread", "disputed")]
        prod = [r for r in prod if r["form"] in ("no_unit", "unread", "disputed") or r["dims"] == tdims]
        if not prod:
            return dict(base, verdict=ND, reason="units_incommensurable", grounds=[r["decl"] for r in incommensurable],
                        target=tgt.concept, store_events=st.seq)
        prod2 = [r for r in prod if self._compatible_scale(tgt.unit, r)]
        if not prod2:
            return dict(base, verdict=ND, reason="scale_reference_differs", grounds=[], target=tgt.concept,
                        store_events=st.seq)
        decided = self._per_decl([(r, *self.decide(r, q["comparator"], L, tgt.extent)) for r in prod2], rds, tgt)
        verdicts = {v for _, v, _ in decided}
        if MEETS in verdicts and FAILS in verdicts:
            verdict, reason = ND, "sources_disagree"
        elif MEETS in verdicts or FAILS in verdicts:
            verdict = MEETS if MEETS in verdicts else FAILS
            undecided = [r for r, v, _ in decided if v == ND and r["form"] in BLOCKING]
            if undecided:
                verdict, reason = ND, "another_reading_does_not_conclude: " + ",".join(
                    sorted({r["form"] for r in undecided}))
            else:
                reason = "; ".join(sorted({why for _, v, why in decided if v == verdict}))
        else:
            verdict, reason = ND, "; ".join(sorted({why for _, _, why in decided}))
        grounds = []
        if verdict != ND:
            used = [r for r, v, _ in decided if v == verdict]
            cids = [self._propose_reading(st, inq, r) for r in used]
            body = {"form": "requirement_verdict", "requirement": f"REQ:{q['id']}", "bearer": pid,
                    "concept": tgt.concept, "verdict": verdict, "extent": tgt.extent}
            vid = contract._propose(st, "requirement", inq, body, cids, f"requirement check: {verdict}")
            grounds = [r["decl"] for r in used]
            standing = st.get(f"ST:{vid}").body["label"]
            if any(r["form"] == "approx" for r in used):
                standing += "; conditional on the approximation assumption"
            if any(r["form"] == "tuple_unlabelled" for r in used):
                standing += "; independent of the axis reading"
        else:
            standing = "no conclusion"
        return dict(base, verdict=verdict, reason=reason, grounds=grounds, target=tgt.concept,
                    qualifiers=sorted(tgt.qualifiers), extent=tgt.extent, standing=standing,
                    segmentation_sources=sorted({s for r, v, _ in decided if v == verdict
                                                 for s in (r.get("agreed_by") or (r["source"],))}),
                    store_events=st.seq)

    def _product_value(self, rds, tgt):
        rs = [r for r in rds if not r["variant"]]
        if tgt.conditions:
            rs = [r for r in rs if self._cond_ok(tgt.conditions, r["conds"])]
        if not rs:
            return None, "not_declared", []
        if any(r["form"] not in ("exact", "approx", "range") for r in rs):
            return None, "bound_list_or_unit_missing", rs
        lo, hi = min(r["iv"][0][0] for r in rs), max(r["iv"][0][1] for r in rs)
        tol = self.k.tol["agreement_relative"]
        if any(r["form"] == "exact" for r in rs):
            ex = [r["iv"][0][0] for r in rs if r["form"] == "exact"]
            if max(ex) - min(ex) > tol * max(abs(max(ex)), abs(min(ex)), 1e-12):
                return None, "sources_disagree", rs
        return (lo, hi), None, rs

    def _compare(self, q, concepts, eq, cat, neutral):
        p1, p2 = q["p1"], q["p2"]
        st, inq = self._store(q, [p1, p2])
        base = {"id": q["id"], "arm_mode": self.mode, "category_knowledge": cat["category"]["id"] if cat else None}
        ptoks = tokens(q["property"])
        r1 = self.readings(p1, concepts, eq, neutral)
        r2 = self.readings(p2, concepts, eq, neutral)
        conds = self.r.conditions("at " + q["conditions"]) if q.get("conditions") else []
        options = []
        for cid in sorted({r["concept"] for r in r1} & {r["concept"] for r in r2}):
            c = concepts[cid]
            if c["dims"] == "currency":
                dims = None
            else:
                dims = tuple(sorted((k, v) for k, v in c["dims"].items() if v))
            c2, quals = self.recognise(ptoks, {cid: c}, dims=dims, eq=eq, neutral=neutral)
            if c2 is None and c.get("generic"):
                c2, quals = self.recognise(ptoks, concepts, dims=dims, eq=eq, neutral=neutral)
                if c2 != cid:
                    c2 = None
            if c2:
                options.append((cid, quals))
        cands = []
        for cid, quals in options:
            a = [r for r in r1 if r["concept"] == cid and r["qualifiers"] == quals]
            b = [r for r in r2 if r["concept"] == cid and r["qualifiers"] == quals]
            if a and b:
                cands.append((cid, quals, a, b))
        if len(cands) != 1:
            return dict(base, verdict=ND, reason="no_common_quantity" if not cands else "ambiguous_quantity",
                        grounds=[], store_events=st.seq)
        cid, quals, a, b = cands[0]
        if any(r.get("alt") for r in a + b):
            return dict(base, verdict=ND, reason="segmentations_disagree", grounds=[], target=cid, store_events=st.seq)
        tgt = Target(cid, quals, conds)
        v1, why1, ra = self._product_value(a, tgt)
        v2, why2, rb = self._product_value(b, tgt)
        if v1 is None or v2 is None:
            return dict(base, verdict=ND, reason=why1 or why2, grounds=[], target=cid, store_events=st.seq)
        if len({(r["dims"], r["scale"], r["reference"]) for r in ra + rb}) > 1:
            return dict(base, verdict=ND, reason="scale_reference_differs", grounds=[], target=cid, store_events=st.seq)
        if concepts[cid].get("condition_sensitive"):
            c1 = {frozenset(map(str, r["conds"])) for r in ra}
            c2 = {frozenset(map(str, r["conds"])) for r in rb}
            if len(c1) != 1 or c1 != c2 or c1 == {frozenset()}:
                return dict(base, verdict=ND, reason="conditions_not_shown_equal", grounds=[], target=cid,
                            store_events=st.seq)
        tol = self.k.tol["agreement_relative"]
        prefer_low = q["prefer"] == "lower"
        if v1[1] < v2[0] or v2[1] < v1[0]:
            lower = "p1" if v1[1] < v2[0] else "p2"
            verdict = lower if prefer_low else ("p2" if lower == "p1" else "p1")
        elif v1[0] == v1[1] and v2[0] == v2[1] and abs(v1[0] - v2[0]) <= tol * max(abs(v1[0]), 1e-12):
            verdict = "equal"
        else:
            return dict(base, verdict=ND, reason="values_overlap", grounds=[], target=cid, store_events=st.seq)
        cids = [self._propose_reading(st, inq, r) for r in ra + rb]
        vid = contract._propose(st, "comparison", inq, {"form": "comparison_verdict", "requirement": f"REQ:{q['id']}",
                                                        "concept": cid, "verdict": verdict}, cids, "comparison")
        return dict(base, verdict=verdict, reason="compared", grounds=[r["decl"] for r in ra + rb], target=cid,
                    standing=st.get(f"ST:{vid}").body["label"], store_events=st.seq)


__all__ = ["ArmB", "Records", "segmentation_of", "strip_quarantine", "SEGMENTATION_FIELDS", "MODES"]
