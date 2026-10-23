"""Progressive reading of scientific prose into propositions (A-1; S0 D10, 4.1 Op1/Op6/Op9, 4.2, 4.6, 4.8, 4.10, 5.4-5.6).

Input: the structure ``markdown.read`` produces (headings, blocks, tables with locators). Output: temporary
proposition units in the schema of ``experiments/a1/annotation-guide.md``, and a coverage ledger with one entry per
sentence. Nothing is written to the store here; ``knowledge_acquisition.represent`` turns the units into universe items.

Reading is progressive and keeps context:

* sentences are read in document order under their heading path; a sentence without a subject takes the subject of the
  previous claim (anaphora or coordination ellipsis) or of its heading, and the resolution is recorded;
* a sentence may state several claims (one per relational expression, and one per conjoined object);
* explanation and qualification connectives link a claim to the previous claims.

Every word the reader uses comes from the lexical frame ``L:en`` (``knowledge/language.json``, section
``propositions``): general English for relations, negation, modality, conditions, connectives and attitude. The code
names no domain, no category and no relation concept; relation concepts are found by their designations.

The ledger keeps, per sentence, a locator, the SHA-256 of the sentence and the status: ``acquired`` (every content
word explained by the claims produced), ``partial`` (claims produced; the unexplained words are listed), or
``unresolved`` (no claim, with the reason). It never keeps the sentence.
"""
import hashlib
import re

CITE = re.compile(r"\s*\[([A-Za-z]{1,4}\d{1,4})\]")
WORD = re.compile(r"[A-Za-z][A-Za-z0-9'’\-]*|\d+(?:[.,]\d+)?%?")
ENUM = re.compile(r"(?:^|\s)\(([a-z]|[ivx]{1,4}|\d{1,2})\)\s+")
ABBREV = re.compile(r"\b(e\.g|i\.e|etc|vs|approx|cf|fig|no|al|ca|incl|resp|min|max|esp)\.", re.I)
LABEL = re.compile(r"^([A-Z][A-Za-z0-9 /,'’\-]{0,60}?):\s+(?=\S)")
_AUX_NEG = re.compile(r"\b(is|are|was|were|does|do|did|can|could|may|might|will|would|should|must|need|has|have|had)"
                      r"\s+not\b", re.I)


def _sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def _norm(s):
    t = re.sub(r"[^\w%°/\-'’.]+", " ", (s or "").lower())
    t = re.sub(r"\.(?!\d)", " ", t)  # a full stop ends a word; a decimal point does not
    return " " + " ".join(t.split()) + " "


class Frame:
    """The lexical frame for proposition reading, gathered from ``L:en`` (never from a private list)."""

    def __init__(self, lex):
        P = lex.lang.get("propositions") or {}
        self.P = P
        self.relations = sorted(((_norm(ph), name) for name, phs in (P.get("relations") or {}).items() for ph in phs),
                                key=lambda x: -len(x[0]))
        self.rel_re = [(re.compile(r"(?<![\w\-’'])" + re.escape(ph.strip()) + r"(?![\w\-’'])"), name, ph.strip())
                       for ph, name in self.relations]
        self.any_rel = re.compile(r"(?<![\w\-’'])(?:" + "|".join(re.escape(ph.strip()) for ph, _ in self.relations)
                                  + r")(?![\w\-’'])") if self.relations else None
        self.copular = {"is_a", "has_property", "defined_as"}
        self.inverse = P.get("inverse_relations") or {}
        self.up = [_norm(x) for x in (P.get("change_verbs") or {}).get("up", ())]
        self.down = [_norm(x) for x in (P.get("change_verbs") or {}).get("down", ())]
        self.modal = [(m, _norm(x)) for m, xs in (P.get("modality") or {}).items() for x in xs]
        self.cond = sorted((_norm(x) for x in P.get("condition_markers", ())), key=len, reverse=True)
        self.fwd = [_norm(x) for x in P.get("explanation_forward", ())]
        self.back = [_norm(x) for x in P.get("explanation_backward", ())]
        self.qual = [_norm(x) for x in P.get("qualification", ())]
        self.ana = {x.lower() for x in P.get("anaphora", ())}
        self.det = {x.lower() for x in P.get("determiners", ())}
        self.relpron = {x.lower() for x in P.get("relative_pronouns", ())}
        self.subord = [x.lower() for x in P.get("subordinators", ())]
        self.att = {k: [_norm(x) for x in v] for k, v in (P.get("attitude") or {}).items()}
        self.imper = {x.lower() for x in P.get("norm_imperatives", ())}
        self.report_verbs = {x.lower() for x in P.get("measurement_report_verbs", ())}
        # T-1 (W3): deontic force, fronted conditions, illustrative cases, additive "not only"
        d = P.get("deontic") or {}
        self.obligation = [_norm(x) for x in d.get("obligation", ())]
        self.recommendation = [_norm(x) for x in d.get("recommendation", ())]
        self.prohibition = sorted((x.lower() for x in d.get("prohibition", ())), key=len, reverse=True)
        self.negative_verbs = {x.lower() for x in d.get("negative_verbs", ())}
        self.fronted = sorted((x.lower() for x in P.get("fronted_condition_markers", ())), key=len, reverse=True)
        self.illustrative = [_norm(x) for x in P.get("illustrative_words", ())]
        self.additive_not = [x.lower() for x in P.get("additive_not", ())]
        self.lex = lex
        bm = lex.lang.get("bound_markers") or {}
        self.value_lead = {"of", "is", "are", "was", "were", "=", ":", "equals", "reached", "reaches", "about",
                           "around", "approximately", "~", "≈"} | {w for ws in bm.values() for w in ws} | {
            x.lower() for x in P.get("value_verbs", ())}
        self.stop = set(lex.stop) | self.det | {"be", "been", "being", "was", "were", "is", "are", "do", "does", "did",
                                                "has", "have", "had", "will", "would", "shall", "also", "than", "then",
                                                "there", "here", "into", "onto", "about", "via", "per", "not", "can",
                                                "may", "must", "should", "could", "might", "only", "so", "if", "when",
                                                "but", "yet", "because", "which", "that", "who", "what", "how", "why"}

    @staticmethod
    def has(phrases, text):
        t = _norm(text)
        return next((p for p in phrases if p in t), None)


# --- segmentation ------------------------------------------------------------------------------------------------------

def sentences(text):
    """Sentences of a block, with enumerated items ("(a) …; (b) …") as separate sentences. Citations are kept."""
    t = ABBREV.sub(lambda m: m.group(0).replace(".", "§"), text)
    t = re.sub(r"(\d)\.(\d)", r"\1§\2", t)
    out = []
    for part in re.split(r"(?<=[.!?;])\s+(?=[\[(\"“‘'`A-Z0-9*])", t):  # T-1: also before a quote or code
        pieces = ENUM.split(part)
        for p in pieces[0::2]:  # ENUM.split keeps the enumerator labels at odd positions
            p = p.replace("§", ".").strip(" ;")
            if WORD.search(p):
                out.append(p)
    return out


def _strip_cites(s):
    return CITE.sub("", s).strip(), CITE.findall(s)


def _words(s):
    return [w.lower() for w in WORD.findall(s or "")]


# --- one clause ------------------------------------------------------------------------------------------------------

def _negations(text):
    """The clause without its negation markers, and how many there were. T-1: "not only" / "not just" are additive,
    not negations; a negative determiner ("no X", "there is no X") negates wherever it stands in the clause."""
    t, n = " " + text + " ", 0
    t = re.sub(r"\bnot\s+(only|just)\b", r"\1", t, flags=re.I)
    for pat, rep in ((re.compile(r"\bneed\s+not\b|\bneedn[’']t\b", re.I), " "), (_AUX_NEG, r"\1"), (re.compile(r"\bcannot\b", re.I), "can"),
                     (re.compile(r"\b(\w+)n[’']t\b", re.I), r"\1"),
                     (re.compile(r"\b(?:never|neither|nor|not)\b", re.I), " "), (re.compile(r"\bno\b(?=\s+[A-Za-z])", re.I), " ")):
        t, k = pat.subn(rep, t)
        n += k
    return " ".join(t.split()), n


def _find_relations(frame, text):
    """Relational expressions in a clause (longest first, never overlapping); a match at the very start of the clause
    is a nominal use ("Removing water …") and is kept only as a last resort."""
    t = " " + " ".join(text.lower().split()) + " "
    found, used = [], [False] * len(t)
    if frame.any_rel is None or not frame.any_rel.search(t):
        return t, []
    for rx, name, p in frame.rel_re:
        if p not in t:
            continue
        for m in rx.finditer(t):
            i, j = m.start(), m.end()
            if any(used[i:j]):
                continue
            prev = t[:i].split()[-1:] if t[:i].strip() else []
            if prev and prev[0].strip(",;:") in frame.det and " " not in p.strip():
                continue  # T-1: "the change", "an estimate": a single relational word after a determiner is a noun
            for k in range(i, j):
                used[k] = True
            found.append((i, j, name, p))
    found.sort()
    lead = [f for f in found if not t[:f[0]].strip(" ,;:")]
    rest = [f for f in found if t[:f[0]].strip(" ,;:")]
    return t, rest + lead


MAX_WORDS = 8
MAX_CHARS = 100
_JOINERS = {"and", "or", "of", "to", "in", "on", "for", "by", "with", "as"}


def _concept_phrase(frame, s, side):
    """A concept as a short noun phrase; returns (phrase, words of the span the phrase does not hold)."""
    s = s.strip(" ,:;.-–—\"“”‘’'()")
    s = re.sub(r"^\s*(?:and|or|but|so|then|thus|therefore|hence|also|however|yet|while|whereas|although|though)\b",
               "", s, flags=re.I).strip(" ,")
    ws, left = s.split(), []
    if side == "object":
        for i, w in enumerate(ws):
            if i > 0 and w.lower().strip(",") in frame.relpron:
                left, ws = ws[i:], ws[:i]
                break
    while ws and (ws[0].lower().strip(",") in frame.det | _JOINERS or (side == "subject" and len(ws) > 1 and
                                                                     ws[0].lower() in frame.imper)):
        ws = ws[1:]
    while ws and ws[-1].lower() in frame.det | _JOINERS and not re.fullmatch(r"[A-Z]", ws[-1]):
        ws = ws[:-1]
    # a concept is named by a short phrase, never by a passage: at most MAX_WORDS word tokens
    while len(re.findall(r"\w+", " ".join(ws))) > MAX_WORDS:
        if side == "subject":
            left.insert(0, ws.pop(0))
        else:
            left.append(ws.pop())
    while len(" ".join(ws)) > MAX_CHARS and len(ws) > 1:  # C1 (A-1 change cycle): a short name, in characters too
        if side == "subject":
            left.insert(0, ws.pop(0))
        else:
            left.append(ws.pop())
    return " ".join(ws).strip(" ,;:.\"“”'’"), left


def _split_conditions(frame, s):
    """Separate condition subclauses (if, when, at, below, without …) from a span: (core, conditions)."""
    t = " " + s + " "
    low = t.lower()
    best = None
    for c in frame.cond:
        i = low.find(c)
        if i > 0 and low[:i].split() and (best is None or i < best[0]):
            best = (i, c)
    if best is None:
        return s.strip(), []
    i, c = best
    rest_core, more = _split_conditions(frame, t[i + len(c):].strip())
    return t[:i].strip(), [{"marker": c.strip(), "text": rest_core.strip(" ,;.")}] + more


def _modality(frame, text):
    t = _norm(text)
    return next((m for m, x in frame.modal if x in t), "actual")


KIND_OF = {"increases": "causal", "decreases": "causal", "causes": "causal", "prevents": "causal", "enables": "causal",
           "affects": "causal", "determines": "dependence", "depends_on": "dependence",
           "correlates_with": "association", "is_a": "classification", "part_of": "classification",
           "has_property": "classification", "defined_as": "definition", "measures": "method",
           "establishes": "method", "requires": "norm", "recommends": "norm", "indicates": "method",
           "applies_to": "scope", "exceeds": "comparison", "less_than": "comparison", "equals": "identity",
           "differs_from": "identity", "occurs": "existence", "explains": "explanation", "has_value": "quantitative"}


def _clean_conditions(frame, conds):
    out = []
    for c in conds:
        t = c["text"]
        for _, x in frame.modal:
            t = re.sub(rf"(?<![\w-]){re.escape(x.strip())}(?![\w-])", " ", t, flags=re.I)
        t = re.sub(r"\b(?:does|do|did|is|are|was|were|has|have|had|will|would|shall|be)\s*$", "", " ".join(t.split()))
        t, _ = _concept_phrase(frame, t, "object")  # a condition names a concept: a short phrase too
        if t.strip(" ,;."):
            out.append({"marker": c["marker"], "text": t.strip(" ,;.")})
    return out


def _verb_fallback(frame, t):
    """A verb the lexicon does not know, found by English morphology: the word after an auxiliary ("can V"), or the
    first third-person form ("…s") after at least one word of subject. It becomes the generic relation, and the verb
    is kept with the claim."""
    vf = frame.P.get("verb_fallback") or {}
    aux = {x.lower() for x in vf.get("auxiliaries", ())}
    nv = {x.lower() for x in vf.get("not_verbs", ())} | frame.det | frame.stop
    words = [(m.start(), m.end(), m.group(0)) for m in re.finditer(r"[a-z][a-z\-]+", t)]
    for k, (i, j, w) in enumerate(words):
        if w in aux and k + 1 < len(words) and k > 0:
            m = k + 1
            while m + 1 < len(words) and words[m][2].endswith("ly"):  # "cannot safely drive": the verb is "drive"
                m += 1
            i2, j2, v = words[m]
            if v not in nv and len(v) > 2:
                return (i, j2, "other", v)
    # T-1 (W3, part-of-speech guard): a word ending in "-s" is not taken as a verb. In a verbless (telegraphic) item it
    # is usually a plural noun, and inventing a relation there misreads the whole item. The clause stays unread.
    return None


FREQUENCY_LEAD = re.compile(r"^\s*(?:always|only|first|then|also|next|finally)\s+", re.I)


def _starts_imperative(frame, text):
    """An imperative clause: a directive verb of the lexical frame first, after any leading adverb ("Always …",
    "Then …"), or a prohibition marker. A verb outside the frame is not recognised: the clause stays unread."""
    t = FREQUENCY_LEAD.sub("", text.strip()).lower()
    w = t.split()
    if not w:
        return False
    return w[0].strip(",:") in frame.imper or any(text.strip().lower().startswith(x + " ") for x in frame.prohibition)


def _force(frame, raw, procedural):
    """W2 D6: the force of an imperative from its context. Returns (relation, states, candidates, bearer)."""
    t = _norm(raw)
    first = raw.strip().lower().split()[0] if raw.strip() else ""
    if any(x in t for x in frame.obligation):
        return "requires", {}, None, "procedure" if procedural else None
    if first in ("consider", "prefer") or any(x in t for x in frame.recommendation):
        return "recommends", {}, None, "procedure" if procedural else "user"
    if procedural:  # a step is obligatory only when the procedure prescribes it as necessary (W2 D6)
        return "uncertain", {"relation": "uncertain"}, ["requires", "recommends"], "procedure"
    return "recommends", {}, None, "user"


def _imperative(frame, raw, clean, ctx):
    """One imperative: a prohibition (W2 D5: the controlled form `other: prohibits`, never a negated relation) or a
    norm whose force comes from context (D6). A negative verb ("avoid", "refuse") is the operator, counted once."""
    low = raw.strip().lower()
    neg = next((x for x in frame.prohibition if low.startswith(x + " ")), None)
    action = raw.strip()[len(neg):] if neg else FREQUENCY_LEAD.sub("", raw.strip())
    action = re.sub(r"^\s*(?:do|does|please)\s+", "", action, flags=re.I)
    action, conds = _split_conditions(frame, action)
    phrase, left = _concept_phrase(frame, action, "object")
    procedural = bool(ctx.get("procedural"))
    if neg:
        rel, states, cands, bearer = "other:prohibits", {}, None, "procedure" if procedural else "user"
    else:
        rel, states, cands, bearer = _force(frame, raw, procedural)
    subject, obj = phrase, None
    if bearer == "procedure" and rel in ("requires", "uncertain") and ctx.get("heading"):
        subject, obj = ctx["heading"], phrase  # the procedure requires the step (W2 D6: bearer `procedure`)
    c = {"relation": rel, "subject": subject, "object": obj, "polarity": "affirmed", "modality": _modality(frame, raw),
         "conditions": conds, "left": left, "content_kind": "norm", "spans": [action], "imperative": True,
         "norm_bearer": bearer}
    if states:
        c["states"], c["relation_candidates"] = states, cands
    return c


DEONTIC_DECL = re.compile(r"^(.{2,90}?)\s+(must not|should not|may not|must|should|need to|needs to|has to|have to|"
                          r"is required to|are required to)\s+(?:be\s+)?(.+)$", re.I)


def _report_frame(frame, raw):
    """A reporting frame "<reporter> <reporting verb> (that) <content>": the match (reporter, verb, content), or None."""
    m = re.match(r"^(.{2,60}?)\s+(" + "|".join(sorted((re.escape(x.strip()) for x in frame.att.get("reported", ())
                                                        if x.strip() and len(x.split()) <= 2), key=len, reverse=True))
                 + r")\s+(?:that\s+)?(.+)$", raw, re.I) if frame.att.get("reported") else None
    _prep = r"(?:in|at|on|by|during|from|with|under|for|over|across)\b"
    if m and ((m.group(2).lower().endswith("ed") and re.match(r"^" + _prep, m.group(3), re.I)) or
              re.match(r"^\w+ed\s+" + _prep, m.group(3), re.I)):
        m = None  # T-1: "reports observed in one clinic": a participle in a reduced relative, not a reporting frame
    return m


# --- D-2: the condition contract (F5, F10) ---------------------------------------------------------------------------
# A condition is a concept and its value (S0 4.6, T7): "the soil is saturated" -> soil: saturated; "at 1 atm" -> the
# kind the unit's dimension names: 1 atm; "from 18 February 2027" -> point in time: from 2027-02-18. A clause that
# cannot be decomposed stays a condition with its text and marker; it is never dropped.

def _temporal_markers(frame):
    return (frame.P.get("temporal") or {}).get("markers") or {}


def _date_iso(frame, text):
    """The ISO form of a calendar date written alone ("2027-02-18", "18 February 2027", "February 18, 2027")."""
    months = list((frame.P.get("temporal") or {}).get("months") or ())
    t = " ".join(str(text or "").lower().replace(",", " ").split()).strip(" .;")
    g = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", t)
    if g:
        y, mo, d = int(g[1]), int(g[2]), int(g[3])
    else:
        g = re.fullmatch(r"(\d{1,2}) ([a-z]+) (\d{4})", t) or re.fullmatch(r"([a-z]+) (\d{1,2}) (\d{4})", t)
        if not g:
            return None
        d, mname = (g[1], g[2]) if g[1].isdigit() else (g[2], g[1])
        if mname not in months:
            return None
        y, mo, d = int(g[3]), months.index(mname) + 1, int(d)
    import datetime
    try:
        return datetime.date(y, mo, d).isoformat()
    except ValueError:
        return None


def _date_re(frame):
    months = "|".join((frame.P.get("temporal") or {}).get("months") or ()) or "-"
    return (r"(?:\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:" + months + r")\s+\d{4}|(?:" + months +
            r")\s+\d{1,2},?\s+\d{4})")


def _temporal(frame, clause):
    """Dated bounds of a clause ("from 18 February 2027"): the clause without them, and their conditions."""
    mk = _temporal_markers(frame)
    if not mk:
        return clause, []
    alt = "|".join(re.escape(x) for x in sorted(mk, key=len, reverse=True))
    rx = re.compile(r"(?<![\w-])(" + alt + r")\s+(" + _date_re(frame) + r")(?![\w-])", re.I)
    conds = []
    for m in rx.finditer(clause):
        iso = _date_iso(frame, m.group(2))
        if iso:
            conds.append({"marker": m.group(1).lower(), "text": iso, "span": m.group(0)})
    if not conds:
        return clause, []
    rest = rx.sub(" ", clause)
    rest = re.sub(r"^[\s,;:]+", "", " ".join(rest.split()))
    return (rest[:1].upper() + rest[1:]) if rest else rest, conds


def _time_kind_term(frame):
    """The term of the kind that is a point in time (a frame quantity of dimension T), from knowledge."""
    from s1core import units
    hits = [kb for kb in frame.lex.kinds.values() if kb.get("determinable") == "frame" and not kb.get("document")
            and units.same_dims(units.pad(kb["dims"]), units.dim(T=1)) and kb.get("terms")]
    return hits[0]["terms"][0] if len(hits) == 1 else None


def _quantity_condition(frame, text):
    """A condition that is a value with a unit ("1 atm") names the general kind of the unit's dimension."""
    from s1core import units
    from .acquisition import parse_values
    t = " ".join(str(text or "").split()).strip(" ,;.")
    vals = parse_values(t, frame.lex)
    if len(vals) != 1 or not vals[0].get("unit") or len(t[:vals[0]["start"]].strip()) or len(t[vals[0]["end"]:].strip()):
        return None
    try:
        ud = units.dims_of(vals[0]["unit"])
    except (KeyError, ValueError):
        return None
    hits = [kb for kb in frame.lex.kinds.values() if kb.get("determinable") == "dimension" and not kb.get("document")
            and kb.get("terms") and units.same_dims(units.pad(kb["dims"]), ud)]
    if len(hits) != 1:
        return None
    return {"concept": hits[0]["terms"][0], "value": t.lower()}


def _state_condition(frame, text):
    """A condition stating a property of a concept ("soil is saturated") is that concept with that value."""
    phs = sorted({ph.strip() for ph, name in frame.relations if name == "has_property" and len(ph.split()) == 1},
                 key=len, reverse=True)
    if not phs:
        return None
    m = re.match(r"^(.{2,80}?)\s+(?:" + "|".join(re.escape(x) for x in phs) + r")\s+(?!not\b)(.{2,60})$", text, re.I)
    if not m:
        return None
    x, _ = _concept_phrase(frame, m.group(1), "subject")
    v = " ".join(w for w in m.group(2).split() if w.lower() not in frame.det).strip(" ,;.")
    if not x or not v or len(v.split()) > 3:
        return None
    return {"concept": x, "value": v.lower()}


def condition_units(frame, conds):
    """D-2 (F5, F10): reader conditions as the units' {concept, value}."""
    out = []
    tk = _time_kind_term(frame)
    mk = _temporal_markers(frame)
    for x in conds or ():
        if x.get("marker", "").lower() in mk and tk:
            iso = _date_iso(frame, x.get("text"))
            if iso:
                out.append({"concept": tk, "value": f"{mk[x['marker'].lower()]} {iso}"})
                continue
        q = _quantity_condition(frame, x.get("text"))
        if q:
            out.append(q)
            continue
        for y in _clean_conditions(frame, [x]):
            if y.get("text"):
                out.append(_state_condition(frame, y["text"]) or {"concept": y["text"], "value": y["marker"]})
    return out


def read_clause(frame, clause, ctx):
    """Claims stated by one clause. ``ctx`` holds the previous subject and the heading subject."""
    raw = clause
    m = LABEL.match(raw)
    if m and len(m.group(1).split()) <= 6:
        raw = raw[m.end():]
    # T-1: a fronted subordinate clause ("If X, …", "For Y, …") is a condition of the main clause; its own words,
    # negations included, stay in the condition and never act on the main clause
    if frame.fronted:
        fm = re.match(r"^\s*(" + "|".join(re.escape(x) for x in frame.fronted) + r")\s+(.{2,160}?),\s+(.+)$", raw,
                      re.I)
        if fm and WORD.search(fm.group(3)):
            main = read_clause(frame, fm.group(3), ctx)
            for c in main:
                if not c.get("unresolved"):
                    c["conditions"] = [{"marker": fm.group(1).lower(), "text": fm.group(2).strip()}] + list(
                        c.get("conditions") or [])
                    c.setdefault("spans", []).append(fm.group(2))
            return main
    # T-1: coordinated imperatives each carry their own polarity ("Explain X, collect Y, do not invent Z")
    if _starts_imperative(frame, raw):
        alt = "|".join(re.escape(x) for x in sorted(frame.imper | set(frame.prohibition), key=len, reverse=True))
        parts = re.split(r",\s+(?:and\s+)?(?=(?:" + alt + r")\b)", raw, flags=re.I)
        if len(parts) > 1 and all(_starts_imperative(frame, x) for x in parts):
            return [c for x in parts for c in read_clause(frame, x, ctx)]
    # contrast: "X is A, not B" / "X does A rather than B": the same relation, the other polarity, for B
    m = re.search(r",\s*(?:but\s+)?not\s+|\s+rather than\s+|\s+instead of\s+", raw, re.I)
    if m and m.start() > 0:
        main = read_clause(frame, raw[:m.start()], ctx)
        obj, left = _concept_phrase(frame, _split_conditions(frame, raw[m.end():])[0], "object")
        extra = []
        for c in main:
            if c.get("unresolved") or not obj or c.get("content_kind") == "norm":
                continue
            d = dict(c, object=obj, polarity="affirmed" if c["polarity"] == "negated" else "negated",
                     left=left, spans=[raw[m.end():]], contrast=True)
            extra.append(d)
        return main + extra
    # a reporting frame ("WHO guidance shows that X …"): the reporter is recorded and X is read
    m = _report_frame(frame, raw)
    if m and _find_relations(frame, _negations(m.group(3))[0])[1]:
        claims = read_clause(frame, m.group(3), ctx)
        for c in claims:
            if not c.get("unresolved"):
                c["reported_by"] = _concept_phrase(frame, m.group(1), "subject")[0]
                c.setdefault("spans", []).append(m.group(1))
                c["phrase"] = (c.get("phrase") or "") + " " + m.group(2)
        return claims
    clean, nneg = _negations(raw)
    words = clean.lower().split()
    first = words[0].strip(",:") if words else ""
    # an imperative sentence states a norm; the action is the subject (S0 D18)
    if _starts_imperative(frame, raw):
        return [_imperative(frame, raw, clean, ctx)]
    # T-1: a deontic modal in a declarative clause states a norm on its subject (W2 D4-D5)
    dm = DEONTIC_DECL.match(raw.strip())
    if dm and not re.search(r"\b(?:can|could)\b", dm.group(1), re.I):
        subj, _ = _concept_phrase(frame, dm.group(1), "subject")
        core, conds = _split_conditions(frame, dm.group(3))
        obj, left = _concept_phrase(frame, core, "object")
        mod = dm.group(2).lower()
        rel = "other:prohibits" if mod.endswith("not") else "recommends" if mod == "should" else "requires"
        sw = subj.lower().split()
        resolution = None
        if not subj or (sw[0] in frame.ana and len(sw) <= 2):
            src = ctx.get("previous") or ctx.get("heading")
            if not src:
                return [{"unresolved": "subject not found (an anaphor without a referent)"}]
            resolution = {"anaphor": subj or "(none)", "resolved_to": src,
                          "how": "previous claim" if ctx.get("previous") else "heading"}
            subj = src
        if subj and obj:
            return [{"relation": rel, "subject": subj, "object": obj, "polarity": "affirmed",
                     "modality": _modality(frame, raw), "conditions": conds, "left": left, "content_kind": "norm",
                     "spans": [dm.group(1), core], "resolution": resolution, "phrase": dm.group(2)}]
    # T-1: "there is (no) X": the existence of X, with the clause's polarity
    em = re.match(r"^\s*there\s+(?:is|are|was|were|exists?)\s+(.+)$", clean, re.I)
    if em:
        core, conds = _split_conditions(frame, em.group(1))
        x, left = _concept_phrase(frame, core, "subject")
        if x:
            return [{"relation": "occurs", "subject": x, "object": None,
                     "polarity": "negated" if nneg % 2 else "affirmed", "modality": _modality(frame, raw),
                     "conditions": conds, "left": left, "content_kind": "existence", "spans": [core]}]
    # change verbs: "Y rises as X falls"
    ch = "|".join(re.escape(x.strip()) for x in frame.up + frame.down)
    m = re.search(rf"^(.*?)\b({ch})\s+(?:as|when|while)\s+(.*?)\b({ch})\b(.*)$", clean, re.I) if ch else None
    if m:
        sy = 1 if _norm(m.group(2)) in frame.up else -1
        sx = 1 if _norm(m.group(4)) in frame.up else -1
        xs, _ = _concept_phrase(frame, m.group(3), "subject")
        ys, left = _concept_phrase(frame, m.group(1), "subject")
        core, conds = _split_conditions(frame, m.group(5))
        return [{"relation": "increases" if sy * sx > 0 else "decreases", "subject": xs, "object": ys,
                 "polarity": "negated" if nneg % 2 else "affirmed", "modality": _modality(frame, clean),
                 "conditions": conds, "left": left + core.split(), "content_kind": "causal",
                 "spans": [m.group(1), m.group(3)], "phrase": m.group(2) + " " + m.group(4)}]
    t, rels = _find_relations(frame, clean)
    if not rels:
        verb = _verb_fallback(frame, t)
        if not verb:
            return []
        rels = [verb]
    # the main relation: the first expression; a more specific one replaces a copula only when it stands before any
    # subordinate clause (a relative clause or a condition belongs to a concept, not to the main claim)
    first = rels[0]
    bound = len(t)
    for x in sorted(frame.subord, key=len, reverse=True) + [c.strip() for c in frame.cond]:
        k = t.find(" " + x + " ", first[1])
        if k >= 0:
            bound = min(bound, k)
    specific = [r for r in rels if r[2] not in frame.copular and r[0] < bound]
    i, j, name0, ph = specific[0] if specific and first[2] in frame.copular else first
    name = frame.inverse.get(name0, name0)
    swap = name0 in frame.inverse
    subj_text, obj_text = t[:i], t[j:]
    subj_core, sconds = _split_conditions(frame, subj_text)
    obj_core, oconds = _split_conditions(frame, obj_text)
    sconds, oconds = _clean_conditions(frame, sconds), _clean_conditions(frame, oconds)
    mod = _modality(frame, subj_text + " " + ph)
    for _, x in frame.modal:  # modal words never belong to a concept
        subj_core = re.sub(rf"(?<![\w-]){re.escape(x.strip())}(?![\w-])", " ", subj_core)
    subj_core = re.sub(r"\b(?:does|do|did|is|are|was|were|has|have|had|will|would|shall|be)\s*$", "", subj_core.strip())
    subject, sleft = _concept_phrase(frame, subj_core, "subject")
    if name == "establishes":
        obj_core = re.sub(r"^\s*that\b", "", obj_core)
    objects = [obj_core]
    parts = [p for p in re.split(r",\s*|\s+and\s+|\s+or\s+", obj_core) if p.strip()]
    if len(parts) > 1 and all(len(p.split()) <= 4 for p in parts):
        objects = parts  # conjoined objects: one claim each
    resolution = None
    sw = subject.lower().split()
    if not subject or (sw[0] in frame.ana and len(sw) <= 2):
        source = "previous claim" if ctx.get("previous") else "heading" if ctx.get("heading") else None
        if source is None:
            return [{"unresolved": "subject not found (an anaphor without a referent)"}]
        resolution = {"anaphor": subject or "(none)", "resolved_to": ctx.get("previous") or ctx["heading"],
                      "how": source}
        subject = resolution["resolved_to"]
    polarity = "negated" if nneg % 2 else "affirmed"
    # a nominalised effect whose standing is the claim ("the effect of X on Y is not established"): affects(X, Y)
    en = "|".join(re.escape(x) for x in frame.P.get("effect_nouns", ()))
    m = re.match(rf"^(?:{en})\s+of\s+(.+?)\s+on\s+(.+)$", subject, re.I) if en else None
    if m and (not obj_core.strip() or name in ("establishes", "has_property", "is_a")):
        x, _ = _concept_phrase(frame, m.group(1), "subject")
        y, _ = _concept_phrase(frame, m.group(2), "object")
        return [{"relation": "affects", "subject": x, "object": y, "polarity": "affirmed", "modality": mod,
                 "conditions": sconds + oconds, "left": sleft, "content_kind": "causal",
                 "spans": [subj_core, obj_core], "resolution": resolution, "phrase": ph,
                 "standing_claim": {"relation": name, "polarity": polarity}}]
    claims = []
    for o in objects:
        pol = polarity
        if re.match(r"^\s*(?:but|rather)\b", o, re.I):  # "not A, but B": B has the other polarity
            o = re.sub(r"^\s*(?:but|rather)\s+", "", o, flags=re.I)
            if nneg:  # T-1: "but" flips polarity only after a negation; alone it is a contrast, not a negation
                pol = "affirmed" if polarity == "negated" else "negated"
        obj, oleft = _concept_phrase(frame, o, "object")
        s, ob = (obj, subject) if swap else (subject, obj)
        claims.append({"relation": name if name != "other" else f"other:{ph}", "subject": s, "object": ob or None,
                       "polarity": pol, "modality": mod,
                       "conditions": sconds + oconds, "left": sleft + oleft, "content_kind": KIND_OF.get(name, "other"),
                       "spans": [subj_core, o], "resolution": resolution, "phrase": ph})
    return claims


def read_values(frame, clause):
    """Quantitative claims (S0 4.7): "<quantity> of / is / below <value> <unit>". A value introduced by a condition
    marker ("at 30 °C", "during …") is a condition of another claim, not a claim of its own."""
    from .acquisition import parse_values
    out = []
    vals = parse_values(clause, frame.lex)
    for k, v in enumerate(vals):
        before = clause[:v["start"]]
        lead = before.rstrip().split()[-1].lower().strip("(,:") if before.strip() else ""
        lead2 = " ".join(before.rstrip().split()[-2:]).lower()
        if lead in {"at", "during", "under", "when", "if", "after", "before", "for", "with", "within", "and", "or",
                    "to", "from", "x", "×", "by", "per"} or not (lead in frame.value_lead or lead2 in frame.value_lead):
            continue
        if re.search(r"\bCI\s*$|\(\s*$", before[-12:]) or (k and vals[k - 1]["unit"] == "%" and
                                                            vals[k - 1]["numbers"][0][0] == 95.0):
            continue  # a confidence interval is read with the value it qualifies
        stem = re.split(r"[;,(]|\b(?:is|are|was|were|of|equals|reached|reaches)\b(?![\w-])", before, flags=re.I)
        cand = [x for x in stem if x.strip()]
        phrase = ""
        if cand:
            words = before.split()
            # the quantity is the phrase just before the lead word(s)
            leads = sorted(frame.value_lead, key=len, reverse=True)
            core = before.strip()
            for _ in range(3):
                core = re.sub(r"(?:" + "|".join(re.escape(x) for x in leads) + r")\s*$", "", core, flags=re.I).strip()
            core = re.split(r"[;:(]|,\s", core)[-1]
            phrase, _ = _concept_phrase(frame, core, "subject")
        if not phrase:
            continue
        nums = v["numbers"]
        if v["form"] == "range" and len(nums) == 2:
            val = {"lo": nums[0][0], "hi": nums[1][0], "unit": v["unit"]}  # the MS1 interval keys
        else:
            val = {"number": nums[0][0], "unit": v["unit"]}
            if v.get("bound") in ("upper", "lower"):
                val["bound"] = v["bound"]
        for ci in vals[k + 1:k + 3]:
            if ci["form"] == "range" and re.search(r"\bCI\b", clause[v["end"]:ci["start"]]) and \
                    len(clause[v["end"]:ci["start"]]) < 20:
                val["ci95"] = [ci["numbers"][0][0], ci["numbers"][1][0]]
                break
        # D-2 (F5, D-1 SD8b): the condition that follows the value ("100 °C at 1 atm") is the value's condition,
        # up to the next value or clause boundary
        def _cond_lead(w):  # a value introduced by a condition marker belongs to the condition
            b = " " + " ".join(clause[:w["start"]].lower().split()[-3:]) + " "
            return any(b.endswith(" " + c.strip() + " ") for c in frame.cond)
        nxt = next((w["start"] for w in vals[k + 1:] if w["start"] > v["end"] and not _cond_lead(w)), len(clause))
        tail = re.split(r"[;,]|\s+and\s+|\s+but\s+", clause[v["end"]:nxt])[0]
        conds = _split_conditions(frame, "value " + tail.strip())[1] if tail.strip() else []
        out.append({"relation": "has_value", "subject": phrase, "object": None, "value": val,
                    "polarity": "affirmed", "modality": "actual", "conditions": conds, "left": [],
                    "content_kind": "quantitative", "spans": [core if cand else "", clause[v["start"]:v["end"]]]})
    return out


def _clauses(frame, sentence):
    """Clauses of a sentence: split at a clause separator only when the next part holds a relational expression."""
    seps = [re.escape(x) for x in frame.P.get("clause_separators", ()) if x.strip() != ";"]
    if len(sentence.split(";")) > 1:  # a semicolon always separates clauses
        return [c for part in sentence.split(";") for c in _clauses(frame, part)]
    if not seps:
        return [sentence]
    parts = re.split("(" + "|".join(seps) + ")", sentence)
    out, cur = [], parts[0]
    for k in range(1, len(parts), 2):
        sep, nxt = parts[k], parts[k + 1] if k + 1 < len(parts) else ""
        if _find_relations(frame, _negations(nxt)[0])[1]:
            out.append(cur)
            cur = (sep.strip(" ,;") + " " + nxt).strip()
        else:
            cur = cur + sep + nxt
    out.append(cur)
    return [c for c in out if c.strip()]


# --- the document ------------------------------------------------------------------------------------------------------

def _heading_subject(frame, text):
    t = re.sub(r"^\s*(?:[A-Z]?\d+(?:\.\d+)*|[A-Z]\d*)[.)]?\s+", "", text or "")
    t = re.sub(r"\(.*?\)", "", t).split(":")[0].split("—")[0].split(" - ")[0]
    phrase, _ = _concept_phrase(frame, t, "subject")
    return phrase if 0 < len(phrase.split()) <= 6 else None


def _attitude(frame, heading_text, sentence):
    a = "proposed" if frame.has(frame.att.get("proposed", ()), heading_text) else "asserted"
    s = _norm(sentence)
    if any(x in s for x in frame.att.get("hypothesised", ())):
        a = "hypothesised"
    if any(x in s for x in frame.att.get("questioned", ())):
        a = "questioned"
    if a == "asserted" and any(x in s for x in frame.att.get("reported", ())):
        a = "reported"
    return a


def _evidence_kind(frame, attitude, sentence, cites):
    if attitude == "proposed":
        return "proposal"
    if attitude == "hypothesised":
        return "hypothesis"
    if cites and set(_words(sentence)) & frame.report_verbs and re.search(r"\d", sentence):
        return "original_measurement"
    return "synthesis"


def _reporter_evidence(frame, reporter):
    """C3 (A-1 change cycle): a claim reported from a named source has that source's kind of evidence when the
    reporter's own words name an evidence class (guidance, a standard, a regulation, a review)."""
    if not reporter:
        return None
    words = set(_words(reporter))
    hits = [cid for cid, terms in frame.lex.evidence_classes.items()
            if any(set(t.lower().split()) <= words for t in terms)]
    return hits[0] if len(hits) == 1 else None


def _segments(doc):
    heads = {h["index"]: h for h in doc.get("headings", ())}
    for b in doc.get("blocks", ()):
        if b.get("kind") not in ("math", "code"):  # T-1: code is notation, not prose
            kind = "ordered item" if b.get("ordered") else b.get("kind")
            yield (b.get("locator") or f"block {b['index']}", [heads[i]["text"] for i in b.get("sectionPath", ())
                                                               if i in heads], b["text"], kind)
    for t in doc.get("tables", ()):
        rows = {}
        for c in t["cells"]:
            rows.setdefault(c["row"], []).append(c)
        for r, cells in sorted(rows.items()):
            cells = sorted(cells, key=lambda c: c["col"])
            if r == 0 and cells and cells[0].get("header"):
                continue
            lead = cells[0]["text"] if cells else ""
            for c in cells[1:]:
                if len(c["text"].split()) >= 4:  # a prose cell; short cells are values read by acquisition
                    yield c.get("locator"), list(t.get("headingPath") or ()) + [lead], c["text"], "table cell"


def _cell_value(frame, text, header):
    """D-2 (F9): the value a table cell states, when the cell is one value (its unit in the cell or in the column
    header's parentheses); else None."""
    from .acquisition import parse_values
    t = " ".join(str(text or "").split())
    vals = parse_values(t, frame.lex)
    if not vals or len(vals) != 1 or t[:vals[0]["start"]].strip() or t[vals[0]["end"]:].strip(" ."):
        return None
    v = vals[0]
    if not v.get("unit"):
        hu = re.findall(r"\(([^)]{1,15})\)", header or "")
        if hu:
            w = parse_values(t + " " + hu[-1].strip(), frame.lex)
            if len(w) == 1 and w[0].get("unit"):
                v = w[0]
    nums = v["numbers"]
    if v["form"] == "range" and len(nums) == 2:
        return {"lo": nums[0][0], "hi": nums[1][0], "unit": v["unit"]}
    if v["form"] not in ("single",):
        return None
    out = {"number": nums[0][0], "unit": v["unit"]}
    if v.get("bound") in ("upper", "lower"):
        out["bound"] = v["bound"]
    return out


def read_tables(frame, doc, n0=0):
    """D-2 (F9, D-1 SD7; owner decision 4): the values of property/value tables as ``has_value`` units. A table whose
    value column the header names as values ("Property | Value") gives each row's quantity its value; a table whose
    columns are quantities gives each value under its row entity, as a condition (never a merged entity). Every row
    is accounted for in the ledger: acquired, read as prose, or not assimilated with its reason."""
    vh = {_norm(x) for x in (frame.P.get("value_headers") or {}).get("terms", ())}
    units, ledger, n = [], [], n0
    for ti, t in enumerate(doc.get("tables", ())):
        rows = {}
        for c in t["cells"]:
            rows.setdefault(c["row"], []).append(c)
        head = sorted(rows.get(0, []), key=lambda c: c["col"])
        header = {c["col"]: c["text"] for c in head} if head and head[0].get("header") else {}
        hp = list(t.get("headingPath") or ())
        illustrative = bool(frame.has(frame.illustrative, hp[-1] if hp else ""))
        proposed = bool(frame.has(frame.att.get("proposed", ()), " ".join(hp)))
        for r, cells in sorted(rows.items()):
            if header and r == 0:
                continue
            cells = sorted(cells, key=lambda c: c["col"])
            lead = " ".join((cells[0]["text"] if cells else "").split()).strip(" *_")
            row_text = " | ".join(c["text"] for c in cells)
            entry = {"locator": f"table {ti + 1} row {r}", "sha256": _sha(row_text), "words": len(_words(row_text)),
                     "kind": "table row"}
            produced, reasons = [], []
            for c in cells[1:]:
                h = header.get(c["col"], "")
                val = _cell_value(frame, c["text"], h)
                if val is None:
                    reasons.append("a prose cell, read as sentences" if len(c["text"].split()) >= 4 else
                                   "a cell that states no single value")
                    continue
                hq = re.sub(r"\([^)]*\)", " ", h).strip()
                if not lead:
                    reasons.append("a value without a row label")
                    continue
                if not hq or _norm(hq) in vh:  # a property/value table: the row names the quantity
                    subject, conds = _concept_phrase(frame, lead, "subject")[0], []
                else:  # a matrix: the column names the quantity, the row the entity it is stated of
                    kind_of_row = re.sub(r"\([^)]*\)", " ", header.get(cells[0]["col"], "")).strip()
                    if not kind_of_row:
                        reasons.append("a row entity whose kind no header names")
                        continue
                    subject = _concept_phrase(frame, hq, "subject")[0]
                    conds = [{"concept": _concept_phrase(frame, kind_of_row, "subject")[0], "value": lead.lower()}]
                if not subject:
                    reasons.append("no quantity named")
                    continue
                n += 1
                u = {"type": "proposition", "id": f"T{n:05d}", "content_kind": "quantitative", "relation": "has_value",
                     "subject": subject, "object": None, "value": val, "polarity": "affirmed", "modality": "actual",
                     "generality": "generic", "conditions": conds,
                     "document_attitude": "proposed" if proposed else "asserted", "evidence_kind": "synthesis",
                     "attributed_to": [], "cited_sources": [], "depends_on": [], "explains": [], "qualifies": None,
                     "record": {"text": row_text, "locator": c.get("locator") or entry["locator"], "section": hp}}
                if illustrative:
                    u["statement_status"] = "illustrative_example"
                units.append(u)
                produced.append(u["id"])
            entry["claims"] = produced
            if produced and not [x for x in reasons if not x.startswith("a prose cell")]:
                entry["status"] = "acquired"
            elif produced:
                entry["status"] = "partial"
            elif reasons and all(x.startswith("a prose cell") for x in reasons):
                entry["status"] = "read as prose"
            else:
                entry["status"] = "not assimilated"
            if reasons:
                entry["reasons"] = sorted(set(reasons))
            ledger.append(entry)
    return units, ledger


def read_propositions(doc, lex):
    """Proposition units and the coverage ledger of one document (reading only; nothing is written)."""
    frame = Frame(lex)
    units, ledger, n = [], [], 0
    for locator, hp, text, kind in _segments(doc):
        hsub = _heading_subject(frame, hp[-1]) if hp else None
        heading_text = " ".join(hp)
        # a block that opens with a proposal label ("PROPOSED evaluation …:") is a proposal throughout
        if frame.has(frame.att.get("proposed", ()), " ".join(text.split()[:3])):
            heading_text += " proposed"
        # T-1 (W3): a proposal marker governs the procedural content under it, not every declarative sentence
        block_proposed = bool(frame.has(frame.att.get("proposed", ()), heading_text))
        label = LABEL.match(text)
        illustrative = bool(frame.has(frame.illustrative, (hp[-1] if hp else "") + " " +
                                      (label.group(1) if label else "")))
        procedural = block_proposed or kind == "ordered item"
        block_units, block_cites = [], []
        prev, prev_ids = None, []
        for si, sent in enumerate(sentences(text)):
            body, cites = _strip_cites(sent)
            if not WORD.search(body):
                block_cites += cites  # T-1: a citation block closing the paragraph cites for its claims
                continue
            entry = {"locator": f"{locator} sentence {si + 1}", "sha256": _sha(body), "words": len(_words(body)),
                     "kind": kind}
            att = _attitude(frame, heading_text, body)
            own_att = _attitude(frame, "", body)
            unknown = any(x in _norm(body) for x in frame.att.get("unknown", ()))
            link_back = frame.has(frame.back, body[:40])
            link_qual = frame.has(frame.qual, body[:30])
            fwd = frame.has(frame.fwd, body)
            clauses = _clauses(frame, body)
            if fwd and len(clauses) == 1:  # "A because B": B explains A
                k = _norm(body).find(fwd)
                if k > 1:
                    clauses = [body[:k - 1], body[k - 1 + len(fwd):]]
            produced, explained = [], set()
            for ci, cl in enumerate(clauses):
                ctx = {"previous": prev, "procedural": procedural,
                       "heading": hsub if kind in ("list item", "ordered item", "table cell") or ci == 0 else None}
                # D-2 (F10): dated bounds are conditions of every claim of the clause
                cl, tconds = _temporal(frame, cl)
                # D-2 (F7, D-1 SD5): a value reported by a named source ("the manufacturer states a battery life of
                # 20 hours") is read inside the reporting frame and keeps its reporter
                rf = _report_frame(frame, cl)
                vals = read_values(frame, rf.group(3)) if rf else read_values(frame, cl)
                if rf:
                    for v in vals:
                        v["reported_by"] = _concept_phrase(frame, rf.group(1), "subject")[0]
                        v.setdefault("spans", []).append(rf.group(1))
                        v["phrase"] = rf.group(2)
                found = read_clause(frame, cl, ctx)
                # D-2 (F5): a copular claim whose object is the value just read is that value, not a second claim
                vsubj = {v["subject"] for v in vals}
                found = [c for c in found if not (c.get("relation") == "has_property" and c.get("subject") in vsubj
                                                  and re.match(r"^\s*[\d.,]+", c.get("object") or ""))]
                for c in found + vals:
                    if tconds and not c.get("unresolved"):
                        c["conditions"] = list(c.get("conditions") or []) + [dict(t) for t in tconds]
                for c in found + vals:
                    if c.get("unresolved"):
                        entry.setdefault("reasons", []).append(c["unresolved"])
                        continue
                    if not c.get("subject") or (c["relation"] not in ("occurs", "recommends", "has_value")
                                                and not c.get("imperative") and not c.get("object")):
                        entry.setdefault("reasons", []).append("a side of the relation not found")
                        continue
                    n += 1
                    uid = f"U{n:05d}"
                    # T-1 (W3): attitude per proposition. Under a proposal marker only procedural content (norms) is
                    # proposed; a declarative keeps its own attitude. An imperative step of an unmarked procedure is
                    # neither proposed nor asserted: its attitude is uncertain (W4), never asserted.
                    if block_proposed and c["content_kind"] != "norm":
                        c_att = own_att
                    elif c.get("imperative") and kind == "ordered item" and not block_proposed and att == "asserted":
                        c_att = "uncertain"
                        c.setdefault("states", {})["attitude"] = "uncertain"
                    else:
                        c_att = att
                    reported = c.get("reported_by") and c_att == "asserted"
                    ev_kind = _reporter_evidence(frame, c.get("reported_by")) or _evidence_kind(frame, c_att, body, cites)
                    u = {"type": "proposition", "id": uid,
                         "content_kind": "unknown" if unknown and c["content_kind"] != "norm" else c["content_kind"],
                         "relation": c["relation"], "subject": c["subject"], "object": c.get("object"),
                         "value": c.get("value"),
                         "polarity": c["polarity"], "modality": c["modality"],
                         "generality": "generic" if c["modality"] in ("actual", "typical") else "ceteris_paribus",
                         "conditions": condition_units(frame, c.get("conditions", ())),
                         "document_attitude": "reported" if reported else c_att,
                         "evidence_kind": ev_kind,
                         # T-1: citing is not attributing. A cited identifier is a bibliographic link; the claim is
                         # the source's only when a reporter is named or a measured result is reported from it
                         "attributed_to": (cites if ev_kind == "original_measurement" else []) +
                         ([c["reported_by"]] if c.get("reported_by") else []),
                         "cited_sources": list(cites),
                         "depends_on": [], "explains": [], "qualifies": None,
                         "resolution": c.get("resolution"),
                         "record": {"text": body, "locator": entry["locator"], "section": list(hp)}}
                    for k in ("norm_bearer", "states", "relation_candidates"):
                        if c.get(k):
                            u[k] = c[k]
                    if illustrative:
                        u["statement_status"] = "illustrative_example"
                    if u["relation"] == "uncertain":
                        u["relation"] = "other"
                    block_units.append(u)
                    if c.get("resolution") and prev_ids:
                        u["depends_on"] = [prev_ids[-1]]
                    if ci == 1 and fwd and len(clauses) == 2 and produced:
                        u["explains"] = [produced[0]["id"]]
                    if ci == 0 and link_back and prev_ids:  # "therefore B": the previous claims explain B
                        for x in units:
                            if x["id"] in prev_ids[-2:]:
                                x["explains"] = sorted(set(x["explains"]) | {uid})
                    if ci == 0 and link_qual and prev_ids:
                        u["qualifies"] = prev_ids[-1]
                    units.append(u)
                    produced.append(u)
                    for span in c.get("spans", ()):
                        explained |= set(_words(span))
                    explained |= set(_words(c.get("phrase") or ""))
                    for x in c.get("conditions", ()):
                        explained |= set(_words(x.get("text"))) | set(_words(x.get("marker"))) | \
                            set(_words(x.get("span")))
                    explained -= {w.lower() for w in c.get("left", ())}
                    prev = c["subject"]
            content = [w for w in _words(body) if w not in frame.stop and not w[0].isdigit()]
            left = [w for w in content if w not in explained]
            entry["claims"] = [u["id"] for u in produced]
            if not produced:
                entry["status"] = "unresolved"
                entry.setdefault("reasons", []).append("no relational expression recognised")
            elif len(left) > max(1, 0.25 * len(content)):
                # C2 (A-1 change cycle): the unexplained words as a set, never in the document's order
                entry["status"], entry["unexplained"] = "partial", sorted(set(left))
            else:
                entry["status"] = "acquired"
            prev_ids += [u["id"] for u in produced]
            ledger.append(entry)
        for u in block_units:  # the closing citation block of the paragraph: cited context of each claim
            u["cited_sources"] = sorted(set(u.get("cited_sources") or ()) | set(block_cites))
    tu, tl = read_tables(frame, doc)
    return {"units": units + tu, "ledger": ledger + tl}


__all__ = ["read_propositions", "sentences", "Frame", "KIND_OF"]
