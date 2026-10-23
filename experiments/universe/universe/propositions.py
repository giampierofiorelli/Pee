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
    for part in re.split(r"(?<=[.!?;])\s+(?=[\[(\"“‘A-Z0-9*])", t):
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
    """The clause without its negation markers, and how many there were."""
    t, n = " " + text + " ", 0
    for pat, rep in ((re.compile(r"\bneed\s+not\b|\bneedn[’']t\b", re.I), " "), (_AUX_NEG, r"\1"), (re.compile(r"\bcannot\b", re.I), "can"),
                     (re.compile(r"\b(\w+)n[’']t\b", re.I), r"\1"),
                     (re.compile(r"\b(?:never|neither|nor|not)\b", re.I), " "), (re.compile(r"^\s*no\b", re.I), " ")):
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
            for k in range(i, j):
                used[k] = True
            found.append((i, j, name, p))
    found.sort()
    lead = [f for f in found if not t[:f[0]].strip(" ,;:")]
    rest = [f for f in found if t[:f[0]].strip(" ,;:")]
    return t, rest + lead


MAX_WORDS = 8
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
            i2, j2, v = words[k + 1]
            if v not in nv and len(v) > 2:
                return (i, j2, "other", v)
    for k, (i, j, w) in enumerate(words[1:9], start=1):
        if len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is", "ous")) and w not in nv \
                and k + 1 < len(words):
            return (i, j, "other", w)
    return None


def read_clause(frame, clause, ctx):
    """Claims stated by one clause. ``ctx`` holds the previous subject and the heading subject."""
    raw = clause
    m = LABEL.match(raw)
    if m and len(m.group(1).split()) <= 6:
        raw = raw[m.end():]
    # contrast: "X is A, not B" / "X does A rather than B": the same relation, the other polarity, for B
    m = re.search(r",\s*(?:but\s+)?not\s+|\s+rather than\s+|\s+instead of\s+", raw, re.I)
    if m and m.start() > 0:
        main = read_clause(frame, raw[:m.start()], ctx)
        obj, left = _concept_phrase(frame, _split_conditions(frame, raw[m.end():])[0], "object")
        extra = []
        for c in main:
            if c.get("unresolved") or not obj or c.get("relation") == "recommends":
                continue
            d = dict(c, object=obj, polarity="affirmed" if c["polarity"] == "negated" else "negated",
                     left=left, spans=[raw[m.end():]], contrast=True)
            extra.append(d)
        return main + extra
    # a reporting frame ("WHO guidance shows that X …"): the reporter is recorded and X is read
    m = re.match(r"^(.{2,60}?)\s+(" + "|".join(sorted((re.escape(x.strip()) for x in frame.att.get("reported", ())
                                                        if x.strip() and len(x.split()) <= 2), key=len, reverse=True))
                 + r")\s+(?:that\s+)?(.+)$", raw, re.I) if frame.att.get("reported") else None
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
    if first in frame.imper or re.match(r"^\s*(?:do not|don't|never|avoid)\b", raw, re.I):
        action, conds = _split_conditions(frame, clean)
        action = re.sub(r"^\s*(?:do|does|please)\s+", "", action, flags=re.I)  # "do not X": the action is X
        phrase, left = _concept_phrase(frame, action, "object")
        neg = bool(re.match(r"^\s*(?:do not|don't|never|avoid|refuse)\b", raw, re.I))
        return [{"relation": "recommends", "subject": phrase, "object": None,
                 "polarity": "negated" if neg else "affirmed", "modality": "necessary", "conditions": conds,
                 "left": left, "content_kind": "norm", "spans": [action]}]
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
        out.append({"relation": "has_value", "subject": phrase, "object": None, "value": val,
                    "polarity": "affirmed", "modality": "actual", "conditions": [], "left": [],
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


def _segments(doc):
    heads = {h["index"]: h for h in doc.get("headings", ())}
    for b in doc.get("blocks", ()):
        if b.get("kind") != "math":
            yield (b.get("locator") or f"block {b['index']}", [heads[i]["text"] for i in b.get("sectionPath", ())
                                                               if i in heads], b["text"], b.get("kind"))
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
        prev, prev_ids = None, []
        for si, sent in enumerate(sentences(text)):
            body, cites = _strip_cites(sent)
            if not WORD.search(body):
                continue
            entry = {"locator": f"{locator} sentence {si + 1}", "sha256": _sha(body), "words": len(_words(body)),
                     "kind": kind}
            att = _attitude(frame, heading_text, body)
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
                ctx = {"previous": prev, "heading": hsub if kind in ("list item", "table cell") or ci == 0 else None}
                for c in read_clause(frame, cl, ctx) + read_values(frame, cl):
                    if c.get("unresolved"):
                        entry.setdefault("reasons", []).append(c["unresolved"])
                        continue
                    if not c.get("subject") or (c["relation"] not in ("occurs", "recommends", "has_value")
                                                and not c.get("object")):
                        entry.setdefault("reasons", []).append("a side of the relation not found")
                        continue
                    n += 1
                    uid = f"U{n:05d}"
                    u = {"type": "proposition", "id": uid,
                         "content_kind": "unknown" if unknown and c["content_kind"] != "norm" else c["content_kind"],
                         "relation": c["relation"], "subject": c["subject"], "object": c.get("object"),
                         "value": c.get("value"),
                         "polarity": c["polarity"], "modality": c["modality"],
                         "generality": "generic" if c["modality"] in ("actual", "typical") else "ceteris_paribus",
                         "conditions": [{"concept": x["text"], "value": x["marker"]}
                                        for x in _clean_conditions(frame, c.get("conditions", ())) if x.get("text")],
                         "document_attitude": "reported" if c.get("reported_by") and att == "asserted" else att, "evidence_kind": _evidence_kind(frame, att, body, cites),
                         "attributed_to": cites + ([c["reported_by"]] if c.get("reported_by") else []),
                         "depends_on": [], "explains": [], "qualifies": None,
                         "resolution": c.get("resolution"),
                         "record": {"text": body, "locator": entry["locator"], "section": list(hp)}}
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
                        explained |= set(_words(x.get("text"))) | set(_words(x.get("marker")))
                    explained -= {w.lower() for w in c.get("left", ())}
                    prev = c["subject"]
            content = [w for w in _words(body) if w not in frame.stop and not w[0].isdigit()]
            left = [w for w in content if w not in explained]
            entry["claims"] = [u["id"] for u in produced]
            if not produced:
                entry["status"] = "unresolved"
                entry.setdefault("reasons", []).append("no relational expression recognised")
            elif len(left) > max(1, 0.25 * len(content)):
                entry["status"], entry["unexplained"] = "partial", left
            else:
                entry["status"] = "acquired"
            prev_ids += [u["id"] for u in produced]
            ledger.append(entry)
    return {"units": units, "ledger": ledger}


__all__ = ["read_propositions", "sentences", "Frame", "KIND_OF"]
