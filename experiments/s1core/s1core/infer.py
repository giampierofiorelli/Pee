"""Model-based inference over acquired knowledge (S0 5.7 "model-based"; reuse and scope hypotheses, 6.4).

Goal: a quantity kind of the entity filling a role in a situation. The program looks for

1. givens of the situation, and values of that entity or inherited under the rules of ``holds_of`` (material,
   kind, population, individual), whose scope covers the situation: stated conditions met (4.6), a declared
   invariance, or an unknown scope explicitly adopted by the situation as a scope assumption (6.4);
2. models with a solved form for that kind and role. A model is applied only if its categorical requirements are
   established or explicitly assumed in the situation, all inputs can be derived recursively, and its quantitative
   domain conditions are shown to hold on the derived values (TC3, C8). A violated condition refuses the result;
   a condition the uncertainty cannot decide leaves it unresolved.

Every outcome carries status, a conservative interval in coherent SI units, every premise it rests on (knowledge
items, situation givens and assumptions), what is missing, the reasons for any refusal, caveats, the epistemic
standing inherited from its premises, and a full trace. The interval expresses only arithmetic uncertainty of the
inputs; model validity, assumptions and source reliability are reported separately in ``standing`` and ``caveats``.
Several supported derivations are combined by their hull, never by intersection, because nothing here establishes
that every source is a valid bound; disjoint results are a recorded CONFLICT (C12).
No rule names a domain, entity, kind or role: they come only from the knowledge and the situation.
"""
from dataclasses import dataclass, field

from . import expr, units
from .knowledge import Attribute, Link, Model, SingleValued, Value, Verification, check_situation, fingerprint

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
    standing: dict = field(default_factory=dict)


def _uniq(xs):
    return sorted(set(xs))


def _lineage(kb, entity):
    """Every ancestor with ALL simple chains of links reaching it: [(ancestor, [chain, ...])], chains shortest first.

    Keeping every chain matters: a property may be barred along one chain and licensed along another."""
    links = sorted(kb.of(Link), key=lambda l: l.id)
    chains = {entity: [()]}

    def walk(e, chain, visited):
        for l in links:
            if l.entity == e and l.target not in visited:
                c = chain + (l.id,)
                chains.setdefault(l.target, []).append(c)
                walk(l.target, c, visited | {l.target})
    walk(entity, (), {entity})
    return [(anc, sorted(cs, key=lambda c: (len(c), c))) for anc, cs in chains.items()]


def _route(kb, holds_of, chains):
    """Shortest chain along which the property may pass: (chain, ok, reasons for barred chains)."""
    barred = []
    for c in chains:
        ok, why = _passes(kb, holds_of, c)
        if ok:
            return c, True, barred
        barred.append(f"via {', '.join(c)}: {why}")
    return chains[0], False, barred


def _passes(kb, holds_of, chain):
    """May a property of this kind of bearer pass along this chain of links? Returns (bool, reason)."""
    if not chain:
        return True, ""
    if holds_of in ("individual", "population"):
        return False, f"a {holds_of} property does not pass to other entities"
    links = [kb.items[i] for i in chain]
    made = [l for l in links if l.relation == "made_of"]
    if holds_of == "kind" and made:
        return False, f"a kind property does not pass through made_of ({made[0].id})"
    if len(made) > 1:
        return False, f"material properties do not pass through two made_of steps ({made[0].id}, {made[1].id})"
    for l in made:
        n = sum(1 for x in kb.of(Link) if x.entity == l.entity and x.relation == "made_of")
        if n > 1:
            return False, f"{l.entity} is a composite ({n} made_of links); a property of the whole is not a property of a part"
    return True, ""


def _scope(item, sit):
    """Does the item's declared scope cover the situation? Returns (status, premises, needs, reasons, caveats)."""
    if item.scope == "invariant":
        return SUPPORTED, set(), [], [], [f"{item.id} declared invariant: {item.invariance}"]
    if item.scope == "unknown":
        if item.id in sit.scope_assumptions:
            return (SUPPORTED, {f"scope:{item.id}@{sit.id}"}, [], [],
                    [f"assumed in situation {sit.id}: {item.id} applies here although its conditions are unknown"])
        return (UNRESOLVED, set(), [f"conditions under which {item.id} holds (or an explicit scope assumption)"],
                [f"{item.id} not applied: its conditions of validity are unknown"], [])
    missing, mismatch = _match(item.conditions, sit)
    if missing:
        return (UNRESOLVED, set(), [f"state {k} in situation {sit.id} ({item.id} holds only under a stated {k})"
                                    for k in missing],
                [f"{item.id} not applicable: situation does not state {', '.join(missing)}"], [])
    if mismatch:
        return UNRESOLVED, set(), None, [f"{item.id} not applicable: " + "; ".join(mismatch)], []
    return SUPPORTED, set(), [], [], []


def _match(conds, sit):
    """Conditions of a value or attribute against the situation: (missing names, mismatches)."""
    missing, mismatch = [], []
    for k, v in sorted(conds.items()):
        s = (sit.conditions or {}).get(k)
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
                     for k, v in sorted((sit.conditions or {}).items())) or "no stated conditions"


def _value_paths(kb, sit, entity, kind):
    paths = []
    for g in sit.givens:
        if g.bearer == entity and g.kind == kind:
            lo, hi = units.to_si(g.lo, g.hi, g.unit)
            o = Outcome(SUPPORTED, expr.Interval(lo, hi), {g.id})
            o.trace = {"via": "given", "item": g.id, "stated": [g.lo, g.hi, g.unit], "source": g.source,
                       "basis": g.basis, "status": SUPPORTED}
            paths.append(o)
    if paths:
        return paths  # data given for this situation override general knowledge
    by_depth = {}
    for anc, chains in _lineage(kb, entity):
        for v in kb.of(Value):
            if v.bearer == anc and v.kind == kind:
                chain, ok, barred = _route(kb, v.holds_of, chains)
                by_depth.setdefault(len(chain), []).append((anc, v, chain, ok, barred))
    for depth in sorted(by_depth):
        level = []
        for anc, v, chain, ok, barred in by_depth[depth]:
            tr = {"via": "value", "item": v.id, "bearer": anc, "links": list(chain), "stated": [v.lo, v.hi, v.unit],
                  "conditions": dict(v.conditions), "scope": v.scope, "holds_of": v.holds_of,
                  "source": v.source, "basis": v.basis, "barred_chains": barred}
            if not ok:
                o = Outcome(UNRESOLVED, needs=[f"{kind} of {entity}"],
                            reasons=[f"{v.id} of {anc} not inherited: " + "; ".join(barred)])
            elif v.holds_of == "population":
                o = Outcome(UNRESOLVED, needs=[f"{kind} of {entity} as a value of the bearer, not a population spread"],
                            reasons=[f"{v.id} is a spread over a population; it is not a bound on its value"])
            else:
                st, prem, needs, reasons, cav = _scope(v, sit)
                if needs is None:
                    needs = [f"{kind} of {anc} under {_fmt_conds(sit)}"]
                if st == SUPPORTED:
                    lo, hi = units.to_si(v.lo, v.hi, v.unit)
                    if chain:
                        cav.append(f"{kind} of {entity} inherited from {anc} via {', '.join(chain)} "
                                   f"({v.holds_of} property, defeasible)")
                    o = Outcome(SUPPORTED, expr.Interval(lo, hi), {v.id, *chain, *prem}, caveats=cav)
                else:
                    o = Outcome(st, needs=needs, reasons=reasons)
            o.trace = dict(tr, status=o.status, reasons=o.reasons)
            level.append(o)
        paths.extend(level)
        if any(p.status == SUPPORTED for p in level):
            break  # the most specific applicable level overrides inherited generic values
    return paths


def _attribute(kb, sit, entity, name):
    """Most specific applicable established attribute: (list of (attribute, premises), near misses)."""
    near = []
    by_depth = {}
    for anc, chains in _lineage(kb, entity):
        for a in kb.of(Attribute):
            if a.bearer != anc or a.name != name:
                continue
            chain, ok, barred = _route(kb, a.holds_of, chains)
            if not ok:
                near.append(f"{a.id} ({name}={a.value} of {anc}) not inherited: " + "; ".join(barred))
                continue
            st, prem, _, reasons, _ = _scope(a, sit)
            if st != SUPPORTED:
                near += [f"{a.id} ({name}={a.value} of {anc}): {r}" for r in reasons]
            else:
                by_depth.setdefault(len(chain), []).append((a, {a.id, *chain, *prem}))
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
                       grounds=set().union(*(p for _, p in found)), trace=dict(tr, status=UNRESOLVED))
    if found:
        a, g = found[0]
        chain = [x for x in g if x != a.id and x in kb.items]
        if assumed and assumed[0].value != a.value:
            return Outcome(UNRESOLVED, grounds=g, reasons=[f"situation assumes {req.name}={assumed[0].value} for "
                                                           f"{entity} but {a.id} establishes {a.value}"],
                           trace=dict(tr, status=UNRESOLVED))
        if a.value == req.value:
            cav = [f"{req.name} of {entity} inherited from {a.bearer} via {', '.join(sorted(chain))}"] if chain else []
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
            return Outcome(SUPPORTED, grounds={a.id},
                           caveats=[f"assumed in situation {sit.id}: {req.name} of {entity} = {a.value} "
                                    f"(idealisation, not established)"],
                           trace=dict(tr, status=SUPPORTED, by=f"assumption {a.id}"))
        status = REFUSED if single else UNRESOLVED
        return Outcome(status, grounds={a.id}, reasons=[f"situation assumes {req.name}={a.value}, model requires {req.value}"],
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
    """Status of a step from its parts: any skipped -> skipped; unresolved or conflict -> unresolved; refused."""
    st = {p.status for p in parts}
    if SKIPPED in st:
        return SKIPPED
    if UNRESOLVED in st or CONFLICT in st:
        return UNRESOLVED
    if REFUSED in st:
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
    paths = _value_paths(kb, sit, entity, kind)
    for m in kb.of(Model):
        for sym, (role, k) in sorted(m.variables.items()):
            if k == kind and sit.roles.get(role) == entity and sym in m.forms:
                paths.append(_apply(kb, sit, m, sym, stack))
    live = [p for p in paths if p.status != SKIPPED]
    sup = [p for p in live if p.status == SUPPORTED]
    o = Outcome(UNRESOLVED)
    if sup:
        disjoint = [(a, b) for i, a in enumerate(sup) for b in sup[i + 1:] if a.interval.intersect(b.interval) is None]
        for p in sup:
            o.grounds |= p.grounds
            o.caveats += p.caveats
        if disjoint:
            o.status = CONFLICT
            o.reasons.append(f"derivations of {goal} disagree: " + ", ".join(repr(p.interval) for p in sup))
            o.needs.append(f"resolution of the conflict on {goal} (which source or derivation applies)")
        else:
            o.status = SUPPORTED
            o.interval = expr.Interval(min(p.interval.lo for p in sup), max(p.interval.hi for p in sup))
            if len(sup) > 1:
                o.caveats.append(f"{len(sup)} derivations of {goal} combined by their hull (not intersected)")
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
    check_situation(kb, sit)
    entity = sit.roles.get(role)
    if entity is None:
        return Outcome(UNRESOLVED, needs=[f"fill role {role}"], reasons=[f"role {role} unfilled"],
                       trace={"goal": f"{kind} of role {role}", "status": UNRESOLVED})
    o = _derive(kb, sit, entity, kind, frozenset())
    if o.status == SKIPPED:
        o.status = UNRESOLVED
        o.needs = [f"{kind} of {entity}: an independent value or model"]
    o.standing = standing(kb, sit, o.grounds)
    o.trace = {"query": f"{kind} of {entity} in situation {sit.id}", "inference_type": "model-based (S0 5.7)",
               "standing": o.standing, **o.trace, "status": o.status}
    return o


def _basis(kb, sit, gid):
    if gid in kb.items:
        return getattr(kb.items[gid], "basis", "definition"), kb.items[gid]
    if gid.startswith("scope:"):
        return "assumption", None
    for it in tuple(sit.givens) + tuple(sit.assumptions):
        if it.id == gid:
            return it.basis, it
    raise KeyError(gid)


def _verifications(kb, sit, gid, item):
    """Recorded verifications that still match the premise's current content."""
    if item is None:
        return []
    fp = fingerprint(item)
    records = [v for v in kb.of(Verification) if v.target == gid] + [v for v in sit.verifications if v.target == gid]
    return sorted(v.id for v in records if v.fingerprint == fp)


def standing(kb, sit, grounds):
    """Epistemic standing of a conclusion from its premises (S0 5.9): never stronger than its weakest premise.

    A premise counts as verified only through a Verification record whose fingerprint matches its current content;
    such a record is an attested claim of its holder, so the label says 'attested'."""
    profile, unverified, used = {}, 0, []
    for g in grounds:
        b, item = _basis(kb, sit, g)
        profile[b] = profile.get(b, 0) + 1
        vs = _verifications(kb, sit, g, item)
        used += vs
        unverified += 0 if vs or b == "definition" else 1
    if "illustrative" in profile:
        label = "illustrative only: rests on illustrative premises"
    elif "hypothesis" in profile:
        label = "hypothetical: rests on hypotheses"
    elif "assumption" in profile:
        label = "conditional on assumptions"
    elif unverified:
        label = "derived from unverified premises"
    else:
        label = "derived from premises with attested verification records"
    return {"attitude": "proposed", "holder": "program", "label": label, "premises_by_basis": dict(sorted(profile.items())),
            "unverified_premises": unverified, "verifications": sorted(used)}


def ablate(kb, sit, role, kind):
    """Remove each ground of the answer in turn and report the new status."""
    import dataclasses
    base = infer(kb, sit, role, kind)
    out = []
    for g in sorted(base.grounds):
        if g in kb.items:
            o = infer(kb.without({g}), sit, role, kind)
        elif g.startswith("scope:"):
            sid = g[len("scope:"):].split("@")[0]
            o = infer(kb, dataclasses.replace(sit, scope_assumptions=tuple(x for x in sit.scope_assumptions if x != sid)),
                      role, kind)
        else:
            o = infer(kb, dataclasses.replace(sit, givens=tuple(x for x in sit.givens if x.id != g),
                                              assumptions=tuple(x for x in sit.assumptions if x.id != g)), role, kind)
        out.append((g, o.status))
    return out
