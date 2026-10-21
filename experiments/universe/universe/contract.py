"""The inference contract and needs-driven cooperation between services (plan section 5; S0 5.7, 5.9, C4).

``inquire(store, inquiry_id)`` answers the inquiry's question. Services never call each other and keep no state:
each reads the shared store and returns material, and this module records it. Every conclusion becomes:

* a proposed item, with basis 'derived', situated in the inquiry;
* an inference record (an occurrent recorded as a ground, 5.7);
* a Standing item: attitude 'proposed', holder 'program', grounds, and a label that is never stronger than the
  weakest premise.

Cooperation runs in both directions through items only. The rule service supplies entity-level premises that the
model service needs. The model service's proposals become premises of the rule service's classifications.
"""
import hashlib
import json
from dataclasses import dataclass, field

from . import model, rules
from .store import Item, thaw

PROGRAM = {"holder": "program", "basis": "derived"}
_RANK = ["definition", "published reference", "measurement record", "manufacturer statement", "document statement",
         "assumption", "hypothesis", "illustrative"]  # later = weaker


@dataclass
class Answer:
    inquiry: str
    question: dict
    question_status: str = "well-formed"
    presuppositions: list = field(default_factory=list)
    status: str = None      # quantity questions
    interval: tuple = None  # (lo, hi, unit)
    verdict: str = None     # class questions
    value: str = None       # attribute questions
    needs: list = field(default_factory=list)
    reasons: list = field(default_factory=list)
    caveats: list = field(default_factory=list)
    services: list = field(default_factory=list)
    proposals: list = field(default_factory=list)
    grounds: list = field(default_factory=list)
    standing: str = None


def _digest(*parts):
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()[:16]


def premise_bases(store, grounds, seen=None):
    """Bases of every non-derived premise reachable from ``grounds`` through standings and inference records."""
    seen = set() if seen is None else seen
    out = []
    for g in grounds:
        if g in seen or not store.has(g):
            continue
        seen.add(g)
        it = store.get(g)
        if it.kind == "inference_record":
            out += premise_bases(store, it.body["premises"], seen)
        elif it.provenance["basis"] == "derived":
            st = f"ST:{g}"
            if store.has(st):
                out += premise_bases(store, store.get(st).body["grounds"], seen)
        else:
            out.append(it.provenance["basis"])
    return out


def label(store, grounds):
    bases = premise_bases(store, grounds)
    if not bases:
        return "no recorded premises"
    weakest = max(bases, key=_RANK.index)
    return {"illustrative": "illustrative only", "hypothesis": "hypothetical", "assumption": "conditional on assumptions",
            "definition": "derived from definitions"}.get(weakest, "derived from attributed, unverified sources")


def _record(store, service, inquiry, summary, premises):
    ir = Item(f"IR:{service}:{_digest(service, inquiry.id, summary, sorted(premises))}", "inference_record",
              {"service": service, "inquiry": inquiry.id, "summary": summary, "premises": sorted(premises)},
              dict(PROGRAM, source=f"{service} service"))
    return store.propose(ir, f"{service} inference").id


def _propose(store, service, inquiry, body, premises, summary):
    ir = _record(store, service, inquiry, summary, premises)
    cid = f"P:{_digest(body, inquiry.id)}"
    store.propose(Item(cid, "content", body, dict(PROGRAM, source=f"{service} service"), {"situation": inquiry.id}),
                  summary)
    grounds = [ir] + sorted(premises)
    store.propose(Item(f"ST:{cid}", "standing", {"of": cid, "attitude": "proposed", "holder": "program",
                                                 "grounds": grounds, "label": label(store, grounds)},
                       dict(PROGRAM, source="contract")), "standing of a proposal")
    return cid


def _use(ans, service):
    if service not in ans.services:
        ans.services.append(service)


def _supply(store, inquiry, ans):
    for entity in sorted(set(inquiry.body["roles"].values())):
        proposals, notes = rules.supply(store, inquiry, entity, model.required_keys(store))
        ans.reasons += notes
        for body, premises in proposals:
            ans.proposals.append(_propose(store, "rules", inquiry, body, premises,
                                          "property passed along licensed relations (scope hypothesis, S0 6.4)"))
            _use(ans, "rules")


def _quantity(store, inquiry, role, kind, ans):
    _supply(store, inquiry, ans)
    o, body, grounds = model.run(store, inquiry, role, kind)
    _use(ans, "model")
    ans.status, ans.needs, ans.reasons, ans.caveats = o.status, ans.needs + o.needs, ans.reasons + o.reasons, o.caveats
    ans.grounds = grounds
    if body is not None:
        cid = _propose(store, "model", inquiry, body, grounds, f"model-based inference ({o.status})")
        ans.proposals.append(cid)
        ans.interval = (body["lo"], body["hi"], body["unit"])
        ans.grounds = [cid]
    return o


def inquire(store, inquiry_id):
    inquiry = store.get(inquiry_id)
    q = thaw(store.get(inquiry.body["question"]).body)
    role = q["role"]
    entity = inquiry.body["roles"][role]
    ans = Answer(inquiry_id, q)
    if q.get("presuppositions"):
        res = rules.presuppositions(store, inquiry, entity, q["presuppositions"])
        _use(ans, "rules")
        ans.presuppositions = [(n, v, s) for n, v, s, _ in res]
        if any(s == "violated" for _, _, s, _ in res):
            ans.question_status = "defective"
            _record(store, "rules", inquiry, "question has a violated presupposition (S0 7.2)",
                    [g for *_, gs in res for g in gs])
    if "kind" in q:
        _quantity(store, inquiry, role, q["kind"], ans)
    elif "class" in q:
        verdict, grounds, need, note = rules.classify(store, inquiry, entity, q["class"])
        _use(ans, "rules")
        if need:
            _quantity(store, inquiry, role, need, ans)
            verdict, grounds, need, note = rules.classify(store, inquiry, entity, q["class"])
        ans.verdict, ans.reasons = verdict, ans.reasons + [note]
        if verdict != "undetermined":
            body = {"form": "classification", "class": q["class"], "bearer": entity, "verdict": verdict}
            ans.proposals.append(_propose(store, "rules", inquiry, body, grounds, f"classification: {note}"))
        ans.grounds = grounds
    elif "attribute" in q:
        value, grounds, notes = rules.attribute(store, inquiry, entity, q["attribute"])
        _use(ans, "rules")
        ans.value, ans.grounds, ans.reasons = value, grounds, ans.reasons + notes
        if value is None:
            ans.needs.append(f"{q['attribute']} of {entity}")
    concluded = ans.status == "SUPPORTED" or ans.verdict in ("applies", "does not apply") or ans.value is not None
    ans.standing = label(store, ans.grounds) if concluded else "no conclusion"
    return ans
