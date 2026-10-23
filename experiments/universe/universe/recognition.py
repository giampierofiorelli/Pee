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
