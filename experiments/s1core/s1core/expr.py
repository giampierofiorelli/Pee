"""A small arithmetic language for model forms and domain conditions, with two evaluations:

* dimensional evaluation, used to check acquired knowledge (S0 Op5, C2);
* interval evaluation, used to propagate uncertainty conservatively (S0 4.9, obligation 4). Interval bounds are
  guaranteed to contain the true result for the given input intervals; they may be wider than necessary when a
  variable occurs more than once (the dependency problem of interval arithmetic).

Grammar: numbers, identifiers, + - * / ^, unary minus, parentheses, functions exp ln sqrt, constant pi.
"""
import math
import re

from . import units

FUNCS = ("exp", "ln", "sqrt")
CONSTS = {"pi": math.pi}
_TOKEN = re.compile(r"\s*(?:(\d+(?:\.\d*)?(?:[eE][-+]?\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|(\S))")


class ExprError(ValueError):
    pass


class Interval:
    __slots__ = ("lo", "hi")

    def __init__(self, lo, hi):
        if not (lo <= hi):
            raise ExprError(f"empty interval [{lo}, {hi}]")
        self.lo, self.hi = float(lo), float(hi)

    def __repr__(self):
        return f"[{self.lo:.6g}, {self.hi:.6g}]"

    def __add__(self, o):
        return Interval(self.lo + o.lo, self.hi + o.hi)

    def __sub__(self, o):
        return Interval(self.lo - o.hi, self.hi - o.lo)

    def __neg__(self):
        return Interval(-self.hi, -self.lo)

    def __mul__(self, o):
        p = (self.lo * o.lo, self.lo * o.hi, self.hi * o.lo, self.hi * o.hi)
        return Interval(min(p), max(p))

    def __truediv__(self, o):
        if o.lo <= 0.0 <= o.hi:
            raise ExprError("division by an interval containing zero")
        return self * Interval(1.0 / o.hi, 1.0 / o.lo)

    def pow_num(self, p):
        if float(p).is_integer():
            p = int(p)
            if p == 0:
                return Interval(1, 1)
            if p < 0:
                return Interval(1, 1) / self.pow_num(-p)
            if p % 2 == 0 and self.lo < 0 < self.hi:
                return Interval(0.0, max(self.lo ** p, self.hi ** p))
            vals = (self.lo ** p, self.hi ** p)
            return Interval(min(vals), max(vals))
        if self.lo < 0:
            raise ExprError("fractional power of an interval with negative values")
        return Interval(self.lo ** p, self.hi ** p) if p > 0 else Interval(self.hi ** p, self.lo ** p)

    def exp(self):
        return Interval(math.exp(self.lo), math.exp(self.hi))

    def ln(self):
        if self.lo <= 0:
            raise ExprError("logarithm of a non-positive interval")
        return Interval(math.log(self.lo), math.log(self.hi))

    def sqrt(self):
        if self.lo < 0:
            raise ExprError("square root of a negative interval")
        return Interval(math.sqrt(self.lo), math.sqrt(self.hi))

    def intersect(self, o):
        lo, hi = max(self.lo, o.lo), min(self.hi, o.hi)
        return Interval(lo, hi) if lo <= hi else None


def parse(text):
    toks = []
    for num, name, op in _TOKEN.findall(text):
        toks.append(("num", float(num)) if num else ("name", name) if name else ("op", op))
    pos = 0

    def peek():
        return toks[pos] if pos < len(toks) else ("end", None)

    def take(kind=None, val=None):
        nonlocal pos
        t = peek()
        if (kind and t[0] != kind) or (val and t[1] != val):
            raise ExprError(f"unexpected {t[1]!r} in {text!r}")
        pos += 1
        return t

    def expr():
        node = term()
        while peek() in (("op", "+"), ("op", "-")):
            op = take()[1]
            node = ("bin", op, node, term())
        return node

    def term():
        node = unary()
        while peek() in (("op", "*"), ("op", "/")):
            op = take()[1]
            node = ("bin", op, node, unary())
        return node

    def unary():
        if peek() == ("op", "-"):
            take()
            return ("neg", unary())
        return power()

    def power():
        base = atom()
        if peek() == ("op", "^"):
            take()
            return ("bin", "^", base, unary())
        return base

    def atom():
        t = peek()
        if t[0] == "num":
            take()
            return ("num", t[1])
        if t[0] == "name":
            take()
            if t[1] in FUNCS:
                take("op", "(")
                a = expr()
                take("op", ")")
                return ("call", t[1], a)
            if t[1] in CONSTS:
                return ("num", CONSTS[t[1]])
            return ("var", t[1])
        if t == ("op", "("):
            take()
            a = expr()
            take("op", ")")
            return a
        raise ExprError(f"unexpected {t[1]!r} in {text!r}")

    node = expr()
    if pos != len(toks):
        raise ExprError(f"trailing input in {text!r}")
    return node


def variables(node):
    k = node[0]
    if k == "var":
        return {node[1]}
    if k == "num":
        return set()
    if k == "neg":
        return variables(node[1])
    if k == "call":
        return variables(node[2])
    return variables(node[2]) | variables(node[3])


def _const(node):
    """Numeric value of a constant sub-expression, or None."""
    if node[0] == "num":
        return node[1]
    if node[0] == "neg":
        c = _const(node[1])
        return None if c is None else -c
    return None


def dims(node, env):
    k = node[0]
    if k == "num":
        return units.NONE
    if k == "var":
        return env[node[1]]
    if k == "neg":
        return dims(node[1], env)
    if k == "call":
        if not units.same_dims(dims(node[2], env), units.NONE) and node[1] != "sqrt":
            raise ExprError(f"{node[1]} of a dimensional quantity")
        if node[1] == "sqrt":
            return tuple(x / 2 for x in dims(node[2], env))
        return units.NONE
    op, a, b = node[1], dims(node[2], env), node[3]
    if op == "^":
        c = _const(b)
        if c is None:
            if not (units.same_dims(a, units.NONE) and units.same_dims(dims(b, env), units.NONE)):
                raise ExprError("non-constant exponent on a dimensional quantity")
            return units.NONE
        return tuple(x * c for x in a)
    bd = dims(b, env)
    if op in "+-":
        if not units.same_dims(a, bd):
            raise ExprError("adding or subtracting quantities of different dimensions")
        return a
    return tuple(x + y for x, y in zip(a, bd)) if op == "*" else tuple(x - y for x, y in zip(a, bd))


def evaluate(node, env):
    k = node[0]
    if k == "num":
        return Interval(node[1], node[1])
    if k == "var":
        return env[node[1]]
    if k == "neg":
        return -evaluate(node[1], env)
    if k == "call":
        return getattr(evaluate(node[2], env), node[1])()
    op = node[1]
    if op == "^":
        c = _const(node[3])
        base = evaluate(node[2], env)
        if c is not None:
            return base.pow_num(c)
        return (evaluate(node[3], env) * base.ln()).exp()
    a, b = evaluate(node[2], env), evaluate(node[3], env)
    return {"+": a.__add__, "-": a.__sub__, "*": a.__mul__, "/": a.__truediv__}[op](b)
