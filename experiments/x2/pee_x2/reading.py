"""Reading of declaration labels and values, and of buyers' requirements, into structured quantity mentions.

Everything lexical (units, markers, separators, axis words, stopwords) comes from the knowledge files. The reader
proposes structure; it never assumes a missing unit, never fills a missing condition and never resolves an
ambiguity by default.
"""
import re

from .knowledge import Quotient, stem, tokens

NUM = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)(?![\d])")


def _brackets(t):
    """Top-level bracketed spans (start, end) with nesting respected: '[dB(A)]' is one span."""
    out, depth, start = [], 0, None
    for i, ch in enumerate(t):
        if ch in "([":
            if depth == 0:
                start = i
            depth += 1
        elif ch in ")]" and depth:
            depth -= 1
            if depth == 0:
                out.append((start, i))
    return out


def normalise(text):
    t = (text or "").replace(" ", " ").replace(" ", " ").replace(" ", " ")
    t = re.sub(r"(?<=\d),(?=\d{3}(?!\d))", "", t)          # 1,500 -> 1500
    t = re.sub(r"(?<=\d),(?=\d{1,2}(?!\d))", ".", t)        # 1,5 -> 1.5
    t = re.sub(r"(?<=\d)\s*([x×])\s*(?=\d)", r" \1 ", t)       # 463x612 -> 463 x 612
    return t


class Reader:
    def __init__(self, k):
        self.k = k
        L = k.lang
        self.upper = sorted(L["upper_bound_markers"], key=len, reverse=True)
        self.lower = sorted(L["lower_bound_markers"], key=len, reverse=True)
        self.approx = sorted(L["approximate_markers"], key=len, reverse=True)
        self.cond_markers = sorted(L["condition_markers"], key=len, reverse=True)
        self.range_seps = L["range_separators"]
        self.list_seps = L["list_separators"]
        self.tuple_seps = L["tuple_separators"]
        self.between = L["between_words"]
        self.axis_words = L["axis_words"]
        self.stop = set(L["stopwords"])
        self.article_dividers = set(L["article_dividers"])

    # --- units --------------------------------------------------------------------------------------------
    def unit_at(self, text, i):
        """Longest unit atom starting at text[i] (after up to one space). Returns (unit, end, surface) or None."""
        j = i + 1 if i < len(text) and text[i] == " " else i
        low = text.lower()
        for s, uid in self.k.surfaces:
            if low.startswith(s, j):
                end = j + len(s)
                if s[-1].isalnum() and end < len(text) and text[end].isalnum():
                    continue
                if s[0].isalpha() and j > 0 and text[j - 1].isalpha():
                    continue
                return self.k.units[uid], end, s
        return None

    def unit_expr_at(self, text, i):
        a = self.unit_at(text, i)
        if not a:
            return None
        u, end, s = a
        rest = text[end:].lower()
        m = re.match(r"\s*(" + "|".join(re.escape(w) for w in self.k.divide_words) + r")(?=[\s\d/a-z°%])\s*", rest)
        if m:
            b = self.unit_at(text, end + m.end())
            # an article read as a divider ('12 litres a day') only before a unit of time
            if b and not (m.group(1) in self.article_dividers and b[0].dims != (("T", 1),)):
                return Quotient(u, b[0]), b[1], s + "/" + b[2]
        return u, end, s

    def parse_unit_text(self, text):
        """A whole string that is a unit expression, or None."""
        t = normalise(text).strip()
        while len(t) > 1 and t[0] + t[-1] in ("()", "[]"):
            t = t[1:-1].strip()
        if not t:
            return None
        r = self.unit_expr_at(t, 0)
        if r and t[r[1]:].strip() == "":
            return r[0]
        return None

    def prefix_unit(self, text, i):
        before = text[:i].rstrip().lower()
        for sym in self.k.prefix_symbols:
            if before.endswith(sym):
                for s, uid in self.k.surfaces:
                    if s == sym:
                        return self.k.units[uid], len(before) - len(sym)
        return None

    # --- mentions and groups ------------------------------------------------------------------------------
    def mentions(self, text):
        out = []
        for m in NUM.finditer(text):
            unit, end, surface = None, m.end(), None
            r = self.unit_expr_at(text, m.end())
            start = m.start()
            if r:
                unit, end, surface = r
            else:
                p = self.prefix_unit(text, m.start())
                if p:
                    unit, start = p
            out.append({"num": float(m.group(1)), "unit": unit, "surface": surface, "start": start,
                        "num_start": m.start(), "end": end})
        return out

    def _gap_kind(self, gap):
        g = gap.strip().lower()
        axis = None
        mm = re.match(r"^\(\s*([a-z])\s*\)\s*(.*)$", g)
        if mm:
            axis, g = mm.group(1), mm.group(2).strip()
        if g in self.tuple_seps:
            return "tuple", axis
        if g in self.range_seps:
            return "range", axis
        if g in self.list_seps:
            return "list", axis
        return None, axis

    def groups(self, text):
        text = normalise(text)
        ms = self.mentions(text)
        groups, i = [], 0
        while i < len(ms):
            g = [ms[i]]
            kind, axes = "single", []
            while i + 1 < len(ms):
                k, ax = self._gap_kind(text[g[-1]["end"]:ms[i + 1]["start"]])
                if k is None or (kind != "single" and k != kind):
                    break
                if k == "range" and len(g) > 1:
                    break
                axes.append(ax)
                kind = k
                g.append(ms[i + 1])
                i += 1
            i += 1
            end = g[-1]["end"]
            trailing_axis = None
            m_ax = re.match(r"^\s*\(\s*([a-z])\s*\)", text[end:].lower())
            if m_ax:
                trailing_axis = m_ax.group(1)
                end += m_ax.end()
            if kind == "tuple":
                axes = axes + [trailing_axis]
            m_ax2 = re.match(r"^\s*\(?\s*([a-z])\s*[x×*]\s*([a-z])\s*(?:[x×*]\s*([a-z]))?\s*\)?", text[end:].lower())
            if kind == "tuple" and m_ax2 and all(a in self.axis_words for a in m_ax2.groups() if a):
                axes = [a for a in m_ax2.groups() if a]
                end += m_ax2.end()
            if text[:g[0]["start"]].rstrip().endswith("(") and groups:
                continue  # a parenthesised quantity after a value restates it in other units; it is not a new value
            units = [x["unit"] for x in g if x["unit"] is not None]
            unit = units[-1] if units else None
            mixed = len({u.id for u in units}) > 1
            prefix = text[:g[0]["start"]]
            if kind == "range" and groups == [] and any(prefix.lower().rstrip().endswith(b) for b in self.between):
                pass
            groups.append({"form": kind, "values": [x["num"] for x in g], "unit": None if mixed else unit,
                           "units": [x["unit"] for x in g], "mixed_units": mixed,
                           "axes": [self.axis_words.get(a) if a else None for a in axes] if kind == "tuple" else None,
                           "start": g[0]["start"], "end": end, "prefix": prefix, "suffix": text[end:]})
        # a compound quantity ('2 lb 3 oz', '1 h 30 min'): consecutive single quantities of one dimension, joined
        # by nothing but space or a full stop, with a smaller unit after a larger one, are one sum
        merged = []
        for gr in groups:
            prev = merged[-1] if merged else None
            if (prev and prev["form"] == "single" and gr["form"] == "single" and prev["unit"] is not None
                    and gr["unit"] is not None and prev["unit"].dims == gr["unit"].dims
                    and getattr(prev["unit"], "scale", "ratio") == "ratio" and prev["unit"].factor > gr["unit"].factor
                    and re.fullmatch(r"[\s.]*", text[prev["end"]:gr["start"]])):
                total = prev["unit"].to_coherent(prev["values"][0]) + gr["unit"].to_coherent(gr["values"][0])
                prev["values"] = [total / prev["unit"].factor]
                prev["end"], prev["suffix"] = gr["end"], gr["suffix"]
                continue
            merged.append(gr)
        groups = merged
        # 'between X and Y': a list joined by 'and' after 'between' is a range
        for gr in groups:
            if gr["form"] == "list" and len(gr["values"]) == 2 and any(
                    gr["prefix"].lower().rstrip().endswith(b) for b in self.between):
                gr["form"] = "range"
        return groups

    # --- markers ------------------------------------------------------------------------------------------
    def _ends_with(self, text, markers):
        t = text.lower().rstrip(" :\t")
        for m in markers:
            if t.endswith(m) and (len(t) == len(m) or not t[-len(m) - 1].isalnum() or not m[0].isalnum()):
                return m
        return None

    def _starts_with(self, text, markers):
        t = text.lower().lstrip(" .:\t")
        for m in markers:
            if t.startswith(m) and (len(t) == len(m) or not t[len(m)].isalnum() or not m[-1].isalnum()):
                return m
        return None

    def bound_of(self, group):
        """'upper', 'lower', 'approx' or None, from markers just before or just after the group."""
        p = group["prefix"][-30:]
        if self._ends_with(p, self.approx):
            return "approx"
        if self._ends_with(p, self.upper):
            return "upper"
        if self._ends_with(p, self.lower):
            return "lower"
        s = group["suffix"][:25]
        if self._starts_with(s, ["or less", "or lower", "max", "max."]):
            return "upper"
        if self._starts_with(s, ["or more", "or higher", "+", "min", "min."]):
            return "lower"
        return None

    # --- conditions -------------------------------------------------------------------------------------
    def conditions(self, text):
        """Conditions stated in a text after condition markers: numeric (by dimension) and verbal."""
        t = normalise(text or "")
        low = t.lower()
        pat = r"(?:(?<=\s)|^|(?<=\())(" + "|".join(re.escape(m) for m in self.cond_markers) + r")(?=\s|\d|$)"
        idx = [(m.start(1), m.end(1)) for m in re.finditer(pat, low)]
        out = []
        for n, (s, e) in enumerate(idx):
            seg = t[e: idx[n + 1][0] if n + 1 < len(idx) else len(t)]
            for part in re.split(r"\band\b|,|;", seg):
                ms = [m for m in self.mentions(part) if m["unit"] is not None]
                if ms:
                    for m in ms:
                        out.append(("num", m["unit"].dims, m["unit"].reference,
                                    m["unit"].to_coherent(m["num"])))
                else:
                    words = frozenset(stem(w) for w in tokens(part) if w not in self.stop and not w.isdigit())
                    if words:
                        out.append(("text", low[s:e].strip(), words))
        return out

    def split_label(self, label):
        """Label -> (phrase, label unit, axes, verbal qualifiers from brackets, conditions)."""
        t = normalise(label or "")
        unit, axes, quals, conds = None, None, [], []
        spans = _brackets(t)
        for br in [t[a + 1:b] for a, b in spans]:
            u = self.parse_unit_text(br)
            mx = re.fullmatch(r"\s*([a-z])\s*[x×*/]\s*([a-z])\s*(?:[x×*/]\s*([a-z]))?\s*", br.lower()) or \
                re.fullmatch(r"\s*([a-z])([a-z])([a-z])?\s*", br.lower())
            ma = re.match(r"\s*([a-z])\s*[x×*/]\s*([a-z])\s*(?:[x×*/]\s*([a-z]))?\s*(?:\b(\S+)\s+(.+))?$", br.lower())
            if u is not None:
                unit = u
            elif mx and all(a in self.axis_words for a in mx.groups() if a):
                axes = [self.axis_words[a] for a in mx.groups() if a]
            elif ma and all(a in self.axis_words for a in ma.groups()[:3] if a) and ma.group(5) and \
                    self.parse_unit_text(ma.group(5)) is not None:
                # axes followed by '<word> <unit>' ('W x H x D in mm'): both the axis order and the unit are stated
                axes = [self.axis_words[a] for a in ma.groups()[:3] if a]
                unit = self.parse_unit_text(ma.group(5))
            else:
                c = self.conditions(br)
                if c and self._starts_with(br, self.cond_markers):
                    conds += c
                else:
                    quals += tokens(br)
        body = t
        for a, b in reversed(spans):
            body = body[:a] + " " + body[b + 1:]
        if unit is None and self.parse_unit_text(body) is not None:
            unit = self.parse_unit_text(body)  # a label that is itself a unit name ('RPM') states the unit
        low = body.lower()
        pat = r"(?:(?<=\s)|^)(" + "|".join(re.escape(m) for m in self.cond_markers) + r")(?=\s|\d|$)"
        m = re.search(pat, low)
        if m and m.start() > 0:
            conds += self.conditions(body[m.start():])
            body = body[:m.start()]
        return body.strip(), unit, axes, quals, conds
