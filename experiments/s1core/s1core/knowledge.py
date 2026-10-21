"""Acquired knowledge: items with provenance, validated at acquisition.

Item kinds (S0 references):

* QuantityKind — a determinable with a dimension (4.7). ``intensive`` kinds are properties of a material or kind
  that may be inherited by what is made of it or belongs to it; extensive kinds are never inherited (4.2, Op3: a
  kind-level value of an extensive quantity is not a value of each member).
* Value — a quantity value of a bearer, as an interval in a unit, with the conditions under which it holds
  (4.6, 4.7, 4.9) and its provenance and ground type (5.9, C5).
* Attribute — a categorical determinate of a bearer, with conditions. ``material`` attributes pass to what is made
  of the bearer; others pass only to instances and subkinds.
* Link — instance_of, subkind_of or made_of between entities (3.x scaffold relations).
* SingleValued — declares a determinable whose determinates exclude one another (4.10, N4).
* Model — a model in the sense of S0 D7: variables bound to roles and kinds (Op1), solved forms of one relation,
  categorical requirements and quantitative domain conditions (4.6(1), 6.4 TC3), generality form (4.2), provenance.
* Situation — a target: role fillers, conditions and the situation's own idealising assumptions (Op6, Op7).
"""
from dataclasses import dataclass, field

from . import expr, units

GROUNDS = {"G1 record", "G3 source", "G4 definition", "G5 assumption"}
LINKS = {"instance_of", "subkind_of", "made_of"}
OPS = {"<", "<=", ">", ">="}


class AcquisitionError(ValueError):
    pass


@dataclass(frozen=True)
class QuantityKind:
    id: str
    dims: tuple
    intensive: bool
    source: str = ""


@dataclass(frozen=True)
class Value:
    id: str
    bearer: str
    kind: str
    lo: float
    hi: float
    unit: str
    conditions: dict = field(default_factory=dict)   # name -> (lo, hi, unit) | str
    source: str = ""
    ground: str = "G3 source"


@dataclass(frozen=True)
class Attribute:
    id: str
    bearer: str
    name: str
    value: str
    material: bool = False
    conditions: dict = field(default_factory=dict)
    source: str = ""
    ground: str = "G3 source"


@dataclass(frozen=True)
class Link:
    id: str
    entity: str
    relation: str
    target: str
    source: str = ""


@dataclass(frozen=True)
class SingleValued:
    id: str
    name: str
    source: str = ""


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
class Model:
    id: str
    name: str
    variables: dict    # symbol -> (role, kind)
    forms: dict        # symbol -> expression giving that symbol
    requirements: tuple = ()
    conditions: tuple = ()
    generality: str = "idealised law"
    source: str = ""
    ground: str = "G3 source"


@dataclass(frozen=True)
class Situation:
    id: str
    roles: dict
    conditions: dict = field(default_factory=dict)
    assumptions: tuple = ()   # Attribute items held only within this situation (ground G5)


def _check_conditions(conds, where):
    for k, v in conds.items():
        if isinstance(v, str):
            continue
        if not (isinstance(v, tuple) and len(v) == 3 and units.known(v[2]) and v[0] <= v[1]):
            raise AcquisitionError(f"{where}: malformed condition {k}={v!r}")


class KB:
    def __init__(self, items=()):
        self.items = {}
        for it in items:
            self.add(it)

    def kinds(self):
        return {i.id: i for i in self.items.values() if isinstance(i, QuantityKind)}

    def of(self, cls):
        return [i for i in self.items.values() if isinstance(i, cls)]

    def without(self, ids):
        return KB([i for i in self.items.values() if i.id not in ids])

    def add(self, it):
        """Validate and store one item. Invalid knowledge is refused, never repaired."""
        if it.id in self.items:
            raise AcquisitionError(f"duplicate id {it.id}")
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
            _check_conditions(it.conditions, it.id)
        elif isinstance(it, Attribute):
            _check_conditions(it.conditions, it.id)
        elif isinstance(it, Link):
            if it.relation not in LINKS:
                raise AcquisitionError(f"{it.id}: unknown relation {it.relation}")
        elif isinstance(it, Model):
            self._check_model(it, kinds)
        elif not isinstance(it, SingleValued):
            raise AcquisitionError(f"unknown item type {type(it).__name__}")
        if getattr(it, "ground", "G3 source") not in GROUNDS:
            raise AcquisitionError(f"{it.id}: unknown ground type")
        self.items[it.id] = it

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
