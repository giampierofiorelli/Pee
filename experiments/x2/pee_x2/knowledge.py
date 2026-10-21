"""Knowledge loading for X1 arm B (and B0): metrology frame, English lexicon, general quantity concepts and, for B
only, category knowledge. Nothing here names a domain: every unit, word and concept comes from the knowledge files.
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent.parent / "knowledge"


def _load(name):
    with open(HERE / name) as f:
        return json.load(f)


class Unit:
    def __init__(self, d):
        self.id = d["id"]
        self.factor = float(d["factor"])
        self.offset = float(d.get("offset", 0.0))
        self.dims = tuple(sorted((k, v) for k, v in d["dims"].items() if v))
        self.scale = d.get("scale", "ratio")
        self.reference = d.get("reference")

    def to_coherent(self, x):
        return x * self.factor + self.offset


class Quotient:
    """A unit expression A/B (for example 'litres per day')."""

    def __init__(self, a, b):
        self.id = f"{a.id}/{b.id}"
        self.factor = a.factor / b.factor
        self.offset = 0.0
        dims = dict(a.dims)
        for k, v in b.dims:
            dims[k] = dims.get(k, 0) - v
        self.dims = tuple(sorted((k, v) for k, v in dims.items() if v))
        self.scale = "ratio"
        self.reference = None

    def to_coherent(self, x):
        return x * self.factor


class Knowledge:
    def __init__(self, with_categories=True):
        m = _load("metrology.json")
        self.lang = _load("language.json")
        q = _load("quantities.json")
        self.units = {u["id"]: Unit(u) for u in m["units"]}
        self.surfaces = sorted(((s.lower(), u["id"]) for u in m["units"] for s in u["surfaces"]),
                               key=lambda x: -len(x[0]))
        self.prefix_symbols = sorted(m["prefix_symbols"], key=len, reverse=True)
        self.divide_words = m["divide_words"]
        self.tol = m["tolerances"]
        self.concepts = {c["id"]: dict(c, origin="general") for c in q["concepts"]}
        self.categories = {}
        if with_categories:
            for p in sorted((HERE / "categories").glob("*.json")):
                with open(p) as f:
                    c = json.load(f)
                self.categories[c["category"]["id"]] = c

    def category_of(self, words):
        """Category knowledge whose terms name the buyer's words (longest term wins), or None."""
        w = " " + " ".join(tokens(words or "")) + " "
        best = None
        for cid, c in self.categories.items():
            for t in c["category"]["terms"]:
                tt = " " + " ".join(tokens(t)) + " "
                if tt in w and (best is None or len(tt) > best[0]):
                    best = (len(tt), cid)
        return self.categories[best[1]] if best else None

    def concepts_for(self, category):
        out = dict(self.concepts)
        if category:
            for c in category["concepts"]:
                out[c["id"]] = dict(c, origin=category["category"]["id"])
        return out

    def qualifier_equivalents(self, category):
        eq = dict(self.lang["qualifier_equivalents"])
        if category:
            eq.update(category.get("qualifier_equivalents", {}))
        return eq


_TOKEN = re.compile(r"[a-z0-9]+(?:[.'-][a-z0-9]+)*|[%°@<>≤≥~≈/&×*\"$£€]")


def tokens(text):
    return [re.sub(r"'s$|'$", "", t) for t in _TOKEN.findall((text or "").lower().replace("’", "'"))]


def stem(tok):
    """Plural normalisation only (English morphology, no domain content)."""
    if len(tok) > 3 and tok.endswith("ies"):
        return tok[:-3] + "y"
    if len(tok) > 3 and tok.endswith("s") and not tok.endswith(("ss", "us", "is")):
        return tok[:-1]
    return tok
