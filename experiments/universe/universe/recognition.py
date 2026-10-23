"""Recognition of individuals across documents (I-2; S0 D3, 3.6.4, 3.6.5).

Acquisition gives every document its own referents: a designation denotes a referent of the document that uses it.
Whether two referents of different documents are the same thing is a recognition question, answered here as a
proposal with grounds, never as a merge:

* evidence is classed from strongest to weakest as in S0 3.6.5. The only evidence available from table structure is
  the **same designation** (equal identity keys, which never stem or drop "+"), the weakest class. It cannot decide
  identity, so the proposal's verdict is **indeterminate**: each referent is a candidate for the other (partial
  reference, D3);
* a co-reference proposal is used by the rules only when an inquiry adopts it explicitly as an identity reading (an
  assumption with its holder). A conclusion drawn through it is reading-dependent and says so (3.6.4).

The service reads entity items only. It never reads documents and never decides a question.
"""
import hashlib
import json
import re
import weakref

from .standing import label
from .store import Item

SERVICE = "recognition"
PROGRAM = {"holder": "program", "basis": "derived", "source": "recognition service"}


def _h(*parts):
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


def propose_coreference(store):
    """Propose a ``co_reference`` content for each pair of referents of different documents with the same
    designation. Returns the proposal ids."""
    by_key = {}
    for e in store.of("entity"):
        if e.body.get("document") and e.body.get("label") and not e.body.get("whole"):
            by_key.setdefault(e.body["label"], []).append(e)
    out = []
    for key, ents in sorted(by_key.items()):
        docs = {}
        for e in ents:
            docs.setdefault(e.body["document"], e.id)
        ids = sorted(docs.values())
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                body = {"form": "co_reference", "relata": [ids[i], ids[j]], "evidence": "same designation",
                        "evidence_rank": 8, "verdict": "indeterminate",
                        "resolves_with": "a shared identifier (model code, GTIN) or a shared operational anchor"}
                cid = f"CO:{_h(body)}"
                out.append(cid)
                if store.has(cid):
                    continue
                premises = [ids[i], ids[j]]
                ir = Item(f"IR:{SERVICE}:{_h(cid, premises)}", "inference_record",
                          {"service": SERVICE, "inquiry": None, "premises": premises,
                           "summary": "same designation in two documents: weakest recognition evidence (S0 3.6.5)"},
                          PROGRAM)
                store.propose(ir, "recognition")
                store.propose(Item(cid, "content", body, PROGRAM), "co-reference proposal")
                g = [ir.id] + premises
                store.propose(Item(f"ST:{cid}", "standing", {"of": cid, "attitude": "proposed", "holder": "program",
                                                             "grounds": g, "label": label(store, g)},
                                   dict(PROGRAM, source="contract")), "standing of a co-reference proposal")
    return out


def adopt_reading(store, inquiry_id, co_reference, holder, reason):
    """An inquiry's explicit identity reading: the holder assumes, for this inquiry, that the relata of
    ``co_reference`` are one thing. Returns the reading item id (to be listed in the inquiry's
    ``identity_readings``)."""
    rid = f"IRD:{_h(inquiry_id, co_reference)}"
    if not store.has(rid):
        store.acquire(Item(rid, "content", {"form": "identity_reading", "co_reference": co_reference},
                           {"source": reason, "holder": holder, "basis": "assumption"}, {"situation": inquiry_id}),
                      "identity reading adopted for an inquiry")
    return rid


def _stem_words(t):
    out = []
    for w in t.split():
        if len(w) > 4 and w.endswith("ies"):
            w = w[:-3] + "y"
        elif len(w) > 3 and w.endswith("s") and not w.endswith(("ss", "us", "is")):
            w = w[:-1]
        out.append(w)
    return " ".join(out)


# D-2 (F1, D-1 SD9): the index is cached per store object in a weak-keyed mapping, with the store state it was built
# at. A key of ``id(store)`` could be reused by a new store once the old one is freed (Python's ``id()`` is unique only
# during an object's lifetime), and that store would read another universe's index.
_INDEX = weakref.WeakKeyDictionary()


def _index(store):
    """Normalised terms of every concept and kind, cached per store object and state."""
    hit = _INDEX.get(store)
    if hit is not None and hit[0] == store.seq:
        return hit[1]
    from .knowledge_acquisition import _term
    lang = store.get("L:en").body if store.has("L:en") else {}
    stop = set((lang.get("propositions") or {}).get("determiners") or ()) | set(lang.get("stopwords") or ())
    rows = []
    for c in list(store.of("concept")) + list(store.of("quantity_kind")):
        b = c.body
        if b.get("category") in ("evidence class", "lexical frame"):
            continue
        for x in list(b.get("terms") or ()) + [b.get("label") or ""] + [y for y in b.get("symbols") or ()
                                                                         if len(y) >= 2 and y.isalpha()]:
            if not x or len(x) > 120:
                continue
            words = [w for w in _term(x).split() if w not in stop]
            if words:
                rows.append((c.id, " ".join(words), _stem_words(" ".join(words))))
    _INDEX[store] = (store.seq, (rows, stop))
    return rows, stop


def designate(store, term, approximate=True, threshold=0.6):
    """The concepts and kinds a term names (S0 3.6.5: lexical recognition, the weakest evidence). In order:
    exact normalised match; the same words up to plural endings; then, when ``approximate``, the concepts whose
    content words overlap the term's (Jaccard >= ``threshold``) and share its head (last content word). Returns a set
    of item ids; ``designate_with_basis`` also says which kind of match was used."""
    return designate_with_basis(store, term, approximate, threshold)[0]


def _variants(text):
    """T-1 (W5): spellings of one term that keep its identity: hyphens and slashes as spaces ("water-vapour",
    "water vapour"), and "X of Y" as "Y X" ("rate of infiltration", "infiltration rate"). A narrower or broader
    term is never a variant: it names another concept (S0 3.6)."""
    t = re.sub(r"[-/]", " ", text)
    out = {" ".join(t.split())}
    m = re.match(r"^(.+?) of (.+)$", t)
    if m and len(m.group(1).split()) <= 3 and len(m.group(2).split()) <= 3:
        out.add(" ".join((m.group(2) + " " + m.group(1)).split()))
    return out


def designate_with_basis(store, term, approximate=True, threshold=0.6):
    from .knowledge_acquisition import _term
    rows, stop = _index(store)
    words = [w for w in _term(term).split() if w not in stop]
    if not words:
        return set(), None
    t = " ".join(words)
    st = _stem_words(t)
    exact = {i for i, n, _ in rows if n == t}
    if exact:
        return exact, "exact"
    loose = {i for i, _, sn in rows if sn == st}
    if loose:
        return loose, "plural"
    # T-1 (W5): identity-preserving variants of the term and of the held designations
    def content(v):  # the variant's content words, as the index holds them
        return _stem_words(" ".join(w for w in v.split() if w not in stop))
    var = {content(v) for v in _variants(_term(term))}
    same = {i for i, n, sn in rows if {content(v) for v in _variants(n)} & var}
    if same:
        return same, "variant"
    if not approximate:
        return set(), None
    q = set(st.split())
    head = st.split()[-1]
    best, ids = 0.0, set()
    for i, _, sn in rows:
        c = set(sn.split())
        if head not in c or sn.split()[-1] != head and head not in sn.split()[-2:]:
            continue
        j = len(q & c) / len(q | c)
        if j > best + 1e-9:
            best, ids = j, {i}
        elif abs(j - best) < 1e-9:
            ids.add(i)
    return (ids, f"approximate ({best:.2f})") if best >= threshold else (set(), None)


def _identities(store):
    """Pairs of concepts or kinds whose identity is recorded: a co-reference whose verdict is "same", or one an
    adopted identity reading accepts. An indeterminate proposal records no identity (S0 3.6.5)."""
    adopted = {store.get(r.body["co_reference"]).id for r in store.of("content", form="identity_reading")
               if store.has(r.body.get("co_reference") or "")}
    out = []
    for c in store.of("content", form="co_reference"):
        if c.body.get("verdict") == "same" or c.id in adopted:
            out.append(tuple(c.body.get("relata") or ()))
    return out


def readings(store, ids):
    """D-2 (F6, D-1 SD3; S0 3.6 indeterminate reference): the readings of a designation. Each holder's concepts form
    one reading (S0 D2: one holder's term names one concept, ``knowledge_acquisition.concept_for``); general
    knowledge (no holder) is a reading of its own. Readings are joined only where an identity is recorded. Returns a
    list of id sets, one per reading, in a stable order; a designation of one holder has one reading."""
    groups = {}
    for i in ids or ():
        h = store.get(i).body.get("holder") if store.has(i) else None
        groups.setdefault(h or "", set()).add(i)
    parts = [set(v) for _, v in sorted(groups.items())]
    for a, b in _identities(store):
        pa = next((p for p in parts if a in p), None)
        pb = next((p for p in parts if b in p), None)
        if pa is not None and pb is not None and pa is not pb:
            pa |= pb
            parts.remove(pb)
    return parts
