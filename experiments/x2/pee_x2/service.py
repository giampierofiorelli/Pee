"""X1 arm B: Crawler records -> Pee items -> interpretations -> requirement verdicts, through the MS1 store and
contract.

* Records enter the shared store by acquisition, attributed to their source (attribution before adoption, S0 6.1).
  Crawler's own interpretations are stripped before anything reaches Pee (owner correction 2).
* Interpretations are proposals (basis 'derived') with an inference record and a Standing item (MS1 contract).
* A verdict is a proposal grounded on interpretation contents. The buyer's requirement is part of the verdict's
  content, never one of its epistemic grounds (planes kept apart, plan I5).
* Unjustified conclusions are the critical error (PREREGISTRATION.md S1): where knowledge does not license a
  conclusion the answer is 'not_determinable', with the reason and what would settle it.
"""
import itertools
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(HERE.parent / "universe"), str(HERE.parent / "s1core")]

from universe import contract  # noqa: E402
from universe.store import Item, Store  # noqa: E402

from .knowledge import Knowledge, stem, tokens  # noqa: E402
from .reading import Reader, normalise  # noqa: E402

QUARANTINED = "crawler_interpretation"
MEETS, FAILS, ND = "meets", "fails", "not_determinable"


def strip_quarantine(row):
    """The only place the quarantined block is touched: it is removed, never read."""
    return {k: v for k, v in row.items() if k != QUARANTINED}


class Records:
    """The adapter export, without Crawler's interpretations."""

    def __init__(self, path):
        with open(path) as f:
            d = json.load(f)
        self.products = {p["product_id"]: strip_quarantine(p) for p in d["products"]}
        self.revisions = {r["revision_id"]: r for r in d["revisions"]}
        self.sources = {s["source_id"]: strip_quarantine(s) for s in d["sources"]}
        self.by_product = {}
        for x in d["declarations"]:
            self.by_product.setdefault(x["product_id"], []).append(strip_quarantine(x))

    def provenance(self, decl):
        rev = self.revisions.get(decl["revision_id"], {})
        src = self.sources.get(rev.get("source_id"), {})
        return {"source": rev.get("url") or "unknown url", "holder": src.get("host") or "unknown host",
                "basis": "document statement"}


class Target:
    """What a requirement or comparison asks about: concept, qualifiers, conditions."""

    def __init__(self, concept, qualifiers, conditions, unit=None):
        self.concept, self.qualifiers, self.conditions, self.unit = concept, qualifiers, conditions, unit


class ArmB:
    def __init__(self, records, with_categories=True):
        self.k = Knowledge(with_categories=with_categories)
        self.r = Reader(self.k)
        self.rec = records
        self.stop = set(self.k.lang["stopwords"])

    # --- recognition ----------------------------------------------------------------------------------------
    def _dims_ok(self, c, dims):
        if dims is None:
            return True
        if c["dims"] == "currency":
            return len(dims) == 1 and dims[0][0].startswith("CUR_")
        return tuple(sorted((k, v) for k, v in c["dims"].items() if v)) == dims

    def recognise(self, phrase_tokens, concepts, dims=None, want_tuple=None, eq=None):
        """Concept named by the phrase whose dimension agrees with ``dims``. Returns (concept id, qualifiers) or
        (None, reason). Longest term wins; category concepts are preferred over general ones; remaining content
        words are qualifiers (they narrow or change the quantity), except words that themselves name a quantity
        of the same dimension."""
        toks = [stem(t) for t in phrase_tokens]
        best, cands = 0, []
        for cid, c in concepts.items():
            for term in c["terms"]:
                tt = [stem(t) for t in tokens(term)]
                n = len(tt)
                for i in range(len(toks) - n + 1):
                    if toks[i:i + n] == tt and self._dims_ok(c, dims):
                        if n > best:
                            best, cands = n, []
                        if n == best:
                            cands.append((cid, i, n))
        if not cands:
            if dims == () and toks:  # an unnamed count: the counted thing names it
                quals = self._quals(toks, set(), concepts, (), eq)
                counts = sorted(cid for cid, c in concepts.items() if c.get("counted") and c["origin"] == "general")
                return (counts[0], quals) if quals and counts else (None, "nothing_named")
            return None, "no_concept_named_for_this_unit"
        if any(concepts[c]["origin"] != "general" for c, _, _ in cands):
            cands = [x for x in cands if concepts[x[0]]["origin"] != "general"]
        if want_tuple is not None and len({c for c, _, _ in cands}) > 1:
            pref = [x for x in cands if bool(concepts[x[0]].get("tuple_of_axes")) == want_tuple]
            cands = pref or cands
        ids = sorted({c for c, _, _ in cands})
        if len(ids) > 1:
            return None, "ambiguous: " + ", ".join(ids)
        cid, i, n = cands[0]
        used = set(range(i, i + n))
        return cid, self._quals(toks, used, concepts, concepts[cid]["dims"], eq)

    def _quals(self, toks, used, concepts, dims, eq):
        same_dim_terms = set()
        for c in concepts.values():
            if c["dims"] == dims or (isinstance(dims, tuple) and self._dims_ok(c, dims)):
                same_dim_terms |= {stem(t) for t in c["terms"] if len(tokens(t)) == 1}
        q = set()
        for j, t in enumerate(toks):
            if j in used or t in self.stop or t in same_dim_terms or not any(ch.isalnum() for ch in t):
                continue
            q.add((eq or {}).get(t, t))
        return frozenset(q)

    # --- readings of one product ------------------------------------------------------------------------------
    def readings(self, pid, concepts, eq):
        out, notes = [], []
        for d in self.rec.by_product.get(pid, []):
            phrase, lunit, laxes, lquals, lconds = self.r.split_label(d["property"])
            ptoks = tokens(phrase) + lquals + tokens(d.get("component") or "")
            groups = self.r.groups(d["raw_value"] or "")
            vconds = []
            for g in groups:
                vconds += self.r.conditions(g["suffix"])
            if not groups:
                continue
            for gi, g in enumerate(groups):
                unit = g["unit"] or lunit
                if gi > 0 and unit is None:
                    continue  # a later unitless number (a model number, a count in a note) is not this value
                dims = unit.dims if unit is not None else None
                if g["mixed_units"]:
                    notes.append((d["declaration_id"], "mixed units in one value"))
                    continue
                cid, q = self.recognise(ptoks, concepts, dims=dims, want_tuple=(g["form"] == "tuple"), eq=eq)
                if cid is None and unit is not None:
                    # a category may read a unit symbol differently (for example grams as gram-force)
                    alt = self._reread_unit(ptoks, concepts, unit, g, eq)
                    if alt:
                        cid, q, unit = alt
                if cid is None:
                    if unit is None:
                        c0, q0 = self.recognise(ptoks, concepts, dims=None, eq=eq)
                        if c0:
                            out.append(self._reading(d, c0, q0, "no_unit", [], None, lconds + vconds))
                    continue
                c = concepts[cid]
                if unit is None and c["dims"] != {}:
                    out.append(self._reading(d, cid, q, "no_unit", [], None, lconds + vconds))
                    continue
                vals = [unit.to_coherent(v) if unit is not None else v for v in g["values"]]
                if g["form"] == "tuple":
                    axes = g["axes"] if g["axes"] and all(g["axes"]) else laxes
                    axis_concepts = {cc.get("axis"): i for i, cc in concepts.items() if cc.get("axis")}
                    if axes and len(axes) == len(vals) and len(set(axes)) == len(axes):
                        for a, v in zip(axes, vals):
                            if a in axis_concepts:
                                out.append(self._reading(d, axis_concepts[a], q, "exact", [(v, v)], unit,
                                                         lconds + vconds))
                    else:
                        for a, i2 in axis_concepts.items():
                            out.append(self._reading(d, i2, q, "axes_unlabelled", [], unit, lconds + vconds))
                    continue
                if c.get("tuple_of_axes"):
                    continue
                bound = self.r.bound_of(g)
                if g["form"] == "range":
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
                out.append(self._reading(d, cid, q, form, iv, unit, lconds + vconds))
        return out, notes

    def _reread_unit(self, ptoks, concepts, unit, g, eq):
        for cid, c in concepts.items():
            rd = c.get("unit_readings")
            if not rd:
                continue
            for surface, target in rd.items():
                if self.r.parse_unit_text(surface) is not None and self.r.parse_unit_text(surface).id == unit.id:
                    u2 = self.k.units[target]
                    c2, q2 = self.recognise(ptoks, {cid: c}, dims=u2.dims, eq=eq)
                    if c2:
                        return c2, q2, u2
        return None

    def _reading(self, d, cid, q, form, iv, unit, conds):
        return {"decl": d["declaration_id"], "concept": cid, "qualifiers": q, "form": form, "iv": iv,
                "unit": unit.id if unit is not None else None, "dims": unit.dims if unit is not None else (),
                "scale": getattr(unit, "scale", None),
                "reference": getattr(unit, "reference", None), "conds": conds,
                "variant": d.get("variant_id")}

    # --- requirement target ---------------------------------------------------------------------------------
    def target(self, q, concepts, eq):
        unit = self.r.parse_unit_text(q.get("unit") or "")
        ptoks = tokens(q["property"])
        if unit is None and (q.get("unit") or "").strip():
            ptoks += tokens(q["unit"])  # an unknown unit word names what is counted ('ports', 'keys')
            dims = ()
        else:
            dims = unit.dims if unit is not None else ()
        cid, quals = self.recognise(ptoks, concepts, dims=dims, want_tuple=False, eq=eq)
        if cid is None and unit is not None:
            alt = self._reread_unit(ptoks, concepts, unit, {}, eq)
            if alt:
                cid, quals, unit = alt
        conds = self.r.conditions("at " + q["conditions"]) if q.get("conditions") else []
        return Target(cid, quals, conds, unit), (None if cid else quals)

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
    def _cmp(x, op, L, strict_eps):
        if op == "at_least":
            return x >= L - strict_eps
        if op == "at_most":
            return x <= L + strict_eps
        if op == "more_than":
            return x > L + strict_eps
        return x < L - strict_eps

    def decide(self, rd, op, L):
        eps = 1e-9 * max(1.0, abs(L))
        if rd["form"] in ("no_unit", "axes_unlabelled"):
            return ND, rd["form"]
        if rd["form"] == "upper":
            v = rd["iv"][0][0]
            if op in ("at_most", "less_than") and self._cmp(v, op, L, eps):
                return MEETS, "declared upper bound already satisfies the limit"
            if op in ("at_least", "more_than") and not self._cmp(v, op, L, eps):
                return FAILS, "declared upper bound is below the required minimum"
            return ND, "bound_only"
        if rd["form"] == "lower":
            v = rd["iv"][0][0]
            if op in ("at_least", "more_than") and self._cmp(v, op, L, eps):
                return MEETS, "declared lower bound already satisfies the limit"
            if op in ("at_most", "less_than") and not self._cmp(v, op, L, eps):
                return FAILS, "declared lower bound is above the allowed maximum"
            return ND, "bound_only"
        res = {self._cmp(lo, op, L, eps) and self._cmp(hi, op, L, eps) for lo, hi in rd["iv"]}
        anyfail = any(not self._cmp(lo, op, L, eps) and not self._cmp(hi, op, L, eps) for lo, hi in rd["iv"])
        allok = all(self._cmp(lo, op, L, eps) and self._cmp(hi, op, L, eps) for lo, hi in rd["iv"])
        allfail = all(not self._cmp(lo, op, L, eps) and not self._cmp(hi, op, L, eps) for lo, hi in rd["iv"])
        if allok:
            return MEETS, rd["form"]
        if allfail:
            return FAILS, rd["form"]
        del res, anyfail
        return ND, "range_or_list_straddles"

    def _compatible_scale(self, target_unit, rd):
        if rd["scale"] != "level":
            return True
        tref = getattr(target_unit, "reference", None)
        return tref in (None, "unspecified") or tref == rd["reference"]

    # --- store ---------------------------------------------------------------------------------------------
    def _store(self, q, pids):
        st = Store()
        st.register_kind("requirement", "X1: a buyer's stated requirement (S0 7.4 goals and norms)")
        for pid in pids:
            for d in self.rec.by_product.get(pid, []):
                st.acquire(Item(d["declaration_id"], "record", d, self.rec.provenance(d)))
        rid = f"REQ:{q['id']}"
        st.acquire(Item(rid, "requirement", {k: v for k, v in q.items() if k != "author_note"},
                        {"source": "X1 question set", "holder": "buyer (question author)",
                         "basis": "stated requirement"}))
        st.acquire(Item(f"I:{q['id']}", "inquiry", {"question": rid, "roles": {f"p{n}": p for n, p in enumerate(pids)},
                                                   "conditions": {}, "scope_assumptions": []},
                        {"source": "X1 harness", "holder": "harness", "basis": "definition"}))
        return st, st.get(f"I:{q['id']}")

    def _propose_reading(self, st, inq, rd):
        body = {"form": "interpretation", "bearer": None, "concept": rd["concept"],
                "qualifiers": sorted(rd["qualifiers"]), "value_form": rd["form"], "intervals": rd["iv"],
                "unit": rd["unit"], "conditions": [list(map(str, c)) for c in rd["conds"]], "interprets": rd["decl"]}
        return contract._propose(st, "reading", inq, body, [rd["decl"]], "reading of a declaration (hypothesis)")

    # --- answers ------------------------------------------------------------------------------------------
    def answer(self, q):
        cat = self.k.category_of(q.get("category_words"))
        concepts = self.k.concepts_for(cat)
        eq = self.k.qualifier_equivalents(cat)
        if q["type"] == "limit":
            return self._limit(q, concepts, eq, cat)
        return self._compare(q, concepts, eq, cat)

    def _limit(self, q, concepts, eq, cat):
        pid = q["product_id"]
        st, inq = self._store(q, [pid])
        tgt, unrecognised = self.target(q, concepts, eq)
        base = {"id": q["id"], "category_knowledge": cat["category"]["id"] if cat else None}
        if tgt.concept is None:
            return dict(base, verdict=ND, reason="requirement_not_understood", grounds=[], store_events=st.seq)
        L = tgt.unit.to_coherent(float(q["value"])) if tgt.unit is not None else float(q["value"])
        rds, notes = self.readings(pid, concepts, eq)
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
        incommensurable = [r for r in prod if r["form"] != "no_unit" and r["dims"] != tdims]
        prod = [r for r in prod if r["form"] == "no_unit" or r["dims"] == tdims]
        if not prod:
            return dict(base, verdict=ND, reason="units_incommensurable", grounds=[r["decl"] for r in incommensurable],
                        target=tgt.concept, store_events=st.seq)
        prod2 = [r for r in prod if self._compatible_scale(tgt.unit, r)]
        if not prod2:
            return dict(base, verdict=ND, reason="scale_reference_differs", grounds=[], target=tgt.concept,
                        store_events=st.seq)
        decided = [(r, *self.decide(r, q["comparator"], L)) for r in prod2]
        verdicts = {v for _, v, _ in decided}
        if MEETS in verdicts and FAILS in verdicts:
            verdict, reason = ND, "sources_disagree"
        elif MEETS in verdicts or FAILS in verdicts:
            verdict = MEETS if MEETS in verdicts else FAILS
            undecided = [r for r, v, _ in decided if v == ND and r["form"] not in ("no_unit",)]
            if undecided and any(r["form"] in ("exact", "range", "list", "approx") for r in undecided):
                verdict, reason = ND, "sources_disagree"
            else:
                reason = "; ".join(sorted({why for _, v, why in decided if v == verdict}))
        else:
            verdict, reason = ND, "; ".join(sorted({why for _, _, why in decided}))
        grounds = []
        if verdict != ND:
            used = [r for r, v, _ in decided if v == verdict]
            cids = [self._propose_reading(st, inq, r) for r in used]
            body = {"form": "requirement_verdict", "requirement": f"REQ:{q['id']}", "bearer": pid,
                    "concept": tgt.concept, "verdict": verdict}
            vid = contract._propose(st, "requirement", inq, body, cids, f"requirement check: {verdict}")
            grounds = [r["decl"] for r in used]
            standing = st.get(f"ST:{vid}").body["label"]
            if any(r["form"] == "approx" for r in used):
                standing += "; conditional on the approximation assumption"
        else:
            standing = "no conclusion"
        return dict(base, verdict=verdict, reason=reason, grounds=grounds, target=tgt.concept,
                    qualifiers=sorted(tgt.qualifiers), standing=standing, store_events=st.seq)

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

    def _compare(self, q, concepts, eq, cat):
        p1, p2 = q["p1"], q["p2"]
        st, inq = self._store(q, [p1, p2])
        base = {"id": q["id"], "category_knowledge": cat["category"]["id"] if cat else None}
        ptoks = tokens(q["property"])
        r1, _ = self.readings(p1, concepts, eq)
        r2, _ = self.readings(p2, concepts, eq)
        conds = self.r.conditions("at " + q["conditions"]) if q.get("conditions") else []
        options = []
        for cid in sorted({r["concept"] for r in r1} & {r["concept"] for r in r2}):
            c = concepts[cid]
            dims = () if c["dims"] in ({}, "currency") else tuple(sorted((k, v) for k, v in c["dims"].items() if v))
            if c["dims"] == "currency":
                dims = None
            c2, quals = self.recognise(ptoks, {cid: c}, dims=dims, eq=eq)
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
