"""Shared item store and universe-event log (plan sections 3.2, 5; S0 D1, T7, T8, C5).

The store is deliberately small. It individuates items, keeps a versioned registry of item kinds, checks
provenance and records every change as an append-only universe event. It does not interpret item bodies:
validation belongs to the services that own each kind. Nothing is ever deleted or overwritten. ``at(seq)`` replays
the log up to an earlier point, so what was held at that time can be reconstructed.
"""
from dataclasses import dataclass
from types import MappingProxyType

KINDS_V1 = ("quantity_kind", "relation_concept", "concept", "entity", "model", "record", "content", "question",
            "inquiry", "standing", "inference_record")
BASES = ("published reference", "measurement record", "manufacturer statement", "definition", "hypothesis",
         "assumption", "illustrative", "derived",
         # X1: a statement retained from a document whose author role is not yet established (S0 6.1, RQ6), and a
         # buyer's stated requirement (a conative item, S0 7.4; never an epistemic ground, plan I5)
         "document statement", "stated requirement")


class StoreError(ValueError):
    pass


def freeze(v):
    """Deep, read-only copy: mappings become read-only views of copies, lists become tuples."""
    if isinstance(v, (dict, MappingProxyType)):
        return MappingProxyType({k: freeze(x) for k, x in v.items()})
    if isinstance(v, (list, tuple)):
        return tuple(freeze(x) for x in v)
    return v


def thaw(v):
    if isinstance(v, MappingProxyType):
        return {k: thaw(x) for k, x in v.items()}
    if isinstance(v, tuple):
        return [thaw(x) for x in v]
    return v


@dataclass(frozen=True)
class Item:
    id: str
    kind: str
    body: object
    provenance: object
    situating: object = MappingProxyType({})

    def __post_init__(self):
        for f in ("body", "provenance", "situating"):
            object.__setattr__(self, f, freeze(getattr(self, f) or {}))


@dataclass(frozen=True)
class Event:
    seq: int
    type: str          # register_kind | acquire | propose
    subject: str       # item id or kind name
    reason: str
    item: object = None


class Store:
    def __init__(self):
        self._events = []
        self._items = {}
        self._kinds = set()
        for k in KINDS_V1:
            self.register_kind(k, "kind registry v1")

    # --- log -------------------------------------------------------------------------------------------------
    @property
    def seq(self):
        return len(self._events)

    @property
    def events(self):
        return tuple(self._events)

    def _append(self, type_, subject, reason, item=None):
        self._events.append(Event(len(self._events) + 1, type_, subject, reason, item))

    def register_kind(self, name, reason):
        if name in self._kinds:
            raise StoreError(f"kind {name} already registered")
        self._kinds.add(name)
        self._append("register_kind", name, reason)

    # --- items -----------------------------------------------------------------------------------------------
    def _admit(self, item, type_, reason, validate):
        if not isinstance(item, Item):
            raise StoreError("not an Item")
        if item.kind not in self._kinds:
            raise StoreError(f"{item.id}: kind {item.kind} is not registered")
        prov = item.provenance
        if not prov.get("source") or not prov.get("holder") or prov.get("basis") not in BASES:
            raise StoreError(f"{item.id}: provenance needs source, holder and a basis in {BASES}")
        if type_ == "propose" and prov.get("basis") != "derived":
            raise StoreError(f"{item.id}: proposals must have basis 'derived'")
        if type_ == "acquire" and prov.get("basis") == "derived":
            raise StoreError(f"{item.id}: acquired items cannot claim basis 'derived'")
        old = self._items.get(item.id)
        if old is not None:
            if old == item:
                return old  # idempotent: the same content proposed again
            raise StoreError(f"{item.id}: id already holds different content (revision needs a new item)")
        if validate:
            validate(self, item)
        self._items[item.id] = item
        self._append(type_, item.id, reason, item)
        return item

    def acquire(self, item, reason="acquisition", validate=None):
        """Attribution before adoption: an acquired item is attributed to its holder, never adopted here."""
        return self._admit(item, "acquire", reason, validate)

    def propose(self, item, reason):
        return self._admit(item, "propose", reason, None)

    def get(self, item_id):
        return self._items[item_id]

    def has(self, item_id):
        return item_id in self._items

    def of(self, kind, **body_match):
        return [i for i in self._items.values() if i.kind == kind
                and all(i.body.get(k) == v for k, v in body_match.items())]

    def at(self, seq):
        """A new store holding exactly what was held after event ``seq``."""
        s = Store.__new__(Store)
        s._events, s._items, s._kinds = [], {}, set()
        for e in self._events[:seq]:
            s._events.append(e)
            if e.type == "register_kind":
                s._kinds.add(e.subject)
            else:
                s._items[e.subject] = e.item
        return s
