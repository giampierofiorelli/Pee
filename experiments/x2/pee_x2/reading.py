"""X2 reader: declaration labels, values and buyers' requirements into structured quantity mentions.

Everything lexical (units, markers, separators, axis words, stopwords, multipliers) comes from the knowledge files.
The reader proposes structure; it never assumes a missing unit, never fills a missing condition and never resolves an
ambiguity by default. X2 principle P1 (closed reading): every part of a value is accounted for; words that are not are
returned as residual qualifiers and unknown symbols as blocking residue, never dropped.
"""
import re

from .knowledge import Quotient, stem, tokens

NUM = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)(?![\d])")
ALLOWED_PUNCT = set(",.:;-–—()[]/*&'\"!?|")


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
    t = re.sub(r"(?<=\d)\s*([x×])\s*(?=\d)", r" \1 ", t)    # 463x612 -> 463 x 612
    return t


class Reader:
    def __init__(self, k):
        self.k = k
        L = k.lang
        self.upper = sorted(L["upper_bound_markers"], key=len, reverse=True)
        self.lower = sorted(L["lower_bound_markers"], key=len, reverse=True)
        self.approx = sorted(L["approximate_markers"], key=len, reverse=True)
        self.tolerance = sorted(L["tolerance_markers"], key=len, reverse=True)
        self.cond_markers = sorted(L["condition_markers"], key=len, reverse=True)
        self.range_seps = L["range_separators"]
        self.list_seps = L["list_separators"]
        self.tuple_seps = L["tuple_separators"]
        self.between = L["between_words"]
        self.axis_words = L["axis_words"]
        self.stop = set(L["stopwords"])
        self.article_dividers = set(L["article_dividers"])
        self.multipliers = L["multipliers"]
        self.structure_words = (set(self.range_seps) | set(self.list_seps) | set(self.tuple_seps) | set(self.between)
                                | {w for m in self.upper + self.lower + self.approx for w in m.split()})

    # --- units --------------------------------------------------------------------------------------------
    def unit_at(self, text, i):
        """Longest unit atom starting at text[i] (after up to one space). Returns (unit, end, surface) or None."""
        j = i + 1 if i < len(text) and text[i] == " " else i
        low = text.lower()
        cands = [(s, uid, True) for s, uid in self.k.cs_surfaces] + [(s, uid, False) for s, uid in self.k.surfaces]
        for s, uid, cs in sorted(cands, key=lambda x: (-len(x[0]), not x[2])):
            hit = text.startswith(s, j) if cs else low.startswith(s, j)
            if not hit:
                continue
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
            num, after = float(m.group(1)), m.end()
            mm = re.match(r"\s*(" + "|".join(map(re.escape, self.multipliers)) + r")\b", text[after:].lower()) \
                if self.multipliers else None
            if mm:  # '50 million' is one number
                num *= self.multipliers[mm.group(1)]
                after += mm.end()
            unit, end, surface = None, after, None
            r = self.unit_expr_at(text, after)
            start = m.start()
            if r:
                unit, end, surface = r
            else:
                p = self.prefix_unit(text, m.start())
                if p:
                    unit, start = p
            out.append({"num": num, "unit": unit, "surface": surface, "start": start, "num_start": m.start(),
                        "end": end})
        return out

    def _gap_kind(self, gap):
        g = gap.strip().lower()
        axis = None
        mm = re.match(r"^\(\s*([a-z])\s*\)\s*(.*)$", g)
        if mm:
            axis, g = mm.group(1), mm.group(2).strip()
        if g in self.tolerance:
            return "tolerance", axis
        if g in self.tuple_seps:
            return "tuple", axis
        if g in self.range_seps:
            return "range", axis
        if g in self.list_seps:
            return "list", axis
        return None, axis

    def groups(self, text):
        """Value groups plus the character spans that the structure explains (for the closed reading)."""
        text = normalise(text)
        ms = self.mentions(text)
        groups, explained, i = [], [], 0
        while i < len(ms):
            g = [ms[i]]
            kind, axes = "single", []
            while i + 1 < len(ms):
                k, ax = self._gap_kind(text[g[-1]["end"]:ms[i + 1]["start"]])
                if k is None or (kind != "single" and k != kind):
                    break
                if k in ("range", "tolerance") and len(g) > 1:
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
                close = text.find(")", end)
                explained.append((text[:g[0]["start"]].rstrip().rfind("("), close + 1 if close >= 0 else end))
                continue  # a parenthesised quantity after a value restates it in other units; it is not a new value
            units = [x["unit"] for x in g if x["unit"] is not None]
            unit = units[-1] if units else None
            mixed = len({u.id for u in units}) > 1 and kind != "tolerance"
            explained.append((g[0]["start"], end))
            groups.append({"form": kind, "values": [x["num"] for x in g], "unit": None if mixed else unit,
                           "units": [x["unit"] for x in g], "mixed_units": mixed,
                           "axes": [self.axis_words.get(a) if a else None for a in axes] if kind == "tuple" else None,
                           "start": g[0]["start"], "end": end, "prefix": text[:g[0]["start"]], "suffix": text[end:]})
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
        for gr in groups:
            if gr["form"] == "list" and len(gr["values"]) == 2 and any(
                    gr["prefix"].lower().rstrip().endswith(b) for b in self.between):
                gr["form"] = "range"
        return groups, explained, text

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
    def _cond_pattern(self):
        return r"(?:(?<=\s)|^|(?<=\())(" + "|".join(re.escape(m) for m in self.cond_markers) + r")(?=\s|\d|$)"

    def conditions(self, text):
        """Conditions stated in a text after condition markers: numeric (by dimension) and verbal."""
        t = normalise(text or "")
        low = t.lower()
        idx = [(m.start(1), m.end(1)) for m in re.finditer(self._cond_pattern(), low)]
        out = []
        for n, (s, e) in enumerate(idx):
            seg = t[e: idx[n + 1][0] if n + 1 < len(idx) else len(t)]
            for part in re.split(r"\band\b|,|;", seg):
                ms = [m for m in self.mentions(part) if m["unit"] is not None]
                if ms:
                    for m in ms:
                        out.append(("num", m["unit"].dims, m["unit"].reference, m["unit"].to_coherent(m["num"])))
                else:
                    words = frozenset(stem(w) for w in tokens(part) if w not in self.stop and not w.isdigit())
                    if words:
                        out.append(("text", low[s:e].strip(), words))
        return out

    def residue(self, text, explained, main):
        """P1 closed reading. Words of the value that no structure explains (residual qualifiers) and symbols that
        nothing explains (blocking). Condition phrases after the main group are explained as conditions."""
        mask = [False] * len(text)
        for a, b in explained:
            for k in range(max(0, a), min(len(text), b)):
                mask[k] = True
        if main is not None:
            m = re.search(self._cond_pattern(), text[main["end"]:].lower())
            if m:
                for k in range(main["end"] + m.start(), len(text)):
                    mask[k] = True
            for markers in (self.approx, self.upper, self.lower):
                hit = self._ends_with(main["prefix"][-30:], markers)
                if hit:
                    a = len(main["prefix"].lower().rstrip(" :\t")) - len(hit)
                    for k in range(max(0, a), main["start"]):
                        mask[k] = True
                    break
        rest = "".join(" " if mask[k] else ch for k, ch in enumerate(text))
        words, symbols = set(), []
        for t in tokens(rest):
            if not any(ch.isalpha() for ch in t):
                continue
            if any(ch.isdigit() for ch in t) or t in self.stop or t in self.structure_words:
                continue
            words.add(stem(t))
        for ch in rest:
            if not (ch.isalnum() or ch.isspace() or ch in ALLOWED_PUNCT or ch in "%°$£€@<>≤≥~≈×+"):
                symbols.append(ch)
        return words, symbols

    def split_label(self, label):
        """Label -> (phrase, label unit, axes, verbal qualifiers from brackets, conditions, unit words in the label)."""
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
        m = re.search(r"(?:(?<=\s)|^)(" + "|".join(re.escape(m) for m in self.cond_markers) + r")(?=\s|\d|$)", low)
        if m and m.start() > 0:
            conds += self.conditions(body[m.start():])
            body = body[:m.start()]
        # P4: a unit named as a word of the label ('Bar Pressure') may state the unit of a unitless value
        unit_words = []
        for w in re.findall(r"[A-Za-z][A-Za-z()]+", body):
            u = self.parse_unit_text(w)
            if u is not None and len(w) >= 2:
                unit_words.append((w.lower(), u))
        return body.strip(), unit, axes, quals, conds, unit_words
