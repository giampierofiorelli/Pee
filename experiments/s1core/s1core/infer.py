"""Model-based inference over acquired knowledge (S0 5.7 "model-based"; reuse and scope hypotheses, 6.4).

Goal: a quantity kind of the entity filling a role in a situation. The program looks for

1. values of that entity (or, for intensive kinds, of what it belongs to or is made of) whose stated conditions are
   met by the situation (4.6; a value never applies where its conditions are not stated or not met);
2. models with a solved form for that kind and role. A model is applied only if its categorical requirements are
   established or explicitly assumed in the situation, all inputs can be derived recursively, and its quantitative
   domain conditions are shown to hold on the derived values (TC3, C8). A violated condition refuses the result;
   a condition the uncertainty cannot decide leaves it unresolved.

Every outcome carries status, a conservative interval in coherent SI units, the item ids it rests on, what is
missing, the reasons for any refusal, caveats (assumptions, inheritance, unstated conditions) and a full trace.
No rule names a domain, entity, kind or role: they come only from the knowledge and the situation.
"""
from dataclasses import dataclass, field

from . import expr, units
from .knowledge import Attribute, Link, Model, SingleValued, Value

SUPPORTED, UNRESOLVED, REFUSED, CONFLICT, SKIPPED = "SUPPORTED", "UNRESOLVED", "REFUSED", "CONFLICT", "SKIPPED"


@dataclass
class Outcome:
    status: str
    interval: object = None
    grounds: set = field(default_factory=set)
    needs: list = field(default_factory=list)
    reasons: list = field(default_factory=list)
    caveats: list = field(default_factory=list)
    trace: dict = field(default_factory=dict)


def _uniq(xs):
    return sorted(set(xs))


def _lineage(kb, entity):
    """Breadth-first ancestors: (ancestor, link ids, passes through made_of)."""
    links = sorted(kb.of(Link), key=lambda l: l.id)
    out, seen, queue = [], {entity}, [(entity, (), False)]
    while queue:
        e, chain, made = queue.pop(0)
        out.append((e, chain, made))
        for l in links:
            if l.entity == e and l.target not in seen:
                seen.add(l.target)
                queue.append((l.target, chain + (l.id,), made or l.relation == "made_of"))
    return out


def _match(conds, sit):
    """Conditions of a value or attribute against the situation: (missing names, mismatches)."""
    missing, mismatch = [], []
    for k, v in sorted(conds.items()):
        s = sit.conditions.get(k)
        if s is None:
            missing.append(k)
        elif isinstance(v, str) or isinstance(s, str):
            if v != s:
                mismatch.append(f"{k}: holds for {v!r}, situation has {s!r}")
        elif not units.same_dims(units.dims_of(v[2]), units.dims_of(s[2])):
            mismatch.append(f"{k}: incompatible units {v[2]} and {s[2]}")
        else:
            vlo, vhi = units.to_si(*v)
            slo, shi = units.to_si(*s)
            tol = 1e-9 * max(1.0, abs(vlo), abs(vhi))
            if not (slo >= vlo - tol and shi <= vhi + tol):
                mismatch.append(f"{k}: holds for {v[0]:g}-{v[1]:g} {v[2]}, situation has {s[0]:g}-{s[1]:g} {s[2]}")
    return missing, mismatch


def _fmt_conds(sit):
    return ", ".join(f"{k}={v if isinstance(v, str) else f'{v[0]:g}-{v[1]:g} {v[2]}'}"
                     for k, v in sorted(sit.conditions.items())) or "no stated conditions"


def _value_paths(kb, sit, entity, kind, intensive):
    paths = []
    by_depth = {}
    for anc, chain, _ in _lineage(kb, entity):
        if anc != entity and not intensive:
            continue  # an extensive value of a kind or material is not a value of its members or parts
        by_depth.setdefault(len(chain), []).append((anc, chain))
    for depth in sorted(by_depth):
        level = []
        for anc, chain in by_depth[depth]:
            for v in kb.of(Value):
                if v.bearer != anc or v.kind != kind:
                    continue
                missing, mismatch = _match(v.conditions, sit)
                tr = {"via": "value", "item": v.id, "bearer": anc, "links": list(chain), "stated": [v.lo, v.hi, v.unit],
                      "conditions": {k: c for k, c in v.conditions.items()}, "source": v.source, "ground": v.ground}
                if missing:
                    o = Outcome(UNRESOLVED, needs=[f"state {k} in situation {sit.id} ({v.id} holds only under a stated "
                                                   f"{k})" for k in missing],
                                reasons=[f"{v.id} not applicable: situation does not state {', '.join(missing)}"])
                elif mismatch:
                    o = Outcome(UNRESOLVED, needs=[f"{kind} of {anc} under {_fmt_conds(sit)}"],
                                reasons=[f"{v.id} not applicable: " + "; ".join(mismatch)])
                else:
                    lo, hi = units.to_si(v.lo, v.hi, v.unit)
                    cav = []
                    if chain:
                        cav.append(f"{kind} of {entity} inherited from {anc} via {', '.join(chain)} (generic, defeasible)")
                    if not v.conditions:
                        cav.append(f"{v.id} states no conditions; any dependence on conditions is not represented")
                    o = Outcome(SUPPORTED, expr.Interval(lo, hi), {v.id, *chain}, caveats=cav)
                o.trace = dict(tr, status=o.status, reasons=o.reasons)
                level.append(o)
        paths.extend(level)
        if any(p.status == SUPPORTED for p in level):
            break  # the most specific applicable level overrides inherited generic values
    return paths


def _attribute(kb, sit, entity, name):
    """Most specific applicable established attribute. Returns (found list, near misses)."""
    near = []
    by_depth = {}
    for anc, chain, made in _lineage(kb, entity):
        for a in kb.of(Attribute):
            if a.bearer != anc or a.name != name or (made and not a.material):
                continue
            missing, mismatch = _match(a.conditions, sit)
            if missing or mismatch:
                near.append(f"{a.id} ({name}={a.value} of {anc}) not applicable: "
                            + "; ".join([f"situation does not state {m}" for m in missing] + mismatch))
            else:
                by_depth.setdefault(len(chain), []).append((a, chain))
    if not by_depth:
        return [], near
    return by_depth[min(by_depth)], near


def _requirement(kb, sit, entity, req):
    single = [s for s in kb.of(SingleValued) if s.name == req.name]
    found, near = _attribute(kb, sit, entity, req.name)
    assumed = [a for a in sit.assumptions if a.bearer == entity and a.name == req.name]
    tr = {"requirement": f"{req.name} of {entity} = {req.value}"}
    if len({a.value for a, _ in found}) > 1:
        return Outcome(UNRESOLVED, reasons=[f"conflicting established values of {req.name} for {entity}"],
                       grounds={a.id for a, _ in found}, trace=dict(tr, status=UNRESOLVED))
    if found:
        a, chain = found[0]
        g = {a.id, *chain}
        if assumed and assumed[0].value != a.value:
            return Outcome(UNRESOLVED, grounds=g, reasons=[f"situation assumes {req.name}={assumed[0].value} for "
                                                           f"{entity} but {a.id} establishes {a.value}"],
                           trace=dict(tr, status=UNRESOLVED))
        if a.value == req.value:
            cav = [f"{req.name} of {entity} inherited from {a.bearer} via {', '.join(chain)}"] if chain else []
            return Outcome(SUPPORTED, grounds=g, caveats=cav, trace=dict(tr, status=SUPPORTED, by=a.id))
        if single:
            return Outcome(REFUSED, grounds=g | {single[0].id},
                           reasons=[f"{req.name} of {entity} is {a.value} ({a.id}); {single[0].id} makes it exclude "
                                    f"the required {req.value}"], trace=dict(tr, status=REFUSED, by=a.id))
        return Outcome(UNRESOLVED, grounds=g, needs=[f"whether {req.name}={a.value} excludes {req.value}"],
                       reasons=[f"{req.name} of {entity} is {a.value}; not declared single-valued"],
                       trace=dict(tr, status=UNRESOLVED))
    if assumed:
        a = assumed[0]
        if a.value == req.value:
            return Outcome(SUPPORTED, caveats=[f"assumed in situation {sit.id}: {req.name} of {entity} = {a.value} "
                                               f"(idealisation, not established)"],
                           trace=dict(tr, status=SUPPORTED, by=f"assumption {a.id}"))
        status = REFUSED if single else UNRESOLVED
        return Outcome(status, reasons=[f"situation assumes {req.name}={a.value}, model requires {req.value}"],
                       trace=dict(tr, status=status))
    return Outcome(UNRESOLVED, needs=[f"{req.name} of {entity} (model requires {req.value})"],
                   reasons=near or [f"nothing establishes {req.name} of {entity}"], trace=dict(tr, status=UNRESOLVED))


def _decide(iv, op, lo, hi):
    if op == "<":
        return "holds" if iv.hi < lo else "violated" if iv.lo >= hi else "undecided"
    if op == "<=":
        return "holds" if iv.hi <= lo else "violated" if iv.lo > hi else "undecided"
    if op == ">":
        return "holds" if iv.lo > hi else "violated" if iv.hi <= lo else "undecided"
    return "holds" if iv.lo >= hi else "violated" if iv.hi < lo else "undecided"


def _combine(parts):
    """Status of a step from its parts: any skipped -> skipped; unresolved; refused or conflict -> refused."""
    st = {p.status for p in parts}
    if SKIPPED in st:
        return SKIPPED
    if UNRESOLVED in st:
        return UNRESOLVED
    if REFUSED in st or CONFLICT in st:
        return REFUSED
    return SUPPORTED


def _apply(kb, sit, m, sym, stack):
    tr = {"via": "model", "item": m.id, "name": m.name, "solve_for": sym, "form": m.forms[sym],
          "generality": m.generality, "source": m.source, "requirements": [], "inputs": {}, "domain": []}
    out = Outcome(SUPPORTED, grounds={m.id}, trace=tr)

    def absorb(o):
        out.grounds |= o.grounds
        out.needs += o.needs
        out.reasons += o.reasons
        out.caveats += o.caveats

    def finish(status, interval=None):
        out.status, out.interval = status, interval
        tr.update(status=status, reasons=_uniq(out.reasons), interval=repr(interval) if interval else None)
        return out

    reqs = []
    for r in m.requirements:
        ent = sit.roles.get(r.role)
        o = (_requirement(kb, sit, ent, r) if ent else
             Outcome(UNRESOLVED, needs=[f"fill role {r.role} in situation {sit.id}"], reasons=[f"role {r.role} unfilled"]))
        tr["requirements"].append(o.trace or {"requirement": f"{r.name} of role {r.role}", "status": o.status})
        absorb(o)
        reqs.append(o)
    if any(o.status == REFUSED for o in reqs):
        out.reasons.append(f"{m.id} does not apply to this situation")
        return finish(REFUSED)

    def bind(syms, env):
        parts = []
        for v in sorted(syms):
            if v in env:
                continue
            role, kind = m.variables[v]
            ent = sit.roles.get(role)
            if ent is None:
                o = Outcome(UNRESOLVED, needs=[f"fill role {role} in situation {sit.id}"], reasons=[f"role {role} unfilled"])
            else:
                o = _derive(kb, sit, ent, kind, stack)
            tr["inputs"][v] = o.trace
            parts.append(o)
            if o.status == SUPPORTED:
                env[v] = o.interval
        return parts

    env = {}
    node = expr.parse(m.forms[sym])
    parts = bind(expr.variables(node), env)
    st = _combine(reqs + parts)
    if st == SKIPPED:
        return finish(SKIPPED)
    for p in parts:
        absorb(p)
    if st != SUPPORTED:
        return finish(st)
    try:
        value = expr.evaluate(node, env)
    except expr.ExprError as e:
        out.reasons.append(f"{m.id}: {e}")
        return finish(UNRESOLVED)
    env[sym] = value
    for c in m.conditions:
        cnode = expr.parse(c.expr)
        cparts = bind(expr.variables(cnode), env)
        cst = _combine(cparts)
        for p in cparts:
            absorb(p)
        if cst != SUPPORTED:
            out.reasons.append(f"domain condition {c.expr} could not be evaluated")
            return finish(UNRESOLVED if cst != SKIPPED else SKIPPED)
        try:
            civ = expr.evaluate(cnode, env)
        except expr.ExprError as e:
            out.reasons.append(f"domain condition {c.expr}: {e}")
            return finish(UNRESOLVED)
        verdict = _decide(civ, c.op, c.lo, c.hi)
        bound = f"{c.lo:g}" if c.lo == c.hi else f"[{c.lo:g}, {c.hi:g}]"
        tr["domain"].append({"condition": f"{c.expr} {c.op} {bound}", "value": repr(civ), "verdict": verdict,
                             "note": c.note})
        if verdict == "violated":
            out.reasons.append(f"outside the domain of {m.id}: {c.expr} = {civ!r}, required {c.op} {bound}; "
                               f"extrapolation is not licensed")
            return finish(REFUSED)
        if verdict == "undecided":
            out.reasons.append(f"domain of {m.id} undecided: {c.expr} = {civ!r} against {c.op} {bound}")
            out.needs.append(f"narrower input uncertainty or a sharper bound for {c.expr} ({m.id})")
            return finish(UNRESOLVED)
    if m.generality == "idealised law":
        out.caveats.append(f"{m.id} is an idealised law: the result holds only as far as its idealisations fit")
    return finish(SUPPORTED, value)


def _derive(kb, sit, entity, kind, stack):
    key = (entity, kind)
    goal = f"{kind} of {entity}"
    if key in stack:
        return Outcome(SKIPPED, reasons=[f"circular: {goal}"], trace={"goal": goal, "status": SKIPPED})
    stack = stack | {key}
    kinds = kb.kinds()
    if kind not in kinds:
        return Outcome(UNRESOLVED, needs=[f"quantity kind {kind}"], reasons=[f"unknown kind {kind}"],
                       trace={"goal": goal, "status": UNRESOLVED})
    paths = _value_paths(kb, sit, entity, kind, kinds[kind].intensive)
    for m in kb.of(Model):
        for sym, (role, k) in sorted(m.variables.items()):
            if k == kind and sit.roles.get(role) == entity and sym in m.forms:
                paths.append(_apply(kb, sit, m, sym, stack))
    live = [p for p in paths if p.status != SKIPPED]
    sup = [p for p in live if p.status == SUPPORTED]
    o = Outcome(UNRESOLVED)
    if sup:
        iv = sup[0].interval
        for p in sup[1:]:
            iv = iv.intersect(p.interval) if iv else None
        o.status, o.interval = (SUPPORTED, iv) if iv else (CONFLICT, None)
        for p in sup:
            o.grounds |= p.grounds
            o.caveats += p.caveats
        if not iv:
            o.reasons.append(f"derivations of {goal} disagree: " + ", ".join(repr(p.interval) for p in sup))
    elif live:
        o.status = UNRESOLVED if any(p.status in (UNRESOLVED, CONFLICT) for p in live) else REFUSED
        for p in live:
            o.grounds |= p.grounds
            o.needs += p.needs
            o.reasons += p.reasons
    elif paths:
        o.status = SKIPPED
        o.reasons.append(f"only circular derivations of {goal}")
    else:
        o.needs.append(f"{goal}: no value or model")
        o.reasons.append(f"no value or model gives {goal}")
    o.needs, o.reasons, o.caveats = _uniq(o.needs), _uniq(o.reasons), _uniq(o.caveats)
    o.trace = {"goal": goal, "status": o.status, "interval_SI": repr(o.interval) if o.interval else None,
               "SI_unit": units.si_label(kinds[kind].dims),
               "paths": [p.trace for p in paths if p.status != SKIPPED]}
    return o


def infer(kb, sit, role, kind):
    """Answer: what is `kind` of the entity filling `role` in situation `sit`?"""
    entity = sit.roles.get(role)
    if entity is None:
        return Outcome(UNRESOLVED, needs=[f"fill role {role}"], reasons=[f"role {role} unfilled"],
                       trace={"goal": f"{kind} of role {role}", "status": UNRESOLVED})
    o = _derive(kb, sit, entity, kind, frozenset())
    if o.status == SKIPPED:
        o.status = UNRESOLVED
        o.needs = [f"{kind} of {entity}: an independent value or model"]
    o.trace = {"query": f"{kind} of {entity} in situation {sit.id}", "inference_type": "model-based (S0 5.7)",
               "standing": "proposed by the program; rests on the grounds listed (S0 5.9, 6.4 scope hypothesis)",
               **o.trace, "status": o.status}
    return o


def ablate(kb, sit, role, kind):
    """Remove each ground of the answer in turn and report the new status."""
    base = infer(kb, sit, role, kind)
    return [(g, infer(kb.without({g}), sit, role, kind).status) for g in sorted(base.grounds)]
