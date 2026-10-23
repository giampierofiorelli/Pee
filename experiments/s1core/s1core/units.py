"""Units and dimensions (S0 4.7, Op5, C2).

The metrology is knowledge, not code: every unit is read from ``metrology.json`` (the universe's single metrology,
I-1). A unit is a factor and an offset to the coherent SI unit, a dimension vector over the base dimensions, a scale
type and, for level scales, a reference. The offset is used only to convert absolute values (degrees Celsius).
Unknown units have no dimension and are refused at acquisition.

Dimension vectors written before I-1 have five entries (length, mass, time, temperature, amount of substance); they
are read with zeros for the dimensions added later.
"""
import json
import pathlib

_DOC = json.loads((pathlib.Path(__file__).resolve().parent / "metrology.json").read_text())
BASE = tuple(_DOC["base"])
_SYMBOLS = ("L", "M", "T", "K", "N", "I", "B", "J")[:len(BASE)]


def dim(L=0, M=0, T=0, K=0, N=0, I=0, B=0, J=0):  # noqa: E741 (I is the conventional symbol of electric current)
    vals = dict(L=L, M=M, T=T, K=K, N=N, I=I, B=B, J=J)
    return tuple(float(vals[s]) for s in _SYMBOLS)


def pad(d):
    """A dimension vector of any earlier length, completed with zeros."""
    d = tuple(float(x) for x in d)
    return d + (0.0,) * (len(BASE) - len(d))


NONE = dim()

UNITS = {u: (float(v["factor"]), float(v["offset"]), dim(**v["dims"])) for u, v in _DOC["units"].items()}
SCALE = {u: v.get("scale", "ratio") for u, v in _DOC["units"].items()}
REFERENCE = {u: v.get("reference") for u, v in _DOC["units"].items()}
SURFACES = {u: tuple(v.get("surfaces", ())) for u, v in _DOC["units"].items()}


def known(unit):
    return unit in UNITS


def dims_of(unit):
    return UNITS[unit][2]


def to_si(lo, hi, unit):
    f, off, _ = UNITS[unit]
    return lo * f + off, hi * f + off


def from_si(lo, hi, unit):
    f, off, _ = UNITS[unit]
    return (lo - off) / f, (hi - off) / f


def same_dims(a, b, tol=1e-9):
    a, b = pad(a), pad(b)
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def si_label(d):
    parts = [f"{b}^{e:g}" if e != 1 else b for b, e in zip(BASE, pad(d)) if e]
    return " ".join(parts) or "1"
