"""Data model: source statements supplied to the program (never produced by it)."""
from dataclasses import dataclass, field

# Units the program knows, mapped to a dimension (S0 4.7). Unknown units have no dimension and block comparison.
UNIT_DIMENSION = {
    "L/day": "volume/time", "kg/h": "mass/time", "L": "volume",
    "%RH": "dimensionless (relative humidity)", "°C": "temperature",
    "dB(A)": "A-weighted sound level", "W": "power", "h": "time",
}

KINDS = {"category", "quantity", "function", "gap", "evaluation"}
METHODS = {"rated", "measured", "reported", "described", "judged", "declared", "intervention"}


@dataclass(frozen=True)
class Statement:
    id: str
    subject: str                      # tested object
    kind: str                         # one of KINDS
    holder: str                       # who states it (S0 D14)
    method: str                       # how it was obtained, as declared in the source
    quantity: str | None = None       # quantity kind name (any string; the program attaches no meaning to it)
    value: tuple | None = None        # (low, high); low == high for a single value
    unit: str | None = None
    approximate: bool = False
    conditions: dict = field(default_factory=dict)   # empty = conditions not supplied
    unknowns: tuple = ()              # facts explicitly marked as not established in the source
    attributes: dict = field(default_factory=dict)   # function effects, evaluation parameters
    text: str = ""                    # human-readable gloss; never read by any rule

    def __post_init__(self):
        assert self.kind in KINDS, self.kind
        assert self.method in METHODS, self.method

    def as_tuple(self):
        return (self.id, self.subject, self.kind, self.holder, self.method, self.quantity, self.value,
                self.unit, self.approximate, tuple(sorted(self.conditions.items())), self.unknowns,
                tuple(sorted((k, str(v)) for k, v in self.attributes.items())))

    def quantity_mode(self):
        return (self.quantity, self.conditions.get("mode"))


def classify(s: Statement) -> str:
    """R-PROV. Kind of item by declared method, S0 3.4 and 6.1. Uses only the declared fields."""
    if s.kind == "quantity":
        return {"rated": "specification", "declared": "specification", "measured": "observation",
                "reported": "reported observation (measuring holder not established)",
                "intervention": "experimental observation"}.get(s.method, "unclassified quantity")
    return s.kind


def standing(s: Statement) -> str:
    """S0 6.1: the program never adopts an input; every input stays attributed to its holder."""
    return "attributed"


@dataclass
class Conclusion:
    status: str                       # SUPPORTED | NOT_ESTABLISHED | UNRESOLVED | REFUSED
    claim: str
    about: str                        # quantity | derivation | function | comparison | causal | evaluation
    grounds: list                     # ids of input statements used
    rules: list                       # ids of rules applied (see queries.RULES)
    negative: bool = False            # True would mean "a negative finding"; no rule ever sets it
    details: dict = field(default_factory=dict)

    def trace(self):
        return {"status": self.status, "claim": self.claim, "grounds": self.grounds, "rules": self.rules,
                "details": self.details}


class KB:
    def __init__(self, statements):
        ids = [s.id for s in statements]
        assert len(ids) == len(set(ids)), "duplicate ids"
        self.statements = list(statements)
        self.by_id = {s.id: s for s in statements}

    def find(self, **kw):
        out = []
        for s in self.statements:
            if all(getattr(s, k) == v for k, v in kw.items()):
                out.append(s)
        return out
