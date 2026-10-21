"""Acquired knowledge: items with provenance, scope and standing, validated and frozen at acquisition.

This module holds the minimal item types needed by one inference type, numerical model-based inference (S0 5.7).
It is not the semantic universe: S0's other kinds of content (mechanisms, causal and evidential relations,
explanations, goals, norms, revisions) are not yet represented. They are meant to be added as further item types
using the same provenance, scope and standing fields; nothing here assumes that every content is a quantity.

Item types (S0 references):

* QuantityKind: a determinable with a dimension (4.7). ``intensive`` kinds may describe a material.
* Value: a quantity value of a bearer, given as an interval in a unit (4.7, 4.9).
* Attribute: a categorical determinate of a bearer.
* Link: instance_of, subkind_of or made_of between entities. ``made_of`` means the source consists wholly of the
  target. An entity with several made_of links is a composite, and no material property passes to it (Op3).
* SingleValued: a determinable whose determinates exclude one another (4.10, N4).
* Model: a model in the sense of D7. Its variables are bound to roles and kinds (Op1), and it carries solved forms,
  categorical requirements, quantitative domain conditions (4.6(1), TC3) and a generality form (4.2).
* Situation: a target, made of role fillers, conditions, givens (boundary and initial data, 4.6(2)), idealising
  assumptions (Op7) and explicit scope assumptions (6.4).

Every Value and Attribute declares four things:

* ``scope``, which says where it applies (4.3, T7):
  * ``conditional``: only where its stated conditions are met;
  * ``invariant``: declared context-independent, with a stated justification (4.3, declared invariance);
  * ``unknown``: the source does not say. It is never applied unless a situation adopts it as an explicit scope
    assumption.
* ``holds_of``, which says what it describes, and therefore what it may pass to:
  * ``material``: a property of a substance. It passes through one sole made_of, and through subkind_of and
    instance_of;
  * ``kind``: a generic property of a kind. It passes only through instance_of and subkind_of;
  * ``population``: a spread over members. It never passes, and is never used as a bound (4.2, Op3);
  * ``individual``: a property of the bearer only.
* ``basis``, which says what kind of support it has. ``verified_by`` is empty unless the item was checked against
  its source.
* ``source``, which must be non-empty.
"""
from dataclasses import dataclass, fields
from types import MappingProxyType

from . import expr, units

BASES = {"published reference", "measurement record", "manufacturer statement", "definition", "hypothesis",
         "assumption", "illustrative"}
SCOPES = {"conditional", "invariant", "unknown"}
HOLDS = {"material", "kind", "population", "individual"}
LINKS = {"instance_of", "subkind_of", "made_of"}
OPS = {"<", "<=", ">", ">="}


class AcquisitionError(ValueError):
    pass


class _Frozen:
    """Replace dict fields by read-only copies so that an item cannot change after validation."""

    def __post_init__(self):
        for f in fields(self):
            v = getattr(self, f.name)
            if isinstance(v, (dict, MappingProxyType)):
                object.__setattr__(self, f.name, MappingProxyType(dict(v)))
            elif isinstance(v, list):
                object.__setattr__(self, f.name, tuple(v))


@dataclass(frozen=True)
class QuantityKind(_Frozen):
    id: str
    dims: tuple
    intensive: bool
    source: str = ""
    basis: str = "definition"


@dataclass(frozen=True)
class Value(_Frozen):
    id: str
    bearer: str
    kind: str
    lo: float
    hi: float
    unit: str
    conditions: dict = None
    scope: str = None
    holds_of: str = None
    invariance: str = ""
    source: str = ""
    basis: str = None
    verified_by: str = ""


@dataclass(frozen=True)
class Attribute(_Frozen):
    id: str
    bearer: str
    name: str
    value: str
    conditions: dict = None
    scope: str = None
    holds_of: str = None
    invariance: str = ""
    source: str = ""
    basis: str = None
    verified_by: str = ""


@dataclass(frozen=True)
class Link(_Frozen):
    id: str
    entity: str
    relation: str
    target: str
    source: str = ""
    basis: str = None
    verified_by: str = ""


@dataclass(frozen=True)
class SingleValued(_Frozen):
    id: str
    name: str
    source: str = ""
    basis: str = "definition"
    verified_by: str = ""


@dataclass(frozen=True)
class Requirement:
    role: str
    name: str
    value: str


@dataclass(frozen=True)
class DomainCondition:
    expr: str
    op: str
    lo: float          # the bound itself may be uncertain: [lo, hi]
    hi: float
    note: str = ""


@dataclass(frozen=True)
class Model(_Frozen):
    id: str
    name: str
    variables: dict    # symbol -> (role, kind)
    forms: dict        # symbol -> expression giving that symbol
    requirements: tuple = ()
    conditions: tuple = ()
    generality: str = "idealised law"
    source: str = ""
    basis: str = None
    verified_by: str = ""


@dataclass(frozen=True)
class Situation(_Frozen):
    id: str
    roles: dict
    conditions: dict = None
    givens: tuple = ()             # Values holding within this situation only
    assumptions: tuple = ()        # Attributes assumed within this situation (basis 'assumption')
    scope_assumptions: tuple = ()  # ids of 'unknown'-scope items this situation explicitly adopts


def _check_conditions(conds, where):
    for k, v in conds.items():
        if isinstance(v, str):
            continue
        if not (isinstance(v, tuple) and len(v) == 3 and units.known(v[2]) and v[0] <= v[1]):
            raise AcquisitionError(f"{where}: malformed condition {k}={v!r}")


def _check_provenance(it):
    if not getattr(it, "source", ""):
        raise AcquisitionError(f"{it.id}: missing provenance (source)")
    if getattr(it, "basis", None) not in BASES:
        raise AcquisitionError(f"{it.id}: basis must be one of {sorted(BASES)}")


def _check_scope(it, kinds=None):
    if it.conditions is None or it.scope not in SCOPES or it.holds_of not in HOLDS:
        raise AcquisitionError(f"{it.id}: conditions, scope and holds_of must be declared explicitly")
    _check_conditions(it.conditions, it.id)
    if it.scope == "conditional" and not it.conditions:
        raise AcquisitionError(f"{it.id}: conditional scope without conditions")
    if it.scope != "conditional" and it.conditions:
        raise AcquisitionError(f"{it.id}: conditions given but scope is {it.scope}")
    if it.scope == "invariant" and not it.invariance:
        raise AcquisitionError(f"{it.id}: invariant scope needs a stated justification")
    if kinds is not None and it.holds_of == "material" and not kinds[it.kind].intensive:
        raise AcquisitionError(f"{it.id}: an extensive quantity cannot be a material property")


def check_situation(kb, sit):
    """Validate a situation against the knowledge it is used with."""
    kinds = kb.kinds()
    _check_conditions(sit.conditions or {}, sit.id)
    ids = set()
    for g in sit.givens:
        if not isinstance(g, Value) or g.kind not in kinds or not units.known(g.unit) or not units.same_dims(
                units.dims_of(g.unit), kinds[g.kind].dims) or not g.lo <= g.hi:
            raise AcquisitionError(f"{sit.id}: invalid given {getattr(g, 'id', g)}")
        _check_provenance(g)
        ids.add(g.id)
    for a in sit.assumptions:
        if not isinstance(a, Attribute) or a.basis != "assumption":
            raise AcquisitionError(f"{sit.id}: assumption {getattr(a, 'id', a)} must be an Attribute with basis "
                                   f"'assumption'")
        _check_provenance(a)
        ids.add(a.id)
    for i in sit.scope_assumptions:
        if i not in kb.items or getattr(kb.items[i], "scope", None) != "unknown":
            raise AcquisitionError(f"{sit.id}: scope assumption {i} does not name an unknown-scope item")
    if ids & set(kb.items) or len(ids) != len(sit.givens) + len(sit.assumptions):
        raise AcquisitionError(f"{sit.id}: situation item ids must be unique and distinct from knowledge ids")


class KB:
    """Acquired items. Items are validated once and are immutable; the store only grows through ``add``."""

    def __init__(self, items=()):
        self._items = {}
        for it in items:
            self.add(it)

    @property
    def items(self):
        return MappingProxyType(self._items)

    def kinds(self):
        return {i.id: i for i in self._items.values() if isinstance(i, QuantityKind)}

    def of(self, cls):
        return [i for i in self._items.values() if isinstance(i, cls)]

    def without(self, ids):
        return KB([i for i in self._items.values() if i.id not in ids])

    def add(self, it):
        """Validate and store one item. Invalid knowledge is refused, never repaired."""
        if not isinstance(it, (QuantityKind, Value, Attribute, Link, SingleValued, Model)):
            raise AcquisitionError(f"unknown item type {type(it).__name__}")
        if it.id in self._items:
            raise AcquisitionError(f"duplicate id {it.id}")
        _check_provenance(it)
        kinds = self.kinds()
        if isinstance(it, QuantityKind):
            if len(it.dims) != len(units.BASE):
                raise AcquisitionError(f"{it.id}: bad dimension vector")
        elif isinstance(it, Value):
            if it.kind not in kinds:
                raise AcquisitionError(f"{it.id}: unknown quantity kind {it.kind}")
            if not units.known(it.unit):
                raise AcquisitionError(f"{it.id}: unknown unit {it.unit}")
            if not units.same_dims(units.dims_of(it.unit), kinds[it.kind].dims):
                raise AcquisitionError(f"{it.id}: unit {it.unit} does not have the dimension of {it.kind}")
            if not it.lo <= it.hi:
                raise AcquisitionError(f"{it.id}: empty interval")
            _check_scope(it, kinds)
        elif isinstance(it, Attribute):
            if it.holds_of == "population":
                raise AcquisitionError(f"{it.id}: a categorical attribute cannot be a population spread")
            _check_scope(it)
        elif isinstance(it, Link):
            if it.relation not in LINKS:
                raise AcquisitionError(f"{it.id}: unknown relation {it.relation}")
        elif isinstance(it, Model):
            self._check_model(it, kinds)
        self._items[it.id] = it

    @staticmethod
    def _check_model(m, kinds):
        env = {}
        for sym, (role, kind) in m.variables.items():
            if kind not in kinds:
                raise AcquisitionError(f"{m.id}: unknown kind {kind} for {sym}")
            env[sym] = kinds[kind].dims
        if not m.forms:
            raise AcquisitionError(f"{m.id}: no forms")
        for sym, text in m.forms.items():
            if sym not in env:
                raise AcquisitionError(f"{m.id}: form for undeclared variable {sym}")
            try:
                node = expr.parse(text)
                free = expr.variables(node)
                if not free <= set(env) or sym in free:
                    raise AcquisitionError(f"{m.id}: form for {sym} uses undeclared or circular variables")
                d = expr.dims(node, env)
            except expr.ExprError as e:
                raise AcquisitionError(f"{m.id}: form for {sym}: {e}") from None
            if not units.same_dims(d, env[sym]):
                raise AcquisitionError(f"{m.id}: form for {sym} has dimension {units.si_label(d)}, "
                                       f"expected {units.si_label(env[sym])}")
        for c in m.conditions:
            if c.op not in OPS or not c.lo <= c.hi:
                raise AcquisitionError(f"{m.id}: malformed domain condition {c.expr}")
            try:
                node = expr.parse(c.expr)
                if not expr.variables(node) <= set(env):
                    raise AcquisitionError(f"{m.id}: domain condition uses undeclared variables")
                if not units.same_dims(expr.dims(node, env), units.NONE):
                    raise AcquisitionError(f"{m.id}: domain condition {c.expr} is not dimensionless")
            except expr.ExprError as e:
                raise AcquisitionError(f"{m.id}: domain condition: {e}") from None
        for r in m.requirements:
            if r.role not in {role for role, _ in m.variables.values()}:
                raise AcquisitionError(f"{m.id}: requirement on role {r.role} not used by the model")
