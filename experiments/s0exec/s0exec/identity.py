"""Version-specific identity procedures for coexisting concepts, and a consistency safeguard.

A concept is described only by data: its category, the set of paradigm cases picked out by its strong anchors,
and its goal sets at named levels. Paradigm-set equality stands for "the anchors in force pick out the same body
of paradigm cases" (S0 2.1 3.6.1). This is a simplification: S0 gives no executable test for "same body".
"""
from dataclasses import dataclass
from itertools import combinations, permutations, product


@dataclass(frozen=True)
class Concept:
    name: str
    category: str
    paradigm: frozenset          # paradigm cases picked out by the strong anchors
    goals: dict                  # level -> frozenset of goal (question-type) labels

    def __hash__(self):
        return hash(self.name)


def _v21(a, b):
    """S0 2.1 (cdcab48) 3.6.2 steps 1-5 for coexisting concepts. Returns (verdict, step)."""
    if a.category != b.category:
        # Step 0 is defined for failure of a category commitment in a lineage, not for coexisting concepts
        # of different categories. Not executable from the text.
        return "indeterminate", "unimplemented: category mismatch"
    A_preserved = a.paradigm == b.paradigm
    disjoint = not (a.paradigm & b.paradigm)
    levels = sorted(set(a.goals) & set(b.goals))
    per_level = {lv: (a.goals[lv] <= b.goals[lv] or b.goals[lv] <= a.goals[lv]) for lv in levels}
    if not levels:
        G = "unsettled"
    elif all(per_level.values()):
        G = "preserved"
    elif not any(per_level.values()):
        G = "broken"
    else:
        G = "granularity-dependent"
    if not A_preserved and disjoint:
        return "distinct", 1
    if not A_preserved and G == "broken":
        return "distinct", 2
    if (not A_preserved) != (G == "broken"):
        return "indeterminate", 3
    if G in ("granularity-dependent", "unsettled"):
        return "indeterminate", 4
    return "same", 5


def _v20(a, b):
    """S0 2.0 (b9bda7d) 3.6.3 table. 'Shared' anchors/goals may mean equal or overlapping, and 2.0 has no goal
    levels, so every reading (sharing x level) is evaluated. Returns the set of verdicts across readings."""
    out = set()
    levels = sorted(set(a.goals) & set(b.goals)) or [None]
    for sharing, lv in product(("equal", "overlap"), levels):
        rel = (lambda x, y: x == y) if sharing == "equal" else (lambda x, y: bool(x & y))
        anchors = rel(a.paradigm, b.paradigm)
        goals = rel(a.goals[lv], b.goals[lv]) if lv else False
        if a.category != b.category:
            out.add("distinct")
        elif anchors and goals:
            out.add("same")
        elif anchors != goals:
            out.add("indeterminate")      # "the dimensions conflict"
        else:
            out.add("distinct")           # homonymous / disjoint / co-referential rows: not the same concept
    return out


def verdicts(version, a, b):
    if a == b:
        return {"same"}
    if version == "2.1":
        return {_v21(a, b)[0]}
    if version == "2.0":
        return _v20(a, b)
    raise ValueError(version)


def check_consistency(version, concepts):
    """R-CONS: reflexivity, symmetry and transitivity of 'same' over the given concepts."""
    v = {(x.name, y.name): verdicts(version, x, y) for x, y in permutations(concepts, 2)}
    names = [c.name for c in concepts]
    asym = [(x, y) for x, y in permutations(names, 2) if v[(x, y)] != v[(y, x)]]
    ambiguous = sorted({tuple(sorted(p)) for p, s in v.items() if len(s) > 1})
    same = {p for p, s in v.items() if s == {"same"}}
    violations = [(x, y, z) for x, y, z in permutations(names, 3)
                  if (x, y) in same and (y, z) in same and (x, z) not in same]
    return {"asymmetric": asym, "ambiguous_pairs": ambiguous, "violations": violations,
            "verdicts": {f"{x}-{y}": sorted(s) for (x, y), s in v.items() if x < y}}


def safe_merge(version, concepts):
    """Merge only if 'same' is unambiguous and transitive over the set; otherwise keep every concept separate."""
    rep = check_consistency(version, concepts)
    if rep["violations"] or rep["ambiguous_pairs"] or rep["asymmetric"]:
        return [[c.name] for c in concepts]
    parent = {c.name: c.name for c in concepts}

    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x
    for a, b in combinations(concepts, 2):
        if verdicts(version, a, b) == {"same"}:
            parent[find(a.name)] = find(b.name)
    groups = {}
    for c in concepts:
        groups.setdefault(find(c.name), []).append(c.name)
    return list(groups.values())
